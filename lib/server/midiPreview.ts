import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { Midi } from "@tonejs/midi";
import { getR2Client, isR2Configured } from "./adminUpload";

/** A single note, kept as short keys because a busy file has a lot of them. */
export type PreviewNote = {
  /** MIDI note number, 0-127. */
  m: number;
  /** Start time in seconds, relative to the preview start. */
  t: number;
  /** Duration in seconds. */
  d: number;
  /** Velocity, 0-1. */
  v: number;
};

export type MidiPreview = {
  notes: PreviewNote[];
  duration: number;
  /** True when the source file is longer than the slice we hand out. */
  truncated: boolean;
};

/** Matches getPreviewLimit("midi") on the client — previews are a taster, and
 *  handing out the whole performance would give away the paid file. */
export const MIDI_PREVIEW_SECONDS = 15;

/** Hard ceiling so a pathological file cannot blow up the response. */
const MAX_NOTES = 1200;

const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * Turns a .mid file into the note events for its first few seconds.
 *
 * The .mid itself is the paid download, so it is never served to the browser.
 * Only this reduced, time-limited note list crosses the wire: enough to hear
 * the idea, not enough to reconstruct the file.
 */
export function extractMidiPreview(midi: Midi, seconds = MIDI_PREVIEW_SECONDS): MidiPreview {

  const notes: PreviewNote[] = [];
  let sourceDuration = 0;

  for (const track of midi.tracks) {
    for (const note of track.notes) {
      sourceDuration = Math.max(sourceDuration, note.time + note.duration);

      if (note.time >= seconds) {
        continue;
      }

      notes.push({
        m: note.midi,
        t: round(note.time),
        // Clip anything still ringing at the cutoff rather than letting it run on.
        d: round(Math.min(note.duration, seconds - note.time)),
        v: round(note.velocity)
      });
    }
  }

  notes.sort((a, b) => a.t - b.t);

  const clipped = notes.slice(0, MAX_NOTES);

  return {
    notes: clipped,
    duration: round(Math.min(sourceDuration, seconds)),
    truncated: sourceDuration > seconds || notes.length > clipped.length
  };
}

/** Reads an object out of R2 as bytes. */
export async function readR2Object(key: string): Promise<Uint8Array> {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured.");
  }

  const bucket = process.env.R2_BUCKET_NAME as string;

  const object = await getR2Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const body = object.Body;

  if (!body || typeof body !== "object" || !("transformToByteArray" in body)) {
    throw new Error("R2 object stream was unavailable.");
  }

  return (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
}
