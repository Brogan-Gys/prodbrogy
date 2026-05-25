"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, Disc3, Search, Sparkles } from "lucide-react";
import { Hero } from "@/components/sections/Hero";
import { SoundLibrary } from "@/components/sections/SoundLibrary";
import { CategoryRail } from "@/components/ui/CategoryRail";
import { CreditMeter } from "@/components/ui/CreditMeter";
import { StatPill } from "@/components/ui/StatPill";
import { categories, type SoundAsset } from "@/lib/sounds";

type HomeClientProps = {
  sounds: SoundAsset[];
};

export function HomeClient({ sounds }: HomeClientProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");

  const filteredSounds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sounds.filter((sound) => {
      const categoryMatch = activeCategory === "all" || sound.category === activeCategory;
      const searchMatch =
        normalizedQuery.length === 0 ||
        [sound.title, sound.key, sound.mood, sound.bpm?.toString() ?? "any bpm", sound.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return categoryMatch && searchMatch;
    });
  }, [activeCategory, query, sounds]);

  return (
    <main className="grain min-h-screen">
      <Hero />

      <section id="library" className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="flex flex-wrap gap-2">
            <StatPill icon={Disc3} label="Assets" value={`${sounds.length}`} tone="dark" />
            <StatPill icon={Sparkles} label="Fresh" value="Weekly" tone="coral" />
            <StatPill icon={ArrowDownToLine} label="Daily cap" value="12 credits" tone="volt" />
          </div>
          <CreditMeter />
        </div>

        <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
          <aside className="lg:sticky lg:top-5 lg:self-start">
            <CategoryRail
              categories={categories}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
            />
          </aside>

          <div className="space-y-3">
            <label className="flex h-14 items-center gap-3 border-2 border-ink bg-white px-4 shadow-hard">
              <Search className="h-5 w-5 shrink-0" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tempo, key, mood, tag..."
                className="h-full min-w-0 flex-1 bg-transparent font-display text-base outline-none placeholder:text-ink/45"
              />
            </label>

            <SoundLibrary sounds={filteredSounds} />
          </div>
        </div>
      </section>
    </main>
  );
}
