export function BootLoader() {
  return (
    <section className="grain flex min-h-screen items-center justify-center bg-bone px-4 py-8" aria-live="polite" aria-busy="true">
      <div className="w-full max-w-56 text-center">
        <p className="font-display text-sm font-black uppercase tracking-normal text-ink">Loading Supply</p>
        <div className="mt-4 h-1 overflow-hidden bg-ink/15" aria-label="Loading">
          <span className="boot-progress block h-full w-1/3 bg-ink" />
        </div>
      </div>
    </section>
  );
}
