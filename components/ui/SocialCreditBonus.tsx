"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink } from "lucide-react";
import {
  CREDIT_STORAGE_KEY,
  SOCIAL_CREDIT_BONUS,
  getDefaultCreditState,
  normalizeCreditState,
  type CreditState
} from "@/lib/credits";
import { socialBonusLinks } from "@/lib/socials";

function readCreditState() {
  const stored = window.localStorage.getItem(CREDIT_STORAGE_KEY);
  return normalizeCreditState(stored ? (JSON.parse(stored) as CreditState) : getDefaultCreditState());
}

export function SocialCreditBonus() {
  const [state, setState] = useState<CreditState>(getDefaultCreditState);
  const [visitedSocials, setVisitedSocials] = useState<string[]>([]);

  useEffect(() => {
    setState(readCreditState());
  }, []);

  const claimBonus = (socialId: string) => {
    const current = readCreditState();
    const claimed = new Set(current.claimedSocialBonuses ?? []);

    if (claimed.has(socialId)) {
      return;
    }

    claimed.add(socialId);

    const nextState = {
      ...current,
      claimedSocialBonuses: Array.from(claimed)
    };

    window.localStorage.setItem(CREDIT_STORAGE_KEY, JSON.stringify(nextState));
    window.dispatchEvent(new Event("credits:changed"));
    setState(nextState);
  };

  const claimedSocials = new Set(state.claimedSocialBonuses ?? []);
  const visitedSocialSet = new Set(visitedSocials);

  if (claimedSocials.size >= socialBonusLinks.length) {
    return null;
  }

  return (
    <section className="border-2 border-ink bg-white p-2 shadow-hard">
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink pb-2">
        <p className="font-display text-xs font-black uppercase">Social bonus credits</p>
        <p className="text-[11px] font-bold uppercase text-ink/55">Claim +{SOCIAL_CREDIT_BONUS} today</p>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-3">
        {socialBonusLinks.map(({ id, label, href, Icon, tone }) => {
          const isClaimed = claimedSocials.has(id);
          const isVisited = visitedSocialSet.has(id);

          return (
            <div key={id} className="grid grid-cols-[1fr_auto] items-center gap-2 border-2 border-ink bg-bone p-1.5">
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setVisitedSocials((current) => (current.includes(id) ? current : [...current, id]))}
                className="flex min-h-9 min-w-0 items-center justify-between gap-2 px-1 font-display text-xs font-black uppercase transition hover:-translate-y-0.5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center border-2 border-ink ${tone}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="truncate">{label}</span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              </a>

              <button
                type="button"
                onClick={() => claimBonus(id)}
                disabled={!isVisited || isClaimed}
                className="inline-flex h-9 min-w-24 items-center justify-center gap-1.5 border-2 border-ink bg-white px-2 font-display text-[10px] font-black uppercase transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
              >
                {isClaimed ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : null}
                {isClaimed ? "Claimed" : isVisited ? "I followed" : "Open first"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
