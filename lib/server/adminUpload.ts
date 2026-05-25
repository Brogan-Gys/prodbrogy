import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@sanity/client";

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

type RequiredEnvKey = (typeof requiredEnv)[number];

export function getMissingUploadEnv() {
  return requiredEnv.filter((key) => !process.env[key]);
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

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getEnv("R2_BUCKET_NAME"),
      Key: key,
      Body: bytes,
      ContentType: file.type || "application/octet-stream"
    })
  );

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
