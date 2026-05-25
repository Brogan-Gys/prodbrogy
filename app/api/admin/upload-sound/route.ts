import { NextResponse } from "next/server";
import {
  getFileExtension,
  getMissingUploadEnv,
  getSanityWriteClient,
  isAdminPasswordValid,
  deleteFileFromR2,
  slugifyFileName,
  trimR2PreviewToR2,
  uploadFileToR2,
  uploadTrimmedPreviewToR2
} from "@/lib/server/adminUpload";

export const runtime = "nodejs";
export const maxDuration = 60;

const accents = ["volt", "coral", "cyan", "plum"] as const;
const audioPathPattern = /\.(mp3|wav|m4a|ogg|flac|webm)(\?|#|$)?/i;

type FinalizeUploadRequest = {
  password?: string;
  baseKey?: string;
  previewTempKey?: string;
  downloadKey?: string;
  title?: string;
  category?: string;
  producerName?: string;
  bpm?: number | null;
  key?: string;
  mood?: string;
  credits?: number | null;
  duration?: string;
  tags?: string[];
  accent?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, key: string, fallback: number | null) {
  const value = getString(formData, key);
  if (!value) {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanTags(value: unknown) {
  return Array.isArray(value) ? value.map(cleanString).filter(Boolean) : [];
}

function cleanNumber(value: unknown, fallback: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return value;
}

function isAudioPath(value?: string | null) {
  return Boolean(value && audioPathPattern.test(value));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown upload error.";
}

async function finalizeDirectUpload(request: Request) {
  const body = (await request.json()) as FinalizeUploadRequest;

  if (!isAdminPasswordValid(body.password ?? null)) {
    return NextResponse.json({ error: "Invalid admin password." }, { status: 401 });
  }

  const title = cleanString(body.title);
  const category = cleanString(body.category);

  if (!title || !category || !body.baseKey) {
    return NextResponse.json({ error: "Title, category, and upload key are required." }, { status: 400 });
  }

  if (!body.previewTempKey && !body.downloadKey) {
    return NextResponse.json({ error: "Add at least one preview or download file." }, { status: 400 });
  }

  let previewUrl: string | undefined;
  let previewWarning: string | undefined;

  if (body.previewTempKey) {
    try {
      previewUrl = await trimR2PreviewToR2(body.previewTempKey, `previews/${body.baseKey}.mp3`);
      await deleteFileFromR2(body.previewTempKey);
    } catch (error) {
      previewUrl = body.previewTempKey;
      previewWarning = `Preview trimming failed, so the original preview file was used: ${getErrorMessage(error)}`;
    }
  } else if (isAudioPath(body.downloadKey)) {
    previewUrl = body.downloadKey;
  }

  const accent = cleanString(body.accent);
  const document = await getSanityWriteClient().create({
    _type: "soundAsset",
    title,
    category,
    producerName: cleanString(body.producerName),
    previewUrl,
    downloadUrl: cleanString(body.downloadKey),
    bpm: cleanNumber(body.bpm, null),
    key: cleanString(body.key),
    mood: cleanString(body.mood),
    credits: cleanNumber(body.credits, 1) ?? 1,
    duration: cleanString(body.duration) || "0:00",
    tags: cleanTags(body.tags),
    accent: accents.includes(accent as (typeof accents)[number]) ? accent : "volt"
  });

  return NextResponse.json({
    id: document._id,
    previewUrl,
    downloadUrl: body.downloadKey,
    warning: previewWarning
  });
}

export async function POST(request: Request) {
  try {
    const missingEnv = getMissingUploadEnv();

    if (missingEnv.length > 0) {
      return NextResponse.json({ error: `Upload is not configured: ${missingEnv.join(", ")}` }, { status: 500 });
    }

    if (request.headers.get("content-type")?.includes("application/json")) {
      return finalizeDirectUpload(request);
    }

    const formData = await request.formData();

    if (!isAdminPasswordValid(formData.get("password"))) {
      return NextResponse.json({ error: "Invalid admin password." }, { status: 401 });
    }

    const title = getString(formData, "title");
    const category = getString(formData, "category");
    const previewFile = getFile(formData, "previewFile");
    const downloadFile = getFile(formData, "downloadFile");

    if (!title || !category) {
      return NextResponse.json({ error: "Title and category are required." }, { status: 400 });
    }

    if (!previewFile && !downloadFile) {
      return NextResponse.json({ error: "Add at least one preview or download file." }, { status: 400 });
    }

    const baseSlug = slugifyFileName(title);
    const uniqueId = Date.now().toString(36);
    const baseKey = `${baseSlug}-${uniqueId}`;

    const downloadUrl = downloadFile
      ? await uploadFileToR2(downloadFile, `downloads/${baseKey}${getFileExtension(downloadFile.name)}`)
      : undefined;
    const previewUrl = previewFile
      ? await uploadTrimmedPreviewToR2(previewFile, `previews/${baseKey}.mp3`)
      : isAudioPath(downloadUrl)
        ? downloadUrl
        : undefined;

    const accent = getString(formData, "accent");

    const document = await getSanityWriteClient().create({
      _type: "soundAsset",
      title,
      category,
      producerName: getString(formData, "producerName"),
      previewUrl,
      downloadUrl,
      bpm: getNumber(formData, "bpm", null),
      key: getString(formData, "key"),
      mood: getString(formData, "mood"),
      credits: getNumber(formData, "credits", 1) ?? 1,
      duration: getString(formData, "duration") || "0:00",
      tags: getTags(getString(formData, "tags")),
      accent: accents.includes(accent as (typeof accents)[number]) ? accent : "volt"
    });

    return NextResponse.json({
      id: document._id,
      previewUrl,
      downloadUrl
    });
  } catch (error) {
    return NextResponse.json({ error: `Upload failed: ${getErrorMessage(error)}` }, { status: 500 });
  }
}
