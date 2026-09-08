/** General MIDI instruments offered in the preview player's picker.
 *  Names must match the folders in the soundfont CDN. */
export type InstrumentId =
  | "acoustic_grand_piano"
  | "electric_piano_1"
  | "electric_piano_2"
  | "acoustic_guitar_nylon"
  | "electric_guitar_clean"
  | "string_ensemble_1"
  | "synth_strings_1"
  | "choir_aahs"
  | "vibraphone"
  | "music_box";

export const DEFAULT_INSTRUMENT: InstrumentId = "acoustic_grand_piano";

export const instrumentOptions: { id: InstrumentId; label: string }[] = [
  { id: "acoustic_grand_piano", label: "Grand piano" },
  { id: "electric_piano_1", label: "Electric piano" },
  { id: "electric_piano_2", label: "Rhodes-ish" },
  { id: "acoustic_guitar_nylon", label: "Nylon guitar" },
  { id: "electric_guitar_clean", label: "Clean guitar" },
  { id: "string_ensemble_1", label: "Strings" },
  { id: "synth_strings_1", label: "Synth strings" },
  { id: "choir_aahs", label: "Choir" },
  { id: "vibraphone", label: "Vibraphone" },
  { id: "music_box", label: "Music box" }
];

export const INSTRUMENT_STORAGE_KEY = "prodbrogy-midi-instrument";

export function isInstrumentId(value: unknown): value is InstrumentId {
  return instrumentOptions.some((option) => option.id === value);
}
