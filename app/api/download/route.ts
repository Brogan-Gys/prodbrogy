import { NextResponse } from "next/server";
import { getSoundById } from "@/lib/sanity/queries";
import { publicAssetBaseUrl } from "@/lib/storage";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function getFileExtension(pathname: string) {
  const match = pathname.match(/\.([a-z0-9]+)$/i);
  return match ? `.${match[1].toLowerCase()}` : "";
}

function cleanFileName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^@a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "prodbrogy-download"
  );
}

function buildDownloadName(sound: { title: string; producerName?: string; bpm?: number | null }) {
  return cleanFileName(
    ["@prodbrogy", sound.producerName ? `x-${sound.producerName}` : "", sound.title, sound.bpm ? `${sound.bpm}-bpm` : ""]
      .filter(Boolean)
      .join("-")
  );
}

type SpendResult = {
  ok: boolean;
  reason?: string;
  charged?: number;
  used?: number;
  total?: number;
};

/**
 * Credit-gated download. The client passes only a sound id: the price and the
 * file URL are resolved server-side, and the credit is spent atomically in
 * Postgres before a single byte is streamed.
 */
export async function GET(request: Request) {
  const soundId = new URL(request.url).searchParams.get("soundId");

  if (!soundId) {
    return NextResponse.json({ error: "Missing sound id." }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Accounts are not configured.", reason: "not_configured" }, { status: 503 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to download.", reason: "unauthenticated" }, { status: 401 });
  }

  const sound = await getSoundById(soundId);

  if (!sound || !sound.downloadUrl) {
    return NextResponse.json({ error: "Sound not found.", reason: "not_found" }, { status: 404 });
  }

  let downloadUrl: URL;
  let allowedBaseUrl: URL;

  try {
    downloadUrl = new URL(sound.downloadUrl);
    allowedBaseUrl = new URL(publicAssetBaseUrl);
  } catch {
    return NextResponse.json({ error: "Invalid download URL." }, { status: 400 });
  }

  // Sounds hosted outside R2 (e.g. a Mega link) cannot be proxied, so the
  // credit is still spent here and the client opens the link itself.
  const isProxyable = downloadUrl.origin === allowedBaseUrl.origin;

  const { data, error } = await supabase.rpc("spend_credits_for_download", {
    p_sound_id: sound.id,
    p_title: sound.title,
    p_category: sound.category,
    p_credits: sound.credits
  });

  if (error) {
    return NextResponse.json({ error: "Could not check your credits.", reason: "ledger_error" }, { status: 500 });
  }

  const result = data as SpendResult;

  if (!result?.ok) {
    const status = result?.reason === "unauthenticated" ? 401 : 402;
    return NextResponse.json(
      {
        error: result?.reason === "insufficient_credits" ? "Out of daily credits." : "Download refused.",
        reason: result?.reason ?? "refused",
        used: result?.used,
        total: result?.total
      },
      { status }
    );
  }

  if (!isProxyable) {
    return NextResponse.json({
      redirect: downloadUrl.toString(),
      charged: result.charged ?? 0,
      used: result.used ?? 0,
      total: result.total ?? 0
    });
  }

  const response = await fetch(downloadUrl);

  if (!response.ok || !response.body) {
    // The credit was already spent, but the row is keyed on (user, sound) and
    // re-downloading an owned sound is free, so a retry costs nothing.
    return NextResponse.json({ error: "Download unavailable." }, { status: response.status || 502 });
  }

  return new Response(response.body, {
    headers: {
      "Content-Disposition": `attachment; filename="${buildDownloadName(sound)}${getFileExtension(downloadUrl.pathname)}"`,
      "Content-Type": response.headers.get("content-type") || "application/octet-stream",
      "Content-Length": response.headers.get("content-length") || "",
      "Cache-Control": "private, no-store",
      "X-Credits-Charged": String(result.charged ?? 0),
      "X-Credits-Used": String(result.used ?? 0),
      "X-Credits-Total": String(result.total ?? 0)
    }
  });
}
