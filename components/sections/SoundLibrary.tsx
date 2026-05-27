"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

const MAX_VISIBLE_ROWS = 7;
const FADE_DISTANCE = 56;
const ROW_FADE_RANGE = 90;

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const topFadeRef = useRef<HTMLDivElement>(null);
  const bottomFadeRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const soundListSignature = useMemo(() => sounds.map((sound) => sound.id).join("|"), [sounds]);
  const needsScroll = !isRefreshing && sounds.length > MAX_VISIBLE_ROWS;

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
    if (!scrollRef.current) {
      return;
    }

    gsap.fromTo(
      scrollRef.current.querySelectorAll("[data-sound-row]"),
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, ease: "power2.out", stagger: 0.04 }
    );
  }, [soundListSignature]);

  useLayoutEffect(() => {
    const el = scrollRef.current;

    if (!el || !needsScroll) {
      setMaxHeight(null);
      return;
    }

    const measure = () => {
      const rows = el.querySelectorAll<HTMLElement>("[data-sound-row]");

      if (rows.length <= MAX_VISIBLE_ROWS) {
        setMaxHeight(null);
        return;
      }

      const first = rows[0];
      const last = rows[MAX_VISIBLE_ROWS - 1];
      const total = last.offsetTop + last.offsetHeight - first.offsetTop;
      setMaxHeight(total);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.querySelectorAll<HTMLElement>("[data-sound-row]").forEach((row) => observer.observe(row));

    return () => observer.disconnect();
  }, [soundListSignature, needsScroll]);

  useEffect(() => {
    const el = scrollRef.current;

    if (!el) {
      return;
    }

    const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-sound-row]"));
    rows.forEach((row) => row.classList.add("sound-library-row"));

    const applyFade = () => {
      rafRef.current = null;

      const top = topFadeRef.current;
      const bottom = bottomFadeRef.current;
      const indicator = indicatorRef.current;

      const scrollTop = el.scrollTop;
      const maxScroll = el.scrollHeight - el.clientHeight;
      const containerTop = el.getBoundingClientRect().top;
      const containerBottom = containerTop + el.clientHeight;

      if (top && bottom) {
        if (!needsScroll) {
          top.style.opacity = "0";
          bottom.style.opacity = "0";
        } else {
          top.style.opacity = Math.min(1, scrollTop / FADE_DISTANCE).toFixed(3);
          bottom.style.opacity = Math.min(1, Math.max(0, maxScroll - scrollTop) / FADE_DISTANCE).toFixed(3);
        }
      }

      for (const row of rows) {
        const rect = row.getBoundingClientRect();
        const distFromTop = rect.bottom - containerTop;
        const distFromBottom = containerBottom - rect.top;
        const topFactor = Math.max(0, Math.min(1, distFromTop / ROW_FADE_RANGE));
        const bottomFactor = Math.max(0, Math.min(1, distFromBottom / ROW_FADE_RANGE));
        const factor = Math.min(topFactor, bottomFactor);
        const opacity = needsScroll ? 0.25 + factor * 0.75 : 1;
        const scale = needsScroll ? 0.97 + factor * 0.03 : 1;
        row.style.opacity = opacity.toFixed(3);
        row.style.transform = `scale(${scale.toFixed(3)})`;
      }

      if (indicator && needsScroll) {
        const firstVisible = rows.findIndex((row) => {
          const rect = row.getBoundingClientRect();
          return rect.bottom - containerTop > 8;
        });
        const top1 = firstVisible >= 0 ? firstVisible + 1 : 1;
        const top2 = Math.min(rows.length, top1 + MAX_VISIBLE_ROWS - 1);
        indicator.textContent = `${top1}–${top2} / ${rows.length}`;
      }
    };

    const schedule = () => {
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(applyFade);
      }
    };

    applyFade();
    el.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      el.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      rows.forEach((row) => {
        row.style.opacity = "";
        row.style.transform = "";
      });
    };
  }, [soundListSignature, needsScroll, maxHeight]);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="sound-library-scroll space-y-3"
        style={
          needsScroll && maxHeight
            ? { maxHeight, overflowY: "auto", paddingRight: 8, scrollBehavior: "smooth" }
            : undefined
        }
      >
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

      <div
        ref={topFadeRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-bone via-bone/70 to-transparent opacity-0"
      />
      <div
        ref={bottomFadeRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-bone via-bone/70 to-transparent opacity-0"
      />

      {needsScroll ? (
        <div
          ref={indicatorRef}
          aria-hidden
          className="pointer-events-none absolute right-3 top-2 border-2 border-ink bg-ink px-2 py-0.5 font-display text-[10px] font-black uppercase tracking-wider text-bone shadow-[3px_3px_0_#3a342c]"
        />
      ) : null}
    </div>
  );
}
