import type { InstrumentId } from "./midiInstruments";

export type PreviewNote = { m: number; t: number; d: number; v: number };

/** MIT-licensed General MIDI samples (gleitz/midi-js-soundfonts) served from
 *  jsDelivr. Individual note MP3s, so a preview only downloads the pitches it
 *  actually plays rather than a ~2MB instrument bundle. */
const SOUNDFONT_BASE = "https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM";

const NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/** The sample set only covers this range; anything outside is transposed in. */
const LOWEST_MIDI = 21;
const HIGHEST_MIDI = 108;

function midiToSampleName(midi: number) {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** One AudioBuffer per note, shared across every player on the page so
 *  switching rows or replaying costs nothing after the first load. */
const bufferCache = new Map<string, Promise<AudioBuffer | null>>();

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext {
  if (!sharedContext) {
    sharedContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }

  return sharedContext;
}

function loadNote(context: AudioContext, instrument: InstrumentId, midi: number): Promise<AudioBuffer | null> {
  const key = `${instrument}:${midi}`;
  const cached = bufferCache.get(key);

  if (cached) {
    return cached;
  }

  const request = (async () => {
    try {
      const response = await fetch(`${SOUNDFONT_BASE}/${instrument}-mp3/${midiToSampleName(midi)}.mp3`);

      if (!response.ok) {
        return null;
      }

      return await context.decodeAudioData(await response.arrayBuffer());
    } catch {
      return null;
    }
  })();

  bufferCache.set(key, request);

  return request;
}

export type MidiPlaybackHandle = {
  stop: () => void;
  /** Seconds of audio scheduled, so the caller can drive a progress bar. */
  duration: number;
};

/**
 * Loads the samples a set of notes needs, then schedules them all on the Web
 * Audio clock. Scheduling up front (rather than firing timers per note) is what
 * keeps the timing tight regardless of what the main thread is doing.
 */
export async function playMidiPreview(
  notes: PreviewNote[],
  {
    instrument,
    volume = 1,
    onEnded
  }: { instrument: InstrumentId; volume?: number; onEnded?: () => void }
): Promise<MidiPlaybackHandle> {
  const context = getContext();

  if (context.state === "suspended") {
    await context.resume();
  }

  const usable = notes.filter((note) => note.m >= LOWEST_MIDI && note.m <= HIGHEST_MIDI);
  const pitches = [...new Set(usable.map((note) => note.m))];
  const buffers = new Map<number, AudioBuffer | null>();

  await Promise.all(
    pitches.map(async (midi) => {
      buffers.set(midi, await loadNote(context, instrument, midi));
    })
  );

  const master = context.createGain();
  master.gain.value = volume;
  master.connect(context.destination);

  const startAt = context.currentTime + 0.08;
  let duration = 0;
  const sources: AudioBufferSourceNode[] = [];

  for (const note of usable) {
    const buffer = buffers.get(note.m);

    if (!buffer) {
      continue;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;

    const gain = context.createGain();
    gain.gain.value = Math.max(0.05, note.v);

    // Samples ring far longer than the notated length, so release each one with
    // a short fade instead of a hard cut, which would click.
    const noteEnd = startAt + note.t + note.d;
    gain.gain.setValueAtTime(Math.max(0.05, note.v), noteEnd);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd + 0.3);

    source.connect(gain);
    gain.connect(master);
    source.start(startAt + note.t);
    source.stop(noteEnd + 0.35);

    sources.push(source);
    duration = Math.max(duration, note.t + note.d);
  }

  let stopped = false;

  const stop = () => {
    if (stopped) {
      return;
    }

    stopped = true;

    for (const source of sources) {
      try {
        source.stop();
      } catch {
        // Already finished.
      }
    }

    master.disconnect();
  };

  if (onEnded) {
    window.setTimeout(() => {
      if (!stopped) {
        onEnded();
      }
    }, (duration + 0.4) * 1000);
  }

  return { stop, duration };
}

/** Warms the cache for an instrument's mid register so the first play of the
 *  next row starts instantly. Safe to call and ignore. */
export function prefetchInstrument(instrument: InstrumentId) {
  const context = getContext();

  for (const midi of [60, 64, 67]) {
    void loadNote(context, instrument, midi);
  }
}
