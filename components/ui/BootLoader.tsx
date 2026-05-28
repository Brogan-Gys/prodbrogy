"use client";

import { useEffect, useState } from "react";

const BOOT_SHOWN_KEY = "prodbrogy-boot-shown";

type BootMode = "full" | "simple" | null;

export function BootLoader() {
  const [mode, setMode] = useState<BootMode>(null);

  useEffect(() => {
    const alreadyShown = window.sessionStorage.getItem(BOOT_SHOWN_KEY) === "1";
    if (alreadyShown) {
      setMode("simple");
      return;
    }
    window.sessionStorage.setItem(BOOT_SHOWN_KEY, "1");
    setMode("full");
  }, []);

  return (
    <section
      className="grain flex min-h-screen items-center justify-center bg-bone px-4 py-8"
      aria-live="polite"
      aria-busy="true"
      style={mode === null ? { visibility: "hidden" } : undefined}
    >
      <div className="w-full max-w-56 text-center">
        {mode !== "simple" ? (
          <p className="mb-4 font-display text-sm font-black uppercase tracking-normal text-ink">Loading Supply</p>
        ) : null}
        <div className="h-1 overflow-hidden bg-ink/15" aria-label="Loading">
          <span className="boot-progress block h-full w-1/3 bg-ink" />
        </div>
      </div>
    </section>
  );
}
