"use client";

import { useEffect, useState } from "react";
import { BatteryCharging } from "lucide-react";
import {
  CREDIT_STORAGE_KEY,
  getDailyCreditTotal,
  getDefaultCreditState,
  getSocialBonusCredits,
  normalizeCreditState,
  type CreditState
} from "@/lib/credits";
import { cn } from "@/lib/utils";

export function CreditMeter() {
  const [state, setState] = useState<CreditState>(getDefaultCreditState);
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(CREDIT_STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as CreditState) : null;
    const normalized = normalizeCreditState(parsed);

    setState(normalized);
    window.localStorage.setItem(CREDIT_STORAGE_KEY, JSON.stringify(normalized));

    const handleCreditChange = () => {
      const nextStored = window.localStorage.getItem(CREDIT_STORAGE_KEY);
      setState(normalizeCreditState(nextStored ? (JSON.parse(nextStored) as CreditState) : null));
    };
    const handleCreditHighlight = () => {
      setIsHighlighted(true);
      window.setTimeout(() => setIsHighlighted(false), 1400);
    };

    window.addEventListener("credits:changed", handleCreditChange);
    window.addEventListener("credits:highlight", handleCreditHighlight);

    return () => {
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
        isHighlighted && "bg-volt shadow-[8px_8px_0_#11110f] -translate-y-1"
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
      {bonusCredits > 0 ? (
        <p className="mt-2 text-xs font-bold uppercase text-ink/55">+{bonusCredits} social bonus credits active today</p>
      ) : null}
    </div>
  );
}
