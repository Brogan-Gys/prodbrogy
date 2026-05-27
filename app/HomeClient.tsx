"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, CheckCircle2, ChevronDown, Disc3, Heart, Search, Sparkles } from "lucide-react";
import { Hero } from "@/components/sections/Hero";
import { SoundLibrary } from "@/components/sections/SoundLibrary";
import { CategoryRail } from "@/components/ui/CategoryRail";
import { CreditMeter } from "@/components/ui/CreditMeter";
import { Footer } from "@/components/ui/Footer";
import { SocialCreditBonus } from "@/components/ui/SocialCreditBonus";
import { StatPill } from "@/components/ui/StatPill";
import { SubmissionCallout } from "@/components/ui/SubmissionCallout";
import { categories, type SoundAsset } from "@/lib/sounds";

type HomeClientProps = {
  sounds: SoundAsset[];
};

const DOWNLOAD_HISTORY_KEY = "prodbrogy-download-history";
const FAVORITE_SOUNDS_KEY = "prodbrogy-favorite-sounds";

type LibraryView = "all" | "downloaded" | "favorites";
type SortMode = "fresh" | "title" | "bpm";
const LIVE_UPDATE_INTERVAL_MS = 30000;
const SKELETON_SWAP_DELAY_MS = 500;

function readStoredIds(key: string) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]") as string[];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function HomeClient({ sounds }: HomeClientProps) {
  const [liveSounds, setLiveSounds] = useState(sounds);
  const [isRefreshingSounds, setIsRefreshingSounds] = useState(false);
  const soundSignatureRef = useRef(JSON.stringify(sounds));
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [libraryView, setLibraryView] = useState<LibraryView>("all");
  const [sortMode, setSortMode] = useState<SortMode>("fresh");
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    setDownloadedIds(readStoredIds(DOWNLOAD_HISTORY_KEY));
    setFavoriteIds(readStoredIds(FAVORITE_SOUNDS_KEY));
  }, []);

  useEffect(() => {
    let isMounted = true;
    let isChecking = false;
    let swapTimer: number | null = null;

    const getSoundSignature = (value: SoundAsset[]) => JSON.stringify(value);

    const refreshSounds = async () => {
      if (isChecking) {
        return;
      }

      isChecking = true;

      try {
        const response = await fetch("/api/sounds", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { sounds?: SoundAsset[] };
        const nextSounds = Array.isArray(data.sounds) ? data.sounds : [];
        const nextSignature = getSoundSignature(nextSounds);

        if (!isMounted || nextSignature === soundSignatureRef.current) {
          return;
        }

        soundSignatureRef.current = nextSignature;
        setIsRefreshingSounds(true);
        if (swapTimer) {
          window.clearTimeout(swapTimer);
        }

        swapTimer = window.setTimeout(() => {
          if (!isMounted) {
            return;
          }

          setLiveSounds(nextSounds);
          setIsRefreshingSounds(false);
        }, SKELETON_SWAP_DELAY_MS);
      } catch {
        if (isMounted) {
          setIsRefreshingSounds(false);
        }
      } finally {
        isChecking = false;
      }
    };

    const interval = window.setInterval(refreshSounds, LIVE_UPDATE_INTERVAL_MS);
    window.addEventListener("focus", refreshSounds);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshSounds);

      if (swapTimer) {
        window.clearTimeout(swapTimer);
      }
    };
  }, []);

  const recordDownload = (sound: SoundAsset) => {
    setDownloadedIds((current) => {
      const next = Array.from(new Set([...current, sound.id]));
      window.localStorage.setItem(DOWNLOAD_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };
  const toggleFavorite = (sound: SoundAsset) => {
    setFavoriteIds((current) => {
      const next = current.includes(sound.id) ? current.filter((id) => id !== sound.id) : [...current, sound.id];
      window.localStorage.setItem(FAVORITE_SOUNDS_KEY, JSON.stringify(next));
      return next;
    });
  };
  const hasActiveFilters = activeCategory !== "all" || libraryView !== "all" || query.trim().length > 0 || sortMode !== "fresh";
  const clearFilters = () => {
    setActiveCategory("all");
    setLibraryView("all");
    setQuery("");
    setSortMode("fresh");
  };

  const filteredSounds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const nextSounds = liveSounds.filter((sound) => {
      const categoryMatch = activeCategory === "all" || sound.category === activeCategory;
      const libraryMatch =
        libraryView === "all" ||
        (libraryView === "downloaded" && downloadedIds.includes(sound.id)) ||
        (libraryView === "favorites" && favoriteIds.includes(sound.id));
      const searchMatch =
        normalizedQuery.length === 0 ||
        [sound.title, sound.mood, sound.bpm?.toString() ?? "any bpm", sound.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return categoryMatch && libraryMatch && searchMatch;
    });

    return [...nextSounds].sort((a, b) => {
      if (sortMode === "title") {
        return a.title.localeCompare(b.title);
      }

      if (sortMode === "bpm") {
        return (a.bpm ?? 9999) - (b.bpm ?? 9999);
      }

      return 0;
    });
  }, [activeCategory, downloadedIds, favoriteIds, libraryView, liveSounds, query, sortMode]);

  return (
    <main className="grain min-h-screen bg-bone text-ink">
      <Hero soundCount={liveSounds.length} />

      <section id="library" className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="flex flex-wrap gap-2">
            <StatPill icon={Disc3} label="Assets" value={`${liveSounds.length}`} tone="dark" />
            <StatPill icon={CheckCircle2} label="Saved" value={`${downloadedIds.length}`} tone="saved" />
            <StatPill icon={Heart} label="Stash" value={`${favoriteIds.length}`} tone="stash" />
            <StatPill icon={Sparkles} label="Fresh" value="Weekly" tone="coral" />
            <StatPill icon={ArrowDownToLine} label="Daily base" value="12 credits" tone="volt" />
          </div>
          <CreditMeter />
        </div>
        {/*
        <SocialCreditBonus />
        */}
        <SubmissionCallout />

        <div id="sound-files" className="grid gap-3 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:sticky lg:top-5 lg:block lg:self-start">
            <CategoryRail categories={categories} activeCategory={activeCategory} onSelectCategory={setActiveCategory} />
          </aside>

          <div className="space-y-3">
            <div
              className={`grid grid-cols-3 gap-1.5 border-2 border-ink bg-white p-1.5 shadow-[4px_4px_0_#11110f] ${
                hasActiveFilters ? "lg:grid-cols-[1fr_170px_170px_auto_auto]" : "lg:grid-cols-[1fr_170px_170px_auto]"
              }`}
            >
              <label className="col-span-3 hidden h-10 items-center gap-2 border-2 border-ink bg-bone px-2.5 lg:col-span-1 lg:flex">
                <Search className="h-4 w-4 shrink-0" aria-hidden />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search sounds..."
                  className="h-full min-w-0 flex-1 bg-transparent font-display text-xs font-black uppercase outline-none placeholder:text-ink/40"
                />
              </label>

              <div className="relative lg:hidden">
                <select
                  value={activeCategory}
                  onChange={(event) => setActiveCategory(event.target.value)}
                  className="h-10 w-full appearance-none border-2 border-ink bg-bone py-0 pl-2 pr-7 font-display text-[10px] font-black uppercase outline-none"
                  aria-label="Filter category"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" aria-hidden />
              </div>

              <div className="relative min-w-0">
                <select
                  value={libraryView}
                  onChange={(event) => setLibraryView(event.target.value as LibraryView)}
                  className="h-10 w-full appearance-none border-2 border-ink bg-bone py-0 pl-2 pr-7 font-display text-[10px] font-black uppercase outline-none"
                  aria-label="Filter downloads"
                >
                  <option value="all">All sounds</option>
                  <option value="downloaded">Download history</option>
                  <option value="favorites">Your stash</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" aria-hidden />
              </div>

              <div className="relative min-w-0">
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="h-10 w-full appearance-none border-2 border-ink bg-bone py-0 pl-2 pr-7 font-display text-[10px] font-black uppercase outline-none"
                  aria-label="Sort sounds"
                >
                  <option value="fresh">Newest</option>
                  <option value="title">A-Z</option>
                  <option value="bpm">BPM</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" aria-hidden />
              </div>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="col-span-3 h-10 border-2 border-ink bg-white px-2.5 font-display text-[11px] font-black uppercase text-ink transition hover:bg-bone lg:col-span-1"
                >
                  Clear filters
                </button>
              ) : null}

              <div className="col-span-3 hidden h-8 items-center justify-center px-2 text-[11px] font-black uppercase text-ink/55 lg:col-span-1 lg:flex lg:h-10">
                {filteredSounds.length} {filteredSounds.length === 1 ? "sound" : "sounds"}
              </div>
            </div>

            <SoundLibrary
              sounds={filteredSounds}
              activeCategory={activeCategory}
              libraryView={libraryView}
              downloadedIds={downloadedIds}
              favoriteIds={favoriteIds}
              isRefreshing={isRefreshingSounds}
              onDownloadRecorded={recordDownload}
              onFavoriteToggle={toggleFavorite}
            />
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
