"use client";

import { useLayoutEffect, useState } from "react";
import AnimatedList from "@/components/ui/AnimatedList";
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

const DESKTOP_VISIBLE_ROWS = 7;
const MOBILE_VISIBLE_ROWS = 4;

function getVisibleRowLimit() {
  if (typeof window === "undefined") {
    return MOBILE_VISIBLE_ROWS;
  }

  return window.matchMedia("(min-width: 1024px)").matches ? DESKTOP_VISIBLE_ROWS : MOBILE_VISIBLE_ROWS;
}

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
  const [visibleRowLimit, setVisibleRowLimit] = useState(MOBILE_VISIBLE_ROWS);

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

  useLayoutEffect(() => {
    const syncVisibleRows = () => setVisibleRowLimit(getVisibleRowLimit());

    syncVisibleRows();
    window.addEventListener("resize", syncVisibleRows);

    return () => window.removeEventListener("resize", syncVisibleRows);
  }, []);

  return (
    <>
      {isRefreshing ? (
        <SoundLibrarySkeleton count={sounds.length > 0 ? Math.min(2, sounds.length) : 4} />
      ) : null}

      {!isRefreshing ? (
        <AnimatedList
          items={sounds}
          showGradients={true}
          enableArrowNavigation={false}
          displayScrollbar={true}
          maxVisibleItems={visibleRowLimit}
          minVisibleItems={visibleRowLimit}
          getItemKey={(sound) => sound.id}
          emptyState={
            <div className="border-2 border-ink bg-white p-6 text-center shadow-hard sm:p-8">
              <p className="font-display text-xl font-black uppercase sm:text-2xl">{emptyState.title}</p>
              <p className="mt-2 font-semibold text-ink/60">{emptyState.message}</p>
            </div>
          }
          renderItem={(sound) => (
            <SoundRow
              sound={sound}
              showCategoryIndicator={activeCategory === "all"}
              isDownloaded={downloadedIds.includes(sound.id)}
              isFavorited={favoriteIds.includes(sound.id)}
              onDownloadRecorded={onDownloadRecorded}
              onFavoriteToggle={onFavoriteToggle}
            />
          )}
        />
      ) : null}
    </>
  );
}
