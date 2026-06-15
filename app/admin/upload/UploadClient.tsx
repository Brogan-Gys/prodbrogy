"use client";

import { FormEvent, type ReactNode, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, Save, Trash2, UploadCloud, XCircle } from "lucide-react";
import Link from "next/link";
import { categories } from "@/lib/sounds";

type UploadState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

type AdminSound = {
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

const uploadCategories = categories.filter((category) => category.id !== "all");
const defaultUploadCategory = uploadCategories[0]?.id ?? "";
// Batch upload is audio-only (the audio doubles as its own preview); MIDI needs a
// hand-made preview, so it stays on the single form below.
const batchCategories = uploadCategories.filter((category) => category.id !== "midi");
const defaultBatchCategory = batchCategories.find((category) => category.id === "loops")?.id ?? batchCategories[0]?.id ?? "";
const accents = ["volt", "coral", "cyan", "plum"] as const;

type BatchRow = {
  rowId: string;
  file: File;
  title: string;
  category: string;
  producerName: string;
  bpm: number | null;
  duration: string;
  accent: (typeof accents)[number];
  status: "pending" | "uploading" | "done" | "error";
  message: string;
};
const ADMIN_PASSWORD_STORAGE_KEY = "prodbrogy-admin-password";
const ADMIN_PASSWORD_TTL_MS = 12 * 60 * 60 * 1000;

type StoredAdminPassword = {
  value: string;
  expiresAt: number;
};

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getFormNumber(formData: FormData, key: string) {
  const value = getFormString(formData, key);
  if (!value) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function readStoredAdminPassword() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY) || "null") as StoredAdminPassword | null;

    if (!stored?.value || !stored.expiresAt || Date.now() > stored.expiresAt) {
      window.localStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
      return "";
    }

    return stored.value;
  } catch {
    return "";
  }
}

