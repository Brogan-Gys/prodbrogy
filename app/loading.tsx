import { Search, SlidersHorizontal } from "lucide-react";
import { SoundLibrarySkeleton } from "@/components/ui/SoundRowSkeleton";

function FilterSkeleton() {
  return (
    <div className="grid gap-2 border-2 border-ink bg-white p-2 shadow-hard lg:grid-cols-[1fr_170px_170px_170px_auto]">
      <div className="flex h-12 items-center gap-3 border-2 border-ink bg-bone px-3">
        <Search className="h-5 w-5 shrink-0 text-ink/40" aria-hidden />
        <span className="h-4 w-36 animate-pulse bg-ink/15" />
      </div>
      <span className="h-12 animate-pulse border-2 border-ink bg-ink/10" />
      <span className="h-12 animate-pulse border-2 border-ink bg-ink/10" />
      <span className="h-12 animate-pulse border-2 border-ink bg-ink/10" />
      <div className="flex h-12 items-center justify-center gap-2 border-2 border-ink bg-ink px-3 text-bone shadow-[6px_6px_0_#ffffff]">
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        <span className="h-3 w-6 animate-pulse bg-bone/35" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="grain min-h-screen">
      <section className="mx-auto flex min-h-[86vh] w-full max-w-7xl flex-col justify-end px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid max-w-4xl gap-5">
          <span className="h-24 w-full max-w-3xl animate-pulse bg-ink/10 sm:h-32 md:h-40" />
          <span className="h-6 w-full max-w-2xl animate-pulse bg-ink/10" />
          <span className="h-6 w-2/3 animate-pulse bg-ink/10" />
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <FilterSkeleton />
        <SoundLibrarySkeleton />
      </section>
    </main>
  );
}
