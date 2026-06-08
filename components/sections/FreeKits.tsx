"use client";

import { useEffect, useRef } from "react";
import { ArrowDownToLine, PackageOpen } from "lucide-react";
import gsap from "gsap";
import type { FreeKit } from "@/lib/freeKits";
import { cn } from "@/lib/utils";

type FreeKitsProps = {
  kits: FreeKit[];
};

const accentClass = {
  volt: "bg-volt",
  coral: "bg-coral",
  cyan: "bg-cyan",
  plum: "bg-plum"
};

function FreeKitsContent({ kits }: FreeKitsProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from("[data-free-kits-shell]", {
        y: 16,
        opacity: 0,
        duration: 0.55,
        ease: "power3.out"
      });

      gsap.from("[data-free-kit-card]", {
        y: 8,
        opacity: 0,
        duration: 0.4,
        ease: "power3.out",
        stagger: 0.05,
        delay: 0.12
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleDownload = (kit: FreeKit) => {
    if (!kit.downloadUrl) {
      return;
    }

    window.open(kit.downloadUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section ref={sectionRef} id="free-kits" className="w-full pb-1">
      <div data-free-kits-shell className="min-h-[420px] border-y-2 border-ink py-4 lg:min-h-[760px]">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">Free downloads</p>
            <h2 className="font-display text-3xl font-black uppercase leading-none sm:text-4xl">Free kits</h2>
          </div>
          <div className="inline-flex h-10 items-center gap-2 border-2 border-ink bg-white px-3 font-display text-xs font-black uppercase shadow-hard">
            <PackageOpen className="h-4 w-4" aria-hidden />
            {kits.length} {kits.length === 1 ? "kit" : "kits"}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kits.map((kit) => (
            <article
              key={kit.id}
              data-free-kit-card
              className="grid min-h-[260px] grid-rows-[auto_1fr_auto] border-2 border-ink bg-white p-2 shadow-[4px_4px_0_#11110f]"
            >
              <div className={cn("relative aspect-[16/9] overflow-hidden border-2 border-ink", accentClass[kit.accent])}>
                {kit.imageUrl ? (
                  <img src={kit.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-7">
                    <PackageOpen className="h-16 w-16 opacity-70" aria-hidden />
                  </div>
                )}
                <span className="absolute left-2 top-2 border-2 border-ink bg-white px-2 py-1 font-display text-[10px] font-black uppercase">
                  {kit.type}
                </span>
              </div>

              <div className="min-w-0 py-3">
                <h3 className="line-clamp-2 break-words font-display text-2xl font-black uppercase leading-none">{kit.title}</h3>
                {kit.description ? <p className="mt-2 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-ink/70">{kit.description}</p> : <div className="mt-2 min-h-10" />}
                <p className="mt-3 min-h-4 truncate text-xs font-black uppercase text-ink/55">
                  {kit.contents.length > 0 ? kit.contents.join(" / ") : kit.type}
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => handleDownload(kit)}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 border-2 border-ink bg-ink px-3 font-display text-xs font-black uppercase text-bone transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!kit.downloadUrl}
                >
                  <ArrowDownToLine className="h-4 w-4" aria-hidden />
                  Download
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FreeKits({ kits }: FreeKitsProps) {
  if (kits.length === 0) {
    return null;
  }

  return <FreeKitsContent kits={kits} />;
}
