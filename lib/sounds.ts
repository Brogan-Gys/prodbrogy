import { Boxes, Flame, Layers3, Music2, Piano, type LucideIcon } from "lucide-react";

/** Rows rendered from the server HTML. Enough to fill the library viewport
 *  twice over, small enough to keep the initial document light. */
export const INITIAL_SOUND_PAGE_SIZE = 24;

export type SoundCategory = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type SoundAsset = {
  id: string;
  title: string;
  category: string;
  createdAt?: string;
  producerName: string;
  bpm: number | null;
  mood: string;
  credits: number;
  duration: string;
  tags: string[];
  accent: "volt" | "coral" | "cyan" | "plum";
  previewUrl?: string;
  downloadUrl?: string;
};

export const categories: SoundCategory[] = [
  {
    id: "all",
    label: "All",
    description: "Browse every drop in the vault.",
    icon: Boxes
  },
  {
    id: "midi",
    label: "MIDI",
    description: "Progressions, basslines, and melodic ideas.",
    icon: Piano
  },
  {
    id: "loops",
    label: "Loops",
    description: "Ready-to-flip melodic and drum loops.",
    icon: Layers3
  },
  {
    id: "phrases",
    label: "Phrases",
    description: "Short hooks, licks, and call-response ideas.",
    icon: Music2
  },
  {
    id: "oneshots",
    label: "One shots",
    description: "Single hits for samplers and drum racks.",
    icon: Flame
  },
  {
    id: "starters",
    label: "Starters",
    description: "Mini song seeds with tempo direction.",
    icon: Boxes
  }
];
