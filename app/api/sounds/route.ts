import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getSounds, getSoundsPage } from "@/lib/sanity/queries";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 500;

function parseNumber(value: string | null, fallback: number) {
  // Note `Number(null)` and `Number("")` are both 0, so an absent parameter has
  // to be rejected before the numeric check or it silently becomes zero.
  if (value === null || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const hasRange = url.searchParams.has("offset") || url.searchParams.has("limit");

  const body = hasRange
    ? await getSoundsPage(
        {
          offset: parseNumber(url.searchParams.get("offset"), 0),
          limit: Math.min(parseNumber(url.searchParams.get("limit"), MAX_LIMIT), MAX_LIMIT)
        },
        { cache: "no-store" }
      )
    : { sounds: await getSounds({ cache: "no-store" }) };

  const payload = JSON.stringify(body);
  const etag = `W/"${createHash("sha1").update(payload).digest("base64")}"`;

  // An unchanged catalogue answers with an empty 304 instead of the full list,
  // so the periodic revalidation costs headers rather than ~80KB.
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": "private, no-cache" }
    });
  }

  return new NextResponse(payload, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ETag: etag,
      "Cache-Control": "private, no-cache"
    }
  });
}
