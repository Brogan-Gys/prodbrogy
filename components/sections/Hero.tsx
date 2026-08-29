"use client";

import { useEffect, useRef } from "react";
import { ArrowDown, Play, Radio } from "lucide-react";
import gsap from "gsap";
import { AccountButton } from "@/components/auth/AccountButton";
import { ButtonLink } from "@/components/ui/ButtonLink";

type HeroProps = {
  soundCount?: number;
};

export function Hero({ soundCount = 0 }: HeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const highlightCredits = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.setTimeout(() => window.dispatchEvent(new Event("credits:highlight")), 450);
  };

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      if (!prefersReducedMotion) {
        gsap.from("[data-hero-item]", {
          y: 42,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.09,
          clearProps: "opacity,transform"
        });
      }

      gsap.to("[data-orbit]", {
        rotate: 360,
        duration: 28,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%"
      });
    }, heroRef);

    // Failsafe: gsap applies the "from" state (opacity 0) synchronously, but its
    // ticker is paused while the tab is backgrounded — on mobile Safari that can
    // leave the hero copy invisible. Force the end state well after the tween.
    const revealTimer = window.setTimeout(() => {
      heroRef.current?.querySelectorAll<HTMLElement>("[data-hero-item]").forEach((item) => {
        item.style.opacity = "";
        item.style.transform = "";
      });
    }, 2500);

    return () => {
      window.clearTimeout(revealTimer);
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative mx-auto flex min-h-[86svh] w-full max-w-7xl flex-col justify-between overflow-hidden px-4 py-5 sm:px-6 lg:px-8"
    >
      <nav className="relative z-10 flex items-center justify-between border-2 border-ink bg-bone/85 px-3 py-3 backdrop-blur md:px-5">
        <div className="flex items-center gap-2">
          <a href="#" className="font-display text-xl font-black uppercase tracking-normal">
            ProdBrogy
          </a>
          <span className="border-2 border-ink bg-coral px-2 py-1 font-display text-xs font-black uppercase">Beta</span>
        </div>
        <div className="flex items-center gap-2">
          <AccountButton />
          <a
            href="#library"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-volt text-ink transition hover:-translate-y-0.5"
            aria-label="Jump to library"
          >
            <ArrowDown className="h-5 w-5" />
          </a>
        </div>
      </nav>

      <div className="relative grid flex-1 items-center gap-8 py-10">
        <div className="relative z-10 max-w-4xl">
          <h1
            data-hero-item
            className="max-w-5xl font-display text-7xl font-black uppercase leading-[0.78] tracking-normal sm:text-8xl md:text-[9rem] lg:text-[11rem]"
          >
            Sound
            <br />
            Supply
          </h1>
          <p data-hero-item className="mt-6 max-w-2xl text-lg font-semibold leading-7 md:text-xl">
            A sharp, collectible library where producers can filter premium sounds, preview ideas,
            and spend daily credits on the files they want in their session.
          </p>
          <div data-hero-item className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="#library" icon={Play}>
              Explore sounds
            </ButtonLink>
            <ButtonLink href="#credits" icon={Radio} variant="light" onClick={highlightCredits}>
              Check credits
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
