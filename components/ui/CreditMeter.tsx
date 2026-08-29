"use client";

import { useEffect, useState } from "react";
import { BatteryCharging, LogIn } from "lucide-react";
import { useAccount } from "@/components/auth/AccountProvider";
import { DAILY_CREDIT_LIMIT, SOCIAL_CREDIT_BONUS, getCreditResetCountdown } from "@/lib/credits";
import { cn } from "@/lib/utils";

// Shared by the signed-in and signed-out states. The fixed height is what stops
// the card resizing when you sign in, or when the reset countdown appears.
const cardClass =
  "flex min-h-[92px] min-w-[280px] flex-col justify-center border-2 border-ink bg-white p-3 shadow-hard transition-[background-color,box-shadow,transform] duration-300";
const highlightClass = "bg-cyan shadow-[8px_8px_0_#11110f] -translate-y-1";

export function CreditMeter() {
  const { credits, isSignedIn, isLoading, openSignIn } = useAccount();
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [resetLabel, setResetLabel] = useState("Resets in --");

  useEffect(() => {
    const syncCountdown = () => setResetLabel(getCreditResetCountdown());

    syncCountdown();

    const handleCreditHighlight = () => {
      setIsHighlighted(true);
      window.setTimeout(() => setIsHighlighted(false), 1400);
    };
    const countdownInterval = window.setInterval(syncCountdown, 60000);

    window.addEventListener("credits:highlight", handleCreditHighlight);

    return () => {
      window.clearInterval(countdownInterval);
      window.removeEventListener("credits:highlight", handleCreditHighlight);
    };
  }, []);

  // Signed out, there is no balance to show yet: advertise what an account
  // gets you instead of a meter that would be meaningless.
  if (!isLoading && !isSignedIn) {
    return (
      <div id="credits" className={cn(cardClass, isHighlighted && highlightClass)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BatteryCharging className="h-5 w-5" aria-hidden />
            <p className="font-display text-sm font-black uppercase">Daily credits</p>
          </div>
          <button
            type="button"
            onClick={openSignIn}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 border-2 border-ink bg-volt px-2.5 font-display text-[11px] font-black uppercase transition hover:-translate-y-0.5"
          >
            <LogIn className="h-3.5 w-3.5" aria-hidden />
            Sign in
          </button>
        </div>
        <p className="mt-3 text-xs font-bold uppercase text-ink/55">{DAILY_CREDIT_LIMIT} free credits a day.</p>
      </div>
    );
  }

  const totalCredits = credits.total || DAILY_CREDIT_LIMIT;
  const bonusCredits = credits.bonuses * SOCIAL_CREDIT_BONUS;
  const remaining = Math.max(totalCredits - credits.used, 0);
  const percent = Math.min((remaining / totalCredits) * 100, 100);

  return (
    <div id="credits" className={cn(cardClass, isHighlighted && highlightClass)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BatteryCharging className="h-5 w-5" aria-hidden />
          <p className="font-display text-sm font-black uppercase">Daily credits</p>
        </div>
        <p className="font-display text-sm font-black uppercase">
          {remaining}/{totalCredits}
        </p>
      </div>
      <div className="mt-3 h-4 border-2 border-ink bg-bone">
        <div className="h-full bg-volt transition-all" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase text-ink/55">
        {credits.used > 0 ? <p>{resetLabel}</p> : null}
        {bonusCredits > 0 ? <p>+{bonusCredits} social bonus credits active today</p> : null}
      </div>
    </div>
  );
}
