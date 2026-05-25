"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { SoundRow } from "@/components/ui/SoundRow";
import type { SoundAsset } from "@/lib/sounds";

type SoundLibraryProps = {
  sounds: SoundAsset[];
  downloadedIds?: string[];
  onDownloadRecorded?: (sound: SoundAsset) => void;
};

export function SoundLibrary({ sounds, downloadedIds = [], onDownloadRecorded }: SoundLibraryProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }

    gsap.fromTo(
      listRef.current.querySelectorAll("[data-sound-row]"),
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, ease: "power2.out", stagger: 0.04 }
    );
  }, [sounds]);

  return (
    <div ref={listRef} className="space-y-3">
      {sounds.length > 0 ? (
        sounds.map((sound) => (
          <SoundRow
            key={sound.id}
            sound={sound}
            isDownloaded={downloadedIds.includes(sound.id)}
            onDownloadRecorded={onDownloadRecorded}
          />
        ))
      ) : (
        <div className="border-2 border-ink bg-white p-8 text-center shadow-hard">
          <p className="font-display text-2xl font-black uppercase">No sounds found</p>
          <p className="mt-2 font-semibold text-ink/60">Try another category, tempo, key, or tag.</p>
        </div>
      )}
    </div>
  );
}
