"use client";

import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { SoundRow } from "@/components/ui/SoundRow";
import { SoundLibrarySkeleton } from "@/components/ui/SoundRowSkeleton";
import type { SoundAsset } from "@/lib/sounds";

type SoundLibraryProps = {
  sounds: SoundAsset[];
  activeCategory?: string;
  libraryView?: "all" | "downloaded" | "favorites";
  downloadedIds?: string[];
  favoriteIds?: string[];
  isRefreshing?: boolean;
  onDownloadRecorded?: (sound: SoundAsset) => void;
  onFavoriteToggle?: (sound: SoundAsset) => void;
};

export function SoundLibrary({
  sounds,
  activeCategory = "all",
  libraryView = "all",
  downloadedIds = [],
  favoriteIds = [],
  isRefreshing = false,
  onDownloadRecorded,
  onFavoriteToggle
}: SoundLibraryProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const soundListSignature = useMemo(() => sounds.map((sound) => sound.id).join("|"), [sounds]);
  const emptyState =
    libraryView === "downloaded"
      ? {
          title: "No downloads yet",
          message: "Download sounds to view them here."
        }
      : libraryView === "favorites"
        ? {
            title: "Your stash is empty",
            message: "Save sounds to stash them here."
          }
        : {
            title: "No sounds found",
            message: "Try another category, tempo, mood, or tag."
          };

  useEffect(() => {
    if (!listRef.current) {
      return;
    }

    gsap.fromTo(
      listRef.current.querySelectorAll("[data-sound-row]"),
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, ease: "power2.out", stagger: 0.04 }
    );
  }, [soundListSignature]);

  return (
    <div ref={listRef} className="space-y-3">
      {isRefreshing ? (
        <SoundLibrarySkeleton count={sounds.length > 0 ? Math.min(2, sounds.length) : 4} />
      ) : sounds.length > 0 ? (
        sounds.map((sound) => (
          <SoundRow
            key={sound.id}
            sound={sound}
            showCategoryIndicator={activeCategory === "all"}
            isDownloaded={downloadedIds.includes(sound.id)}
            isFavorited={favoriteIds.includes(sound.id)}
            onDownloadRecorded={onDownloadRecorded}
            onFavoriteToggle={onFavoriteToggle}
          />
        ))
      ) : (
        <div className="border-2 border-ink bg-white p-6 text-center shadow-hard sm:p-8">
          <p className="font-display text-xl font-black uppercase sm:text-2xl">{emptyState.title}</p>
          <p className="mt-2 font-semibold text-ink/60">{emptyState.message}</p>
        </div>
      )}
    </div>
  );
}
