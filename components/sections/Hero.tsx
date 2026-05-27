"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, Play, Radio } from "lucide-react";
import gsap from "gsap";
import { ButtonLink } from "@/components/ui/ButtonLink";
import {
  CREDIT_STORAGE_KEY,
  getDailyCreditTotal,
  getDefaultCreditState,
  normalizeCreditState,
  type CreditState
} from "@/lib/credits";

type HeroProps = {
  soundCount?: number;
};

function readCreditState() {
  try {
    const stored = window.localStorage.getItem(CREDIT_STORAGE_KEY);
    return normalizeCreditState(stored ? (JSON.parse(stored) as CreditState) : null);
  } catch {
    return getDefaultCreditState();
  }
}

export function Hero({ soundCount = 0 }: HeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const [creditState, setCreditState] = useState<CreditState>(getDefaultCreditState);
  const highlightCredits = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.setTimeout(() => window.dispatchEvent(new Event("credits:highlight")), 450);
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from("[data-hero-item]", {
        y: 42,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.09
      });

      gsap.to("[data-orbit]", {
        rotate: 360,
        duration: 28,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%"
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    setCreditState(readCreditState());

    const handleCreditChange = () => setCreditState(readCreditState());

    window.addEventListener("credits:changed", handleCreditChange);

    return () => {
      window.removeEventListener("credits:changed", handleCreditChange);
    };
  }, []);

  const remainingCredits = Math.max(getDailyCreditTotal(creditState) - creditState.used, 0);

  return (
    <section
      ref={heroRef}
      className="relative mx-auto flex min-h-[86vh] w-full max-w-7xl flex-col justify-between overflow-hidden px-4 py-5 sm:px-6 lg:px-8"
    >
      <nav className="relative z-10 flex items-center justify-between border-2 border-ink bg-bone/85 px-3 py-3 backdrop-blur md:px-5">
        <div className="flex items-center gap-2">
          <a href="#" className="font-display text-xl font-black uppercase tracking-normal">
            ProdBrogy
          </a>
          <span className="border-2 border-ink bg-coral px-2 py-1 font-display text-xs font-black uppercase">Beta</span>
        </div>
        <p className="hidden text-xs font-black uppercase text-ink/55 md:block">
          {remainingCredits} {remainingCredits === 1 ? "credit" : "credits"} left / {soundCount}{" "}
          {soundCount === 1 ? "sound" : "sounds"} live
        </p>
        <a
          href="#library"
          className="inline-flex h-10 w-10 items-center justify-center border-2 border-ink bg-volt text-ink transition hover:-translate-y-0.5"
          aria-label="Jump to library"
        >
          <ArrowDown className="h-5 w-5" />
        </a>
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
