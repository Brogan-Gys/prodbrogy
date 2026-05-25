import { NextResponse } from "next/server";
import {
  createR2PutUrl,
  getFileExtension,
  getMissingUploadEnv,
  getUploadContentType,
  isAdminPasswordValid,
  slugifyFileName
} from "@/lib/server/adminUpload";

export const runtime = "nodejs";

type UploadUrlRequest = {
  password?: string;
  title?: string;
  previewFileName?: string;
  previewContentType?: string;
  downloadFileName?: string;
  downloadContentType?: string;
};

export async function POST(request: Request) {
  const missingEnv = getMissingUploadEnv();

  if (missingEnv.length > 0) {
    return NextResponse.json({ error: `Upload is not configured: ${missingEnv.join(", ")}` }, { status: 500 });
  }

  const body = (await request.json()) as UploadUrlRequest;

  if (!isAdminPasswordValid(body.password ?? null)) {
    return NextResponse.json({ error: "Invalid admin password." }, { status: 401 });
  }

  if (!body.title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (!body.previewFileName && !body.downloadFileName) {
    return NextResponse.json({ error: "Add at least one preview or download file." }, { status: 400 });
  }

  const baseKey = `${slugifyFileName(body.title)}-${Date.now().toString(36)}`;
  const previewTempKey = body.previewFileName
    ? `uploads/tmp/${baseKey}-preview${getFileExtension(body.previewFileName)}`
    : undefined;
  const downloadKey = body.downloadFileName
    ? `downloads/${baseKey}${getFileExtension(body.downloadFileName)}`
    : undefined;

  return NextResponse.json({
    baseKey,
    preview: previewTempKey
      ? {
          key: previewTempKey,
          url: await createR2PutUrl(previewTempKey, body.previewContentType),
          contentType: getUploadContentType(body.previewContentType)
        }
      : null,
    download: downloadKey
      ? {
          key: downloadKey,
          url: await createR2PutUrl(downloadKey, body.downloadContentType),
          contentType: getUploadContentType(body.downloadContentType)
        }
      : null
  });
}
