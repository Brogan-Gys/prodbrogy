"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, CheckCircle2, ChevronDown, Disc3, Heart, PackageOpen, Search, Sparkles } from "lucide-react";
import { useAccount } from "@/components/auth/AccountProvider";
import { FreeKits } from "@/components/sections/FreeKits";
import { Hero } from "@/components/sections/Hero";
import { SoundLibrary } from "@/components/sections/SoundLibrary";
import { CategoryRail } from "@/components/ui/CategoryRail";
import { CreditMeter } from "@/components/ui/CreditMeter";
import { Footer } from "@/components/ui/Footer";
import { PreviewVolumeControl } from "@/components/ui/PreviewVolumeControl";
import { SocialCreditBonus } from "@/components/ui/SocialCreditBonus";
import { StatPill } from "@/components/ui/StatPill";
import { SubmissionCallout } from "@/components/ui/SubmissionCallout";
import { categories, type SoundAsset } from "@/lib/sounds";
import type { FreeKit } from "@/lib/freeKits";

type HomeClientProps = {
  sounds: SoundAsset[];
  /** Size of the whole catalogue, so the client knows how much is still to come. */
  totalSounds?: number;
  freeKits: FreeKit[];
};

const SOUNDS_CACHE_KEY = "prodbrogy-sounds-cache";

type LibraryView = "all" | "downloaded" | "favorites";
type SortMode = "fresh" | "title" | "bpm";
// The catalogue changes on the order of once a week, so there is no polling.
// A revalidation only runs when the tab regains focus, and at most this often;
// it is a conditional request, so an unchanged catalogue answers 304 (no body).
const REVALIDATE_AFTER_MS = 5 * 60 * 1000;
const SKELETON_SWAP_DELAY_MS = 500;
const FREE_KITS_CATEGORY_ID = "free-kits";
const freeKitsCategory = {
  id: FREE_KITS_CATEGORY_ID,
  label: "Free kits",
  description: "Browse free downloads and bonus kits.",
  icon: PackageOpen
};

function readCachedSounds(): SoundAsset[] | null {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(SOUNDS_CACHE_KEY) || "null") as SoundAsset[] | null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedSounds(sounds: SoundAsset[]) {
  try {
    window.sessionStorage.setItem(SOUNDS_CACHE_KEY, JSON.stringify(sounds));
  } catch {
    // sessionStorage unavailable (private mode / quota) — caching is best-effort
  }
}

/** Merges a fetched batch into the list, keeping newest-first order and
 *  dropping any duplicate the server and the background fetch both returned. */
function mergeSounds(current: SoundAsset[], incoming: SoundAsset[]): SoundAsset[] {
  const seen = new Set(current.map((sound) => sound.id));

  return [...current, ...incoming.filter((sound) => !seen.has(sound.id))];
}

/** Defers work until the browser is idle so the background load never competes
 *  with hydration or the first interaction. */
function whenIdle(callback: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(callback, { timeout: 2000 });
    return () => window.cancelIdleCallback(handle);
  }

  const handle = window.setTimeout(callback, 200);
  return () => window.clearTimeout(handle);
}

