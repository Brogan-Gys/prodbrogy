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
    <div id="library" className="border-2 border-ink bg-white p-2 shadow-[4px_4px_0_#11110f]">
      <div className="border-b-2 border-ink px-2 py-2">
        <p className="font-display text-lg font-black uppercase leading-none">Library</p>
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
                "group grid min-h-10 grid-cols-[30px_1fr] items-center gap-2 border-2 border-ink px-2 text-left transition",
                isActive ? "bg-volt text-ink" : "bg-white hover:bg-bone"
              )}
            >
              <span className={cn("flex h-7 w-7 items-center justify-center border-2 border-ink", isActive ? "bg-ink text-bone" : "bg-bone")}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-xs font-black uppercase">{category.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
