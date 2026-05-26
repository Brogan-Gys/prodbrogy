"use client";

import { cn } from "@/lib/utils";
import type { SoundCategory } from "@/lib/sounds";

type CategoryRailProps = {
  categories: SoundCategory[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
};

export function CategoryRail({ categories, activeCategory, onSelectCategory }: CategoryRailProps) {
  return (
    <div id="library" className="border-2 border-ink bg-white p-2 shadow-hard">
      <div className="border-b-2 border-ink px-3 py-3">
        <p className="font-display text-2xl font-black uppercase leading-none">Library</p>
      </div>
      <div className="mt-2 grid gap-2">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = category.id === activeCategory;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={cn(
                "group grid min-h-14 grid-cols-[40px_1fr] items-center gap-3 border-2 border-ink px-3 text-left transition",
                isActive ? "bg-volt text-ink" : "bg-bone hover:bg-cyan"
              )}
            >
              <span className={cn("flex h-10 w-10 items-center justify-center border-2 border-ink", isActive ? "bg-ink text-bone" : "bg-white")}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-sm font-black uppercase">{category.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
