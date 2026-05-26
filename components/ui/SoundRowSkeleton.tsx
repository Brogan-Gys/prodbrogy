function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span className={`block animate-pulse bg-ink/15 ${className}`} aria-hidden />;
}

export function SoundRowSkeleton() {
  return (
    <article className="grid gap-3 border-2 border-ink bg-white p-3 shadow-hard lg:grid-cols-[1fr_260px]">
      <div className="grid gap-3 md:grid-cols-[56px_1fr]">
        <SkeletonBlock className="h-14 w-14 border-2 border-ink" />

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="grid w-full max-w-sm gap-2">
              <SkeletonBlock className="h-7 w-3/4" />
              <SkeletonBlock className="h-3 w-1/2" />
              <SkeletonBlock className="h-4 w-2/3" />
            </div>
            <SkeletonBlock className="h-8 w-16 border-2 border-ink" />
          </div>

          <div className="mt-4 border-2 border-ink bg-bone p-2">
            <SkeletonBlock className="h-3 w-full border-2 border-ink bg-ink/10" />
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 border-t-2 border-ink pt-3 lg:border-l-2 lg:border-t-0 lg:pl-3 lg:pt-0">
        <div className="flex flex-wrap gap-2">
          <SkeletonBlock className="h-7 w-16" />
          <SkeletonBlock className="h-7 w-20" />
          <SkeletonBlock className="h-7 w-14" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-11 w-28 border-2 border-ink" />
        </div>
      </div>
    </article>
  );
}

export function SoundLibrarySkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading sounds">
      {Array.from({ length: count }).map((_, index) => (
        <SoundRowSkeleton key={index} />
      ))}
    </div>
  );
}
