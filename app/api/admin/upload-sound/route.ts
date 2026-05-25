import { NextResponse } from "next/server";
import { getFileExtension, getMissingUploadEnv, getSanityWriteClient, isAdminPasswordValid, slugifyFileName, uploadFileToR2 } from "@/lib/server/adminUpload";

export const runtime = "nodejs";

const accents = ["volt", "coral", "cyan", "plum"] as const;

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

function getWaveform(value: string) {
  const parsed = value
    .split(",")
    .map((height) => Number(height.trim()))
    .filter((height) => Number.isFinite(height))
    .slice(0, 32);

  return parsed.length > 0 ? parsed : undefined;
}

function getFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

export async function POST(request: Request) {
  const missingEnv = getMissingUploadEnv();

  if (missingEnv.length > 0) {
    return NextResponse.json({ error: `Upload is not configured: ${missingEnv.join(", ")}` }, { status: 500 });
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

  const previewUrl = previewFile
    ? await uploadFileToR2(previewFile, `previews/${baseKey}${getFileExtension(previewFile.name)}`)
    : undefined;
  const downloadUrl = downloadFile
    ? await uploadFileToR2(downloadFile, `downloads/${baseKey}${getFileExtension(downloadFile.name)}`)
    : undefined;

  const accent = getString(formData, "accent");

  const document = await getSanityWriteClient().create({
    _type: "soundAsset",
    title,
    category,
    previewUrl,
    downloadUrl,
    bpm: getNumber(formData, "bpm", null),
    key: getString(formData, "key") || "N/A",
    mood: getString(formData, "mood"),
    credits: getNumber(formData, "credits", 1) ?? 1,
    duration: getString(formData, "duration") || "0:00",
    waveform: getWaveform(getString(formData, "waveform")),
    tags: getTags(getString(formData, "tags")),
    accent: accents.includes(accent as (typeof accents)[number]) ? accent : "volt"
  });

  return NextResponse.json({
    id: document._id,
    previewUrl,
    downloadUrl
  });
}
