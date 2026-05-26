"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, CheckCircle2, Disc3, Search, Sparkles } from "lucide-react";
import { Hero } from "@/components/sections/Hero";
import { SoundLibrary } from "@/components/sections/SoundLibrary";
import { CategoryRail } from "@/components/ui/CategoryRail";
import { CreditMeter } from "@/components/ui/CreditMeter";
import { SocialCreditBonus } from "@/components/ui/SocialCreditBonus";
import { StatPill } from "@/components/ui/StatPill";
import { SubmissionCallout } from "@/components/ui/SubmissionCallout";
import { categories, type SoundAsset } from "@/lib/sounds";
import { cn } from "@/lib/utils";

type HomeClientProps = {
  sounds: SoundAsset[];
};

const DOWNLOAD_HISTORY_KEY = "prodbrogy-download-history";

type LibraryView = "all" | "downloaded";

function readDownloadHistory() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DOWNLOAD_HISTORY_KEY) || "[]") as string[];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function HomeClient({ sounds }: HomeClientProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [libraryView, setLibraryView] = useState<LibraryView>("all");
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);

  useEffect(() => {
    setDownloadedIds(readDownloadHistory());
  }, []);

  const recordDownload = (sound: SoundAsset) => {
    setDownloadedIds((current) => {
      const next = Array.from(new Set([...current, sound.id]));
      window.localStorage.setItem(DOWNLOAD_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };

  const filteredSounds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sounds.filter((sound) => {
      const categoryMatch = activeCategory === "all" || sound.category === activeCategory;
      const downloadedMatch = libraryView === "all" || downloadedIds.includes(sound.id);
      const searchMatch =
        normalizedQuery.length === 0 ||
        [sound.title, sound.mood, sound.bpm?.toString() ?? "any bpm", sound.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return categoryMatch && downloadedMatch && searchMatch;
    });
  }, [activeCategory, downloadedIds, libraryView, query, sounds]);

  return (
    <main className="grain min-h-screen">
      <Hero />

      <section id="library" className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="flex flex-wrap gap-2">
            <StatPill icon={Disc3} label="Assets" value={`${sounds.length}`} tone="dark" />
            <StatPill icon={CheckCircle2} label="Saved" value={`${downloadedIds.length}`} tone="dark" />
            <StatPill icon={Sparkles} label="Fresh" value="Weekly" tone="coral" />
            <StatPill icon={ArrowDownToLine} label="Daily base" value="20 credits" tone="volt" />
          </div>
          <CreditMeter />
        </div>
        <SocialCreditBonus />
        <SubmissionCallout />

        <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
          <aside className="lg:sticky lg:top-5 lg:self-start">
            <CategoryRail
              categories={categories}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
            />
          </aside>

          <div className="space-y-3">
            <div className="grid grid-cols-2 border-2 border-ink bg-white p-1 shadow-hard sm:max-w-sm">
              {[
                { id: "all", label: "All sounds" },
                { id: "downloaded", label: "My downloads" }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLibraryView(item.id as LibraryView)}
                  className={cn(
                    "h-10 font-display text-xs font-black uppercase transition",
                    libraryView === item.id ? "bg-ink text-bone" : "bg-white text-ink hover:bg-bone"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label className="flex h-14 items-center gap-3 border-2 border-ink bg-white px-4 shadow-hard">
              <Search className="h-5 w-5 shrink-0" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tempo, mood, tag..."
                className="h-full min-w-0 flex-1 bg-transparent font-display text-base outline-none placeholder:text-ink/45"
              />
            </label>

            <SoundLibrary sounds={filteredSounds} downloadedIds={downloadedIds} onDownloadRecorded={recordDownload} />
          </div>
        </div>
      </section>
    </main>
  );
}