function rememberAdminPassword(value: string) {
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

async function readApiJson<T>(response: Response): Promise<T> {
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

async function getFileHash(file: File) {
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getUploadFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function getNumberValue(formData: FormData, key: string) {
  const value = getFormNumber(formData, key);
  return value === null ? undefined : value;
}

type SoundMeta = {
  title: string;
  category: string;
  producerName: string;
  bpm: number | null;
  duration: string;
  accent: (typeof accents)[number];
};

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function readAudioDuration(file: File) {
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

// Parses "@prodbrogy - Polygraph 151 Bpm.mp3" into producer/title/bpm parts.
function parseFileName(fileName: string) {
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
async function uploadSoundFile(options: {
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

export function UploadClient() {
  const [password, setPassword] = useState("");
  const [state, setState] = useState<UploadState>({ status: "idle", message: "" });
  const [sounds, setSounds] = useState<AdminSound[]>([]);
  const [loadingSounds, setLoadingSounds] = useState(false);
  const [uploadCategory, setUploadCategory] = useState(defaultUploadCategory);
  const [batchCategory, setBatchCategory] = useState(defaultBatchCategory);
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [batchSaving, setBatchSaving] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<"unknown" | "valid" | "invalid">("unknown");

  useEffect(() => {
    setPassword(readStoredAdminPassword());
  }, []);

  const addBatchFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) {
      return;
    }

    const rows = await Promise.all(
      files.map(async (file, index) => {
        const parsed = parseFileName(file.name);
        const duration = await readAudioDuration(file);

        return {
          rowId: `${Date.now().toString(36)}-${index}-${file.name}`,
          file,
          title: parsed.title,
          category: batchCategory,
          producerName: parsed.producerName,
          bpm: parsed.bpm,
          duration,
          accent: accents[index % accents.length],
          status: "pending" as const,
          message: ""
        };
      })
    );

    setBatchRows((current) => [...current, ...rows]);
    setState({ status: "idle", message: `Parsed ${rows.length} file${rows.length === 1 ? "" : "s"}. Review and save.` });
  };

  const updateBatchRow = (rowId: string, changes: Partial<BatchRow>) => {
    setBatchRows((current) => current.map((row) => (row.rowId === rowId ? { ...row, ...changes } : row)));
  };

  const removeBatchRow = (rowId: string) => {
    setBatchRows((current) => current.filter((row) => row.rowId !== rowId));
  };

  const handleBatchSave = async () => {
    if (!password) {
      setState({ status: "error", message: "Enter the admin password at the top, then Save All." });
      return;
    }

    const pendingRows = batchRows.filter((row) => row.status !== "done");
    if (pendingRows.length === 0) {
      return;
    }

    setBatchSaving(true);
    setState({ status: "submitting", message: `Uploading ${pendingRows.length} sound${pendingRows.length === 1 ? "" : "s"}...` });

    let saved = 0;
    let failed = 0;

    for (const row of pendingRows) {
      updateBatchRow(row.rowId, { status: "uploading", message: "Uploading..." });

      try {
        if (!row.title) {
          throw new Error("Title is required.");
        }

        const result = await uploadSoundFile({
          file: row.file,
          password,
          meta: {
            title: row.title,
            category: row.category,
            producerName: row.producerName,
            bpm: row.bpm,
            duration: row.duration,
            accent: row.accent
          }
        });

        saved += 1;
        updateBatchRow(row.rowId, { status: "done", message: result.warning || "Added." });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed.";
        failed += 1;
        updateBatchRow(row.rowId, { status: "error", message });

        // Wrong password fails every row — stop early and flag it instead of hammering.
        if (message.toLowerCase().includes("password")) {
          setPasswordStatus("invalid");
          setBatchSaving(false);
          setState({ status: "error", message: "Wrong password. Fix it above, then Save All again." });
          return;
        }
      }
    }

    setBatchSaving(false);
    rememberAdminPassword(password);
    if (saved > 0) {
      setPasswordStatus("valid");
    }
    setState({
      status: failed > 0 ? "error" : "success",
      message: `Saved ${saved} sound${saved === 1 ? "" : "s"}${failed > 0 ? `, ${failed} failed.` : "."}`
    });
    await loadSounds();
  };

  const loadSounds = async () => {
    setLoadingSounds(true);
    setState({ status: "idle", message: "Loading admin library..." });

    try {
      const response = await fetch("/api/admin/sounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const result = await readApiJson<{ error?: string; sounds?: AdminSound[] }>(response);

      if (response.status === 401) {
        setPasswordStatus("invalid");
        throw new Error("Wrong password.");
      }

      if (!response.ok) {
        throw new Error(result.error || "Could not load sounds.");
      }

      rememberAdminPassword(password);
      setPasswordStatus("valid");
      setSounds(result.sounds ?? []);
      setState({ status: "success", message: `Password correct. Loaded ${result.sounds?.length ?? 0} sound${result.sounds?.length === 1 ? "" : "s"}.` });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Could not load sounds." });
    } finally {
      setLoadingSounds(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState({ status: "submitting", message: "Uploading files and creating the catalog entry..." });

    const form = event.currentTarget;
    const formData = new FormData(form);
    const previewFile = uploadCategory === "midi" ? getUploadFile(formData, "previewFile") : null;
    const downloadFile = getUploadFile(formData, "downloadFile");

    try {
      if (!downloadFile) {
        throw new Error("Choose a download file.");
      }

      setState({ status: "submitting", message: "Uploading and creating catalog entry..." });
      const accentValue = getFormString(formData, "accent");
      const result = await uploadSoundFile({
        file: downloadFile,
        previewFile,
        password,
        meta: {
          title: getFormString(formData, "title"),
          category: getFormString(formData, "category"),
          producerName: getFormString(formData, "producerName"),
          bpm: getNumberValue(formData, "bpm") ?? null,
          duration: getFormString(formData, "duration"),
          accent: accents.includes(accentValue as (typeof accents)[number])
            ? (accentValue as (typeof accents)[number])
            : "volt"
        }
      });

      rememberAdminPassword(password);
      setPasswordStatus("valid");
      form.reset();
      setUploadCategory(defaultUploadCategory);
      setState({
        status: "success",
        message: result.warning ? `Sound added, but ${result.warning}` : `Sound added to the site. Sanity ID: ${result.id}`
      });
      await loadSounds();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      if (message.toLowerCase().includes("password")) {
        setPasswordStatus("invalid");
      }
      setState({
        status: "error",
        message
      });
    }
  };

  const handleEdit = async (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    setState({ status: "submitting", message: "Saving sound..." });

    const formData = new FormData(event.currentTarget);
    const payload = {
      password,
      id,
      title: getFormString(formData, "title"),
      category: getFormString(formData, "category"),
      producerName: getFormString(formData, "producerName"),
      bpm: getFormNumber(formData, "bpm"),
      mood: "",
      duration: getFormString(formData, "duration"),
      tags: [],
      accent: getFormString(formData, "accent"),
      previewUrl: getFormString(formData, "previewUrl"),
      downloadUrl: getFormString(formData, "downloadUrl")
    };

    try {
      const response = await fetch("/api/admin/sounds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await readApiJson<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(result.error || "Save failed.");
      }

      rememberAdminPassword(password);
      setState({ status: "success", message: "Sound saved." });
      await loadSounds();
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Save failed." });
    }
  };

  const handleDelete = async (sound: AdminSound) => {
    const confirmed = window.confirm(`Delete "${sound.title}" from Sanity and remove its R2 files?`);

    if (!confirmed) {
      return;
    }

    setState({ status: "submitting", message: "Deleting sound and linked R2 files..." });

    try {
      const response = await fetch("/api/admin/sounds", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, id: sound.id })
      });
      const result = await readApiJson<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(result.error || "Delete failed.");
      }

      setSounds((current) => current.filter((item) => item.id !== sound.id));
      setState({ status: "success", message: "Sound deleted." });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Delete failed." });
    }
  };

  return (
    <main className="grain min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-sm font-black uppercase text-ink/55">Private admin</p>
            <h1 className="font-display text-4xl font-black uppercase leading-none sm:text-5xl">Sound Admin</h1>
          </div>
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 border-2 border-ink bg-white px-3 font-display text-xs font-black uppercase shadow-hard transition hover:-translate-y-0.5"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Vault
          </Link>
        </div>

        <section className="grid gap-3 border-2 border-ink bg-white p-4 shadow-hard md:grid-cols-[1fr_auto] md:items-end">
          <Field label="Admin password">
            <input
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordStatus("unknown");
              }}
              type="password"
              required
              className="input"
              autoComplete="current-password"
            />
            {passwordStatus === "valid" ? (
              <span className="flex items-center gap-1 text-xs font-black uppercase text-emerald-600">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Password correct
              </span>
            ) : passwordStatus === "invalid" ? (
              <span className="flex items-center gap-1 text-xs font-black uppercase text-coral">
                <XCircle className="h-4 w-4" aria-hidden />
                Wrong password
              </span>
            ) : null}
          </Field>
          <button
            type="button"
            onClick={loadSounds}
            disabled={loadingSounds || !password}
            className="inline-flex h-12 items-center justify-center gap-2 border-2 border-ink bg-cyan px-4 font-display text-sm font-black uppercase shadow-hard transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={loadingSounds ? "h-5 w-5 animate-spin" : "h-5 w-5"} aria-hidden />
            Load Library
          </button>
        </section>

        <section className="grid gap-4 border-2 border-ink bg-white p-4 shadow-hard">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-black uppercase leading-none">Batch Upload</h2>
              <p className="mt-1 text-sm font-bold uppercase text-ink/55">
                Drop audio files — title, BPM, and duration are read from the name. Review, then save all.
              </p>
            </div>
            {batchRows.length > 0 ? (
              <p className="font-display text-sm font-black uppercase text-ink/55">{batchRows.length} queued</p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Category for batch">
              <select
                className="input"
                value={batchCategory}
                onChange={(event) => {
                  const value = event.target.value;
                  setBatchCategory(value);
                  setBatchRows((current) =>
                    current.map((row) => (row.status === "pending" ? { ...row, category: value } : row))
                  );
                }}
              >
                {batchCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Add audio files">
              <input
                type="file"
                multiple
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm"
                className="file-input"
                onChange={(event) => {
                  void addBatchFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </Field>
          </div>

          {batchRows.length > 0 ? (
            <div className="grid gap-3">
              {batchRows.map((row) => (
                <div
                  key={row.rowId}
                  className="grid gap-3 border-2 border-ink bg-bone/40 p-3 shadow-hard lg:grid-cols-6"
                >
                  <div className="lg:col-span-2">
                    <Field label="Title">
                      <input
                        className="input"
                        value={row.title}
                        onChange={(event) => updateBatchRow(row.rowId, { title: event.target.value })}
                      />
                    </Field>
                  </div>
                  <Field label="Category">
                    <select
                      className="input"
                      value={row.category}
                      onChange={(event) => updateBatchRow(row.rowId, { category: event.target.value })}
                    >
                      {batchCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Producer">
                    <input
                      className="input"
                      value={row.producerName}
                      onChange={(event) => updateBatchRow(row.rowId, { producerName: event.target.value })}
                    />
                  </Field>
                  <Field label="BPM">
                    <input
                      type="number"
                      min="0"
                      className="input"
                      value={row.bpm ?? ""}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        updateBatchRow(row.rowId, { bpm: event.target.value && Number.isFinite(next) ? next : null });
                      }}
                    />
                  </Field>
                  <Field label="Duration">
                    <input
                      className="input"
                      value={row.duration}
                      onChange={(event) => updateBatchRow(row.rowId, { duration: event.target.value })}
                    />
                  </Field>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink pt-2 lg:col-span-6">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold uppercase text-ink/50">{row.file.name}</p>
                      {row.message ? (
                        <p
                          className={`text-xs font-bold uppercase ${
                            row.status === "error" ? "text-coral" : "text-ink/50"
                          }`}
                        >
                          {row.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <BatchStatusBadge status={row.status} />
                      <button
                        type="button"
                        onClick={() => removeBatchRow(row.rowId)}
                        disabled={batchSaving}
                        className="inline-flex h-9 items-center gap-1 border-2 border-ink bg-coral px-2 font-display text-xs font-black uppercase shadow-hard transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-3">
                <StatusText state={state} />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchRows([])}
                    disabled={batchSaving}
                    className="inline-flex h-12 items-center gap-2 border-2 border-ink bg-white px-4 font-display text-sm font-black uppercase shadow-hard transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchSave}
                    disabled={batchSaving || batchRows.every((row) => row.status === "done")}
                    className="inline-flex h-12 items-center gap-2 border-2 border-ink bg-volt px-4 font-display text-sm font-black uppercase shadow-hard transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {batchSaving ? (
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                    ) : (
                      <UploadCloud className="h-5 w-5" aria-hidden />
                    )}
                    Save All
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <form onSubmit={handleSubmit} className="grid gap-4 border-2 border-ink bg-white p-4 shadow-hard lg:grid-cols-2">
          <div className="lg:col-span-2">
            <h2 className="font-display text-2xl font-black uppercase leading-none">Upload Single Sound / MIDI</h2>
          </div>

          <Field label="Title">
            <input name="title" required className="input" placeholder="Night drive loop" />
          </Field>

          <Field label="Category">
            <select
              name="category"
              required
              className="input"
              value={uploadCategory}
              onChange={(event) => setUploadCategory(event.target.value)}
            >
              {uploadCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Producer name">
            <input name="producerName" className="input" placeholder="Collaborator or producer credit" />
          </Field>

          <Field label="Accent">
            <select name="accent" className="input" defaultValue="volt">
              {accents.map((accent) => (
                <option key={accent} value={accent}>
                  {accent}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Download file">
            <input name="downloadFile" type="file" accept=".zip,.rar,.7z,.mid,.midi,audio/*" required className="file-input" />
          </Field>

          {uploadCategory === "midi" ? (
            <Field label="Preview audio">
              <input name="previewFile" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm" required className="file-input" />
            </Field>
          ) : null}

          <Field label="BPM">
            <input name="bpm" type="number" min="0" className="input" placeholder="140" />
          </Field>

          <Field label="Duration">
            <input name="duration" className="input" placeholder="0:18" defaultValue="0:00" />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-4 lg:col-span-2">
            <StatusText state={state} />
            <button
              type="submit"
              disabled={state.status === "submitting" || !password}
              className="inline-flex h-12 items-center gap-2 border-2 border-ink bg-volt px-4 font-display text-sm font-black uppercase shadow-hard transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state.status === "submitting" ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : state.status === "success" ? (
                <CheckCircle2 className="h-5 w-5" aria-hidden />
              ) : (
                <UploadCloud className="h-5 w-5" aria-hidden />
              )}
              Upload
            </button>
          </div>
        </form>

        <section className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-3xl font-black uppercase leading-none">Manage Sounds</h2>
            <p className="font-display text-sm font-black uppercase text-ink/55">{sounds.length} loaded</p>
          </div>

          {sounds.length === 0 ? (
            <div className="border-2 border-ink bg-white p-6 text-center shadow-hard">
              <p className="font-display text-xl font-black uppercase">No admin sounds loaded</p>
            </div>
          ) : (
            sounds.map((sound) => (
              <form
                key={sound.id}
                onSubmit={(event) => handleEdit(event, sound.id)}
                className="grid gap-3 border-2 border-ink bg-white p-4 shadow-hard lg:grid-cols-4"
              >
                <Field label="Title">
                  <input name="title" className="input" defaultValue={sound.title} required />
                </Field>
                <Field label="Category">
                  <select name="category" className="input" defaultValue={sound.category} required>
                    {uploadCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Producer name">
                  <input name="producerName" className="input" defaultValue={sound.producerName} />
                </Field>
                <Field label="BPM">
                  <input name="bpm" type="number" min="0" className="input" defaultValue={sound.bpm ?? ""} />
                </Field>
                <Field label="Duration">
                  <input name="duration" className="input" defaultValue={sound.duration} />
                </Field>
                <Field label="Accent">
                  <select name="accent" className="input" defaultValue={sound.accent}>
                    {accents.map((accent) => (
                      <option key={accent} value={accent}>
                        {accent}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="lg:col-span-2">
                  <Field label="Preview path">
                    <input name="previewUrl" className="input" defaultValue={sound.previewUrl ?? ""} />
                  </Field>
                </div>
                <div className="lg:col-span-2">
                  <Field label="Download path">
                    <input name="downloadUrl" className="input" defaultValue={sound.downloadUrl ?? ""} />
                  </Field>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-3 lg:col-span-4">
                  <p className="min-w-0 truncate text-xs font-bold uppercase text-ink/50">{sound.id}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(sound)}
                      disabled={state.status === "submitting" || !password}
                      className="inline-flex h-11 items-center gap-2 border-2 border-ink bg-coral px-3 font-display text-xs font-black uppercase shadow-hard transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Delete
                    </button>
                    <button
                      type="submit"
                      disabled={state.status === "submitting" || !password}
                      className="inline-flex h-11 items-center gap-2 border-2 border-ink bg-volt px-3 font-display text-xs font-black uppercase shadow-hard transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" aria-hidden />
                      Save
                    </button>
                  </div>
                </div>
              </form>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

function StatusText({ state }: { state: UploadState }) {
  return <p className="min-h-5 text-sm font-bold uppercase text-ink/60">{state.message}</p>;
}

function BatchStatusBadge({ status }: { status: BatchRow["status"] }) {
  if (status === "done") {
    return <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="Saved" />;
  }

  if (status === "uploading") {
    return <Loader2 className="h-5 w-5 animate-spin" aria-label="Uploading" />;
  }

  if (status === "error") {
    return <span className="font-display text-xs font-black uppercase text-coral">Error</span>;
  }

  return <span className="font-display text-xs font-black uppercase text-ink/45">Ready</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="font-display text-xs font-black uppercase text-ink/60">{label}</span>
      {children}
    </label>
  );
}
