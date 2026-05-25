import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@sanity/client";

const previewDurationSeconds = 20;

const requiredEnv = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "SANITY_API_WRITE_TOKEN",
  "ADMIN_UPLOAD_PASSWORD",
  "NEXT_PUBLIC_SANITY_PROJECT_ID",
  "NEXT_PUBLIC_SANITY_DATASET"
] as const;

const requiredAdminEnv = [
  "SANITY_API_WRITE_TOKEN",
  "ADMIN_UPLOAD_PASSWORD",
  "NEXT_PUBLIC_SANITY_PROJECT_ID",
  "NEXT_PUBLIC_SANITY_DATASET"
] as const;

const requiredR2Env = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"] as const;

type RequiredEnvKey = (typeof requiredEnv)[number];

export function getMissingUploadEnv() {
  return requiredEnv.filter((key) => !process.env[key]);
}

export function getMissingAdminEnv() {
  return requiredAdminEnv.filter((key) => !process.env[key]);
}

export function getMissingR2Env() {
  return requiredR2Env.filter((key) => !process.env[key]);
}

export function isR2Configured() {
  return getMissingR2Env().length === 0;
}

export function isUploadConfigured() {
  return getMissingUploadEnv().length === 0;
}

export function isAdminPasswordValid(password: FormDataEntryValue | null) {
  return typeof password === "string" && password.length > 0 && password === process.env.ADMIN_UPLOAD_PASSWORD;
}

function getEnv(key: RequiredEnvKey) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }

  return value;
}

export function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${getEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY")
    }
  });
}

export function getSanityWriteClient() {
  return createClient({
    projectId: getEnv("NEXT_PUBLIC_SANITY_PROJECT_ID"),
    dataset: getEnv("NEXT_PUBLIC_SANITY_DATASET"),
    apiVersion: "2026-05-24",
    token: getEnv("SANITY_API_WRITE_TOKEN"),
    useCdn: false
  });
}

export function slugifyFileName(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || `asset-${Date.now()}`;
}

export function getFileExtension(fileName: string) {
  const match = fileName.match(/\.([a-z0-9]+)$/i);
  return match ? `.${match[1].toLowerCase()}` : "";
}

export async function uploadFileToR2(file: File, key: string) {
  const bytes = Buffer.from(await file.arrayBuffer());

  await uploadBufferToR2(bytes, key, file.type || "application/octet-stream");

  return key;
}

async function uploadBufferToR2(bytes: Buffer, key: string, contentType: string) {

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getEnv("R2_BUCKET_NAME"),
      Key: key,
      Body: bytes,
      ContentType: contentType
    })
  );
}

export async function uploadTrimmedPreviewToR2(file: File, key: string) {
  const [{ execFile }, { default: ffmpegPath }, { randomUUID }, { mkdir, readFile, rm, writeFile }, { tmpdir }, path, { promisify }] =
    await Promise.all([
      import("child_process"),
      import("ffmpeg-static"),
      import("crypto"),
      import("fs/promises"),
      import("os"),
      import("path"),
      import("util")
    ]);
  const execFileAsync = promisify(execFile);

  if (!ffmpegPath) {
    throw new Error("Preview trimming is unavailable because ffmpeg is not installed.");
  }

  const workDir = path.join(tmpdir(), `prodbrogy-preview-${randomUUID()}`);
  const inputPath = path.join(workDir, `input${getFileExtension(file.name) || ".audio"}`);
  const outputPath = path.join(workDir, "preview.mp3");

  await mkdir(workDir, { recursive: true });

  try {
    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    await execFileAsync(ffmpegPath, [
      "-y",
      "-i",
      inputPath,
      "-t",
      String(previewDurationSeconds),
      "-af",
      "afade=t=out:st=18.5:d=1.5",
      "-vn",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "192k",
      outputPath
    ]);

    const bytes = await readFile(outputPath);
    await uploadBufferToR2(bytes, key, "audio/mpeg");
  } finally {
    await rm(workDir, { force: true, recursive: true });
  }

  return key;
}

export function isR2ObjectPath(value?: string | null) {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  return Boolean(trimmed) && !/^https?:\/\//i.test(trimmed) && !trimmed.includes("<iframe");
}

export async function deleteFileFromR2(key?: string | null) {
  if (!isR2ObjectPath(key)) {
    return;
  }

  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: getEnv("R2_BUCKET_NAME"),
      Key: key?.trim().replace(/^\/+/, "")
    })
  );
}
