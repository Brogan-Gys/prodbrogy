import { categories } from "@/lib/sounds";

export type UploadState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

export type PasswordStatus = "unknown" | "valid" | "invalid";

export type AdminSound = {
  id: string;
  title: string;
  category: string;
  producerName: string;
  bpm: number | null;
  mood: string;
  credits: number;
  duration: string;
  tags: string[];
  accent: "volt" | "coral" | "cyan" | "plum";
  previewUrl?: string;
  downloadUrl?: string;
};

export const accents = ["volt", "coral", "cyan", "plum"] as const;
export type Accent = (typeof accents)[number];

export const uploadCategories = categories.filter((category) => category.id !== "all");
export const defaultUploadCategory = uploadCategories[0]?.id ?? "";

// Audio doubles as its own preview; MIDI has no preview file at all and is
// auditioned through /api/midi-preview, so both work in a batch.
export const batchCategories = uploadCategories;
export const defaultBatchCategory =
  batchCategories.find((category) => category.id === "loops")?.id ?? batchCategories[0]?.id ?? "";

export type SoundMeta = {
  title: string;
  category: string;
  producerName: string;
  bpm: number | null;
  duration: string;
  accent: Accent;
};

export type BatchRow = {
  rowId: string;
  file: File;
  title: string;
  category: string;
  producerName: string;
  bpm: number | null;
  duration: string;
  accent: Accent;
  status: "pending" | "uploading" | "done" | "error";
  message: string;
};

const ADMIN_PASSWORD_STORAGE_KEY = "prodbrogy-admin-password";
const ADMIN_PASSWORD_TTL_MS = 12 * 60 * 60 * 1000;

type StoredAdminPassword = {
  value: string;
  expiresAt: number;
};

export function readStoredAdminPassword() {
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY) || "null"
    ) as StoredAdminPassword | null;

    if (!stored?.value || !stored.expiresAt || Date.now() > stored.expiresAt) {
      window.localStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
      return "";
    }

    return stored.value;
  } catch {
    return "";
  }
}

export function rememberAdminPassword(value: string) {
  if (!value) {
    return;
  }

  window.localStorage.setItem(
    ADMIN_PASSWORD_STORAGE_KEY,
    JSON.stringify({
      value,
      expiresAt: Date.now() + ADMIN_PASSWORD_TTL_MS
    })
  );
}

export async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: text.slice(0, 180) || "The server returned an unreadable response." } as T;
  }
}

async function uploadFileDirectly(file: File, url: string, contentType: string) {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed for ${file.name}.`);
  }
}

export async function getFileHash(file: File) {
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export function readAudioDuration(file: File) {
  return new Promise<string>((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";

    const cleanup = () => URL.revokeObjectURL(url);

    audio.onloadedmetadata = () => {
      cleanup();
      resolve(formatDuration(audio.duration));
    };
    audio.onerror = () => {
      cleanup();
      resolve("0:00");
    };

    audio.src = url;
  });
}

export function isMidiFile(file: File) {
  return /[.]midi?$/i.test(file.name);
}

/** Reads length and tempo out of the .mid itself, since an <audio> element
 *  cannot decode one and would report 0:00 for every row. */
export async function readMidiMeta(file: File): Promise<{ duration: string; bpm: number | null }> {
  try {
    const { Midi } = await import("@tonejs/midi");
    const midi = new Midi(await file.arrayBuffer());
    const tempo = midi.header.tempos[0]?.bpm;

    return {
      duration: formatDuration(midi.duration),
      bpm: tempo ? Math.round(tempo) : null
    };
  } catch {
    return { duration: "0:00", bpm: null };
  }
}

// Parses "@prodbrogy - Polygraph 151 Bpm.mp3" into producer/title/bpm parts.
export function parseFileName(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, "");
  let working = base;
  let bpm: number | null = null;

  const bpmMatch = working.match(/(\d{2,3})\s*bpm/i);
  if (bpmMatch) {
    bpm = Number(bpmMatch[1]);
    working = working.replace(bpmMatch[0], " ");
  }

  let producerName = "";
  const separatorIndex = working.indexOf(" - ");
  if (separatorIndex !== -1) {
    producerName = working.slice(0, separatorIndex).trim();
    working = working.slice(separatorIndex + 3);
  }

  const title = working.replace(/\s+/g, " ").replace(/^[-\s]+|[-\s]+$/g, "").trim();

  return { title: title || base, producerName, bpm };
}

// Runs the full direct-to-R2 upload + Sanity finalize for one sound.
export async function uploadSoundFile(options: {
  file: File;
  previewFile?: File | null;
  meta: SoundMeta;
  password: string;
}): Promise<{ id?: string; warning?: string }> {
  const { file, previewFile, meta, password } = options;
  const downloadFileHash = await getFileHash(file);

  const uploadUrlResponse = await fetch("/api/admin/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      password,
      title: meta.title,
      previewFileName: previewFile?.name,
      previewContentType: previewFile?.type,
      downloadFileName: file.name,
      downloadContentType: file.type,
      downloadFileSize: file.size,
      downloadFileHash
    })
  });
  const uploadTargets = await readApiJson<{
    error?: string;
    baseKey?: string;
    preview?: { key: string; url: string; contentType: string } | null;
    download?: { key: string; url: string; contentType: string } | null;
  }>(uploadUrlResponse);

  if (!uploadUrlResponse.ok) {
    throw new Error(uploadTargets.error || "Upload setup failed.");
  }

  if (previewFile && uploadTargets.preview) {
    await uploadFileDirectly(previewFile, uploadTargets.preview.url, uploadTargets.preview.contentType);
  }

  if (uploadTargets.download) {
    await uploadFileDirectly(file, uploadTargets.download.url, uploadTargets.download.contentType);
  }

  const finalizeResponse = await fetch("/api/admin/upload-sound", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      password,
      baseKey: uploadTargets.baseKey,
      previewTempKey: uploadTargets.preview?.key,
      downloadKey: uploadTargets.download?.key,
      originalFileName: file.name,
      fileSize: file.size,
      fileHash: downloadFileHash,
      title: meta.title,
      category: meta.category,
      producerName: meta.producerName,
      bpm: meta.bpm,
      mood: "",
      duration: meta.duration,
      tags: [],
      accent: meta.accent
    })
  });
  const result = await readApiJson<{ error?: string; id?: string; warning?: string }>(finalizeResponse);

  if (!finalizeResponse.ok) {
    throw new Error(result.error || "Upload failed.");
  }

  return result;
}
