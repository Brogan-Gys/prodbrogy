import { NextResponse } from "next/server";
import {
  deleteFileFromR2,
  getMissingAdminEnv,
  getSanityWriteClient,
  isAdminPasswordValid,
  isR2Configured
} from "@/lib/server/adminUpload";

export const runtime = "nodejs";

const soundsQuery = `*[_type == "soundAsset"] | order(_createdAt desc) {
  "id": _id,
  title,
  category,
  bpm,
  "key": coalesce(key, "N/A"),
  "mood": coalesce(mood, ""),
  "credits": coalesce(credits, 1),
  "duration": coalesce(duration, "0:00"),
  "waveform": coalesce(waveform, []),
  "tags": coalesce(tags, []),
  "accent": coalesce(accent, "volt"),
  previewUrl,
  downloadUrl
}`;

const accents = ["volt", "coral", "cyan", "plum"] as const;

type UpdatePayload = {
  password?: string;
  id?: string;
  title?: string;
  category?: string;
  bpm?: number | null;
  key?: string;
  mood?: string;
  credits?: number;
  duration?: string;
  waveform?: number[];
  tags?: string[];
  accent?: string;
  previewUrl?: string;
  downloadUrl?: string;
};

function getConfigError() {
  const missingEnv = getMissingAdminEnv();
  return missingEnv.length > 0 ? `Admin is not configured: ${missingEnv.join(", ")}` : "";
}

function jsonAuthInvalid() {
  return NextResponse.json({ error: "Invalid admin password." }, { status: 401 });
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(cleanString).filter(Boolean) : [];
}

function cleanWaveform(value: unknown) {
  return Array.isArray(value)
    ? value.map((height) => Number(height)).filter((height) => Number.isFinite(height)).slice(0, 32)
    : [];
}

export async function POST(request: Request) {
  const configError = getConfigError();

  if (configError) {
    return NextResponse.json({ error: configError }, { status: 500 });
  }

  const body = (await request.json()) as { password?: string };

  if (!isAdminPasswordValid(body.password ?? null)) {
    return jsonAuthInvalid();
  }

  const sounds = await getSanityWriteClient().fetch(soundsQuery);
  return NextResponse.json({ sounds });
}

export async function PATCH(request: Request) {
  const configError = getConfigError();

  if (configError) {
    return NextResponse.json({ error: configError }, { status: 500 });
  }

  const body = (await request.json()) as UpdatePayload;

  if (!isAdminPasswordValid(body.password ?? null)) {
    return jsonAuthInvalid();
  }

  if (!body.id) {
    return NextResponse.json({ error: "Missing sound ID." }, { status: 400 });
  }

  const accent = cleanString(body.accent);
  const patch = {
    title: cleanString(body.title),
    category: cleanString(body.category),
    bpm: typeof body.bpm === "number" && Number.isFinite(body.bpm) ? body.bpm : null,
    key: cleanString(body.key) || "N/A",
    mood: cleanString(body.mood),
    credits: typeof body.credits === "number" && Number.isFinite(body.credits) ? body.credits : 1,
    duration: cleanString(body.duration) || "0:00",
    waveform: cleanWaveform(body.waveform),
    tags: cleanStringArray(body.tags),
    accent: accents.includes(accent as (typeof accents)[number]) ? accent : "volt",
    previewUrl: cleanString(body.previewUrl),
    downloadUrl: cleanString(body.downloadUrl)
  };

  if (!patch.title || !patch.category) {
    return NextResponse.json({ error: "Title and category are required." }, { status: 400 });
  }

  const sound = await getSanityWriteClient().patch(body.id).set(patch).commit();
  return NextResponse.json({ sound });
}

export async function DELETE(request: Request) {
  const configError = getConfigError();

  if (configError) {
    return NextResponse.json({ error: configError }, { status: 500 });
  }

  const body = (await request.json()) as { password?: string; id?: string };

  if (!isAdminPasswordValid(body.password ?? null)) {
    return jsonAuthInvalid();
  }

  if (!body.id) {
    return NextResponse.json({ error: "Missing sound ID." }, { status: 400 });
  }

  const client = getSanityWriteClient();
  const existing = await client.fetch<{ previewUrl?: string; downloadUrl?: string } | null>(
    `*[_type == "soundAsset" && _id == $id][0]{previewUrl, downloadUrl}`,
    { id: body.id }
  );

  if (isR2Configured()) {
    await Promise.all([deleteFileFromR2(existing?.previewUrl), deleteFileFromR2(existing?.downloadUrl)]);
  }

  await client.delete(body.id);

  return NextResponse.json({ id: body.id });
}
