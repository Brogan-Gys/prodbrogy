import { NextResponse } from "next/server";
import { publicAssetBaseUrl } from "@/lib/storage";

export const runtime = "nodejs";

function getFileName(pathname: string) {
  const name = pathname.split("/").filter(Boolean).pop();
  return name ? decodeURIComponent(name) : "prodbrogy-download";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const rawUrl = requestUrl.searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ error: "Missing download URL." }, { status: 400 });
  }

  let downloadUrl: URL;
  let allowedBaseUrl: URL;

  try {
    downloadUrl = new URL(rawUrl);
    allowedBaseUrl = new URL(publicAssetBaseUrl);
  } catch {
    return NextResponse.json({ error: "Invalid download URL." }, { status: 400 });
  }

  if (downloadUrl.origin !== allowedBaseUrl.origin) {
    return NextResponse.json({ error: "Download URL is not allowed." }, { status: 400 });
  }

  const response = await fetch(downloadUrl);

  if (!response.ok || !response.body) {
    return NextResponse.json({ error: "Download unavailable." }, { status: response.status || 502 });
  }

  return new Response(response.body, {
    headers: {
      "Content-Disposition": `attachment; filename="${getFileName(downloadUrl.pathname)}"`,
      "Content-Type": response.headers.get("content-type") || "application/octet-stream",
      "Content-Length": response.headers.get("content-length") || "",
      "Cache-Control": "private, no-store"
    }
  });
}
