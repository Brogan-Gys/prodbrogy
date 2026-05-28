"use client";

import { useEffect, useState } from "react";
import { BatteryCharging } from "lucide-react";
import {
  CREDIT_STORAGE_KEY,
  getDailyCreditTotal,
  getCreditResetCountdown,
  getDefaultCreditState,
  getSocialBonusCredits,
  normalizeCreditState,
  type CreditState
} from "@/lib/credits";
import { cn } from "@/lib/utils";

export function CreditMeter() {
  const [state, setState] = useState<CreditState>(getDefaultCreditState);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [resetLabel, setResetLabel] = useState("Resets in --");

  useEffect(() => {
    const syncCreditState = () => {
      let parsed: CreditState | null = null;

      try {
        const stored = window.localStorage.getItem(CREDIT_STORAGE_KEY);
        parsed = stored ? (JSON.parse(stored) as CreditState) : null;
      } catch {
        parsed = null;
      }

      const normalized = normalizeCreditState(parsed);
      setState(normalized);
      setResetLabel(getCreditResetCountdown());
      window.localStorage.setItem(CREDIT_STORAGE_KEY, JSON.stringify(normalized));
    };

    syncCreditState();

    const handleCreditChange = () => syncCreditState();
    const handleCreditHighlight = () => {
      setIsHighlighted(true);
      window.setTimeout(() => setIsHighlighted(false), 1400);
    };
    const countdownInterval = window.setInterval(syncCreditState, 60000);

    window.addEventListener("credits:changed", handleCreditChange);
    window.addEventListener("credits:highlight", handleCreditHighlight);

    return () => {
      window.clearInterval(countdownInterval);
      window.removeEventListener("credits:changed", handleCreditChange);
      window.removeEventListener("credits:highlight", handleCreditHighlight);
    };
  }, []);

  const totalCredits = getDailyCreditTotal(state);
  const bonusCredits = getSocialBonusCredits(state);
  const remaining = Math.max(totalCredits - state.used, 0);
  const percent = Math.min((remaining / totalCredits) * 100, 100);

  return (
    <div
      id="credits"
      className={cn(
        "min-w-[280px] border-2 border-ink bg-white p-3 shadow-hard transition-[background-color,box-shadow,transform] duration-300",
        isHighlighted && "bg-cyan shadow-[8px_8px_0_#11110f] -translate-y-1"
      )}
    >
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
        {state.used > 0 ? <p>{resetLabel}</p> : null}
        {bonusCredits > 0 ? <p>+{bonusCredits} social bonus credits active today</p> : null}
      </div>
    </div>
  );
}
