export const soundCategories = [
  { id: "midi", title: "MIDI" },
  { id: "loops", title: "Loops" },
  { id: "phrases", title: "Phrases" },
  { id: "oneshots", title: "One Shots" },
  { id: "starters", title: "Starters" },
  { id: "drums", title: "Drum Sounds" }
] as const;

export type SoundCategoryId = (typeof soundCategories)[number]["id"];
