import { NextResponse } from "next/server";
import { getSoundById } from "@/lib/sanity/queries";
import { extractMidiPreview, readR2Object, MIDI_PREVIEW_SECONDS } from "@/lib/server/midiPreview";
import { publicAssetBaseUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Turns the stored downloadUrl back into the R2 object key it came from. */
function toObjectKey(downloadUrl: string) {
  if (!/^https?:\/\//i.test(downloadUrl)) {
    return downloadUrl.replace(/^\/+/, "");
  }

  try {
    const url = new URL(downloadUrl);

    // Only ever read from our own bucket's public host.
    if (url.origin !== new URL(publicAssetBaseUrl).origin) {
      return null;
    }

    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

/**
 * Serves the note events for the opening seconds of a MIDI file so the browser
 * can play it through a soundfont.
 *
 * The .mid is a paid download, so it never leaves the server: this returns a
 * time-limited list of note events, which is enough to audition the idea and
 * not enough to rebuild the file.
 */
export async function GET(request: Request) {
  const soundId = new URL(request.url).searchParams.get("soundId");

  if (!soundId) {
    return NextResponse.json({ error: "Missing soundId." }, { status: 400 });
  }

  const sound = await getSoundById(soundId);

  if (!sound || sound.category !== "midi" || !sound.downloadUrl) {
    return NextResponse.json({ error: "No MIDI preview for this sound." }, { status: 404 });
  }

  const key = toObjectKey(sound.downloadUrl);

  if (!key || !/\.midi?$/i.test(key)) {
    return NextResponse.json({ error: "No MIDI preview for this sound." }, { status: 404 });
  }

  try {
    const [bytes, { Midi }] = await Promise.all([readR2Object(key), import("@tonejs/midi")]);
    const preview = extractMidiPreview(new Midi(bytes), MIDI_PREVIEW_SECONDS);

    if (preview.notes.length === 0) {
      return NextResponse.json({ error: "That MIDI file has no notes to preview." }, { status: 422 });
    }

    return NextResponse.json(preview, {
      headers: {
        // Deterministic for a given file, and never user-specific.
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
      }
    });
  } catch {
    return NextResponse.json({ error: "Could not read that MIDI file." }, { status: 502 });
  }
}