export function HomeClient({ sounds, totalSounds = sounds.length, freeKits }: HomeClientProps) {
  const [liveSounds, setLiveSounds] = useState(sounds);
  const [isLoadingRest, setIsLoadingRest] = useState(sounds.length < totalSounds);
  const [isRefreshingSounds, setIsRefreshingSounds] = useState(false);
  const etagRef = useRef<string | null>(null);
  const lastCheckedRef = useRef(Date.now());
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [libraryView, setLibraryView] = useState<LibraryView>("all");
  const [sortMode, setSortMode] = useState<SortMode>("fresh");
  const { downloadedIds, favoriteIds, isSignedIn, openSignIn, refresh: refreshAccount } = useAccount();

  // Back-navigation and empty server responses fall back to the last good list
  // so the library is never blank while the network catches up.
  useEffect(() => {
    if (sounds.length > 0) {
      return;
    }

    const cached = readCachedSounds();

    if (cached && cached.length > 0) {
      setLiveSounds(cached);
      setIsLoadingRest(false);
    }
  }, [sounds]);

  // One background request for everything past the first page. Runs once, when
  // the browser is idle — not on a timer.
  useEffect(() => {
    if (sounds.length === 0 || sounds.length >= totalSounds) {
      setIsLoadingRest(false);
      return;
    }

    let isMounted = true;

    const cancelIdle = whenIdle(async () => {
      try {
        const response = await fetch(`/api/sounds?offset=${sounds.length}`);

        if (!response.ok || !isMounted) {
          return;
        }

        const data = (await response.json()) as { sounds?: SoundAsset[] };

        if (!isMounted || !Array.isArray(data.sounds)) {
          return;
        }

        setLiveSounds((current) => {
          const merged = mergeSounds(current, data.sounds ?? []);
          writeCachedSounds(merged);
          return merged;
        });
      } catch {
        // Offline or the request failed: the first page stays usable.
      } finally {
        if (isMounted) {
          setIsLoadingRest(false);
        }
      }
    });

    return () => {
      isMounted = false;
      cancelIdle();
    };
  }, [sounds, totalSounds]);

  // Cheap freshness check when the visitor comes back to the tab.
  useEffect(() => {
    let isMounted = true;

    const revalidate = async () => {
      if (document.visibilityState !== "visible" || Date.now() - lastCheckedRef.current < REVALIDATE_AFTER_MS) {
        return;
      }

      lastCheckedRef.current = Date.now();

      try {
        const response = await fetch("/api/sounds", {
          headers: etagRef.current ? { "If-None-Match": etagRef.current } : undefined
        });

        // 304: nothing changed since the last check, so there is nothing to do.
        if (response.status === 304 || !response.ok || !isMounted) {
          return;
        }

        etagRef.current = response.headers.get("etag");

        const data = (await response.json()) as { sounds?: SoundAsset[] };

        if (!isMounted || !Array.isArray(data.sounds) || data.sounds.length === 0) {
          return;
        }

        writeCachedSounds(data.sounds);
        setLiveSounds(data.sounds);
      } catch {
        // Leave the current list in place.
      }
    };

    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
    };
  }, []);

  // Both of these now live server-side; re-reading the account is what updates
  // the credit meter, the download badge, and the stash counts.
  const recordDownload = () => {
    void refreshAccount();
  };

  const toggleFavorite = async (sound: SoundAsset) => {
    if (!isSignedIn) {
      openSignIn();
      return;
    }

    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soundId: sound.id })
    });

    await refreshAccount();
  };
  const hasActiveFilters = activeCategory !== "all" || libraryView !== "all" || query.trim().length > 0 || sortMode !== "fresh";
  const isViewingFreeKits = activeCategory === FREE_KITS_CATEGORY_ID;
  const libraryCategories = useMemo(
    () => (freeKits.length > 0 ? [...categories, freeKitsCategory] : categories),
    [freeKits.length]
  );
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
        [sound.title, sound.bpm?.toString() ?? "any bpm", sound.category]
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
      <Hero soundCount={Math.max(liveSounds.length, totalSounds)} />

      <section id="library" className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="flex flex-wrap gap-2">
            <StatPill icon={Disc3} label="Assets" value={`${Math.max(liveSounds.length, totalSounds)}`} tone="dark" />
            <StatPill icon={CheckCircle2} label="Saved" value={`${downloadedIds.length}`} tone="saved" />
            <StatPill icon={Heart} label="Stash" value={`${favoriteIds.length}`} tone="stash" />
            <StatPill icon={Sparkles} label="Fresh" value="Weekly" tone="coral" />
            <StatPill icon={ArrowDownToLine} label="Daily base" value="12 credits" tone="volt" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-[220px_280px]">
            <div className="hidden lg:block">
              <PreviewVolumeControl />
            </div>
            <CreditMeter />
          </div>
        </div>
        {/*
        <SocialCreditBonus />
        */}
        <SubmissionCallout />

        <div id="sound-files" className="grid gap-3 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:sticky lg:top-5 lg:block lg:self-start">
            <CategoryRail categories={libraryCategories} activeCategory={activeCategory} onSelectCategory={setActiveCategory} />
          </aside>

          <div className="space-y-3">
            <div
              className={`grid grid-cols-3 gap-1.5 border-2 border-ink bg-white p-1.5 shadow-hard-sm ${
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
                  {libraryCategories.map((category) => (
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
                {isViewingFreeKits
                  ? `${freeKits.length} ${freeKits.length === 1 ? "kit" : "kits"}`
                  : `${filteredSounds.length} ${filteredSounds.length === 1 ? "sound" : "sounds"}`}
              </div>
            </div>

            {isViewingFreeKits ? (
              <FreeKits kits={freeKits} />
            ) : (
              <SoundLibrary
                sounds={filteredSounds}
                activeCategory={activeCategory}
                libraryView={libraryView}
                downloadedIds={downloadedIds}
                favoriteIds={favoriteIds}
                isRefreshing={isRefreshingSounds}
                isLoadingMore={isLoadingRest}
                onDownloadRecorded={recordDownload}
                onFavoriteToggle={toggleFavorite}
                onSignInRequired={openSignIn}
              />
            )}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
