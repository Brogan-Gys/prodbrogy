"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Volume1, Volume2, VolumeX } from "lucide-react";
import {
  DEFAULT_PREVIEW_VOLUME,
  PREVIEW_VOLUME_CHANGE_EVENT,
  PREVIEW_VOLUME_STORAGE_KEY,
  normalizePreviewVolume
} from "@/lib/previewVolume";

function readStoredVolume() {
  try {
    return normalizePreviewVolume(window.localStorage.getItem(PREVIEW_VOLUME_STORAGE_KEY));
  } catch {
    return DEFAULT_PREVIEW_VOLUME;
  }
}

export function PreviewVolumeControl() {
  const [volume, setVolume] = useState(DEFAULT_PREVIEW_VOLUME);

  useEffect(() => {
    setVolume(readStoredVolume());
  }, []);

  const handleVolumeChange = (nextValue: string) => {
    const nextVolume = normalizePreviewVolume(Number(nextValue) / 100);

    setVolume(nextVolume);
    window.localStorage.setItem(PREVIEW_VOLUME_STORAGE_KEY, String(nextVolume));
    window.dispatchEvent(new CustomEvent(PREVIEW_VOLUME_CHANGE_EVENT, { detail: nextVolume }));
  };

  const VolumeIcon = volume <= 0 ? VolumeX : volume < 0.55 ? Volume1 : Volume2;
  const percent = Math.round(volume * 100);

  return (
    <div className="min-w-[220px] border-2 border-ink bg-white p-3 shadow-hard">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <VolumeIcon className="h-5 w-5" aria-hidden />
          <p className="font-display text-sm font-black uppercase">Preview volume</p>
        </div>
        <p className="font-display text-sm font-black uppercase">{percent}%</p>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={percent}
        onInput={(event) => handleVolumeChange(event.currentTarget.value)}
        onChange={(event) => handleVolumeChange(event.target.value)}
        className="volume-slider mt-3 w-full"
        style={{ "--volume-percent": `${percent}%` } as CSSProperties}
        aria-label="Preview volume"
      />
    </div>
  );
}
