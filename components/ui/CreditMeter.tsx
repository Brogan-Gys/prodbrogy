"use client";

import { useEffect, useState } from "react";
import { BatteryCharging } from "lucide-react";
import {
  CREDIT_STORAGE_KEY,
  DAILY_CREDIT_LIMIT,
  getDefaultCreditState,
  normalizeCreditState,
  type CreditState
} from "@/lib/credits";

export function CreditMeter() {
  const [state, setState] = useState<CreditState>(getDefaultCreditState);

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

    window.addEventListener("credits:changed", handleCreditChange);

    return () => window.removeEventListener("credits:changed", handleCreditChange);
  }, []);

  const remaining = Math.max(DAILY_CREDIT_LIMIT - state.used, 0);
  const percent = Math.min((remaining / DAILY_CREDIT_LIMIT) * 100, 100);

  return (
    <div id="credits" className="min-w-[280px] border-2 border-ink bg-white p-3 shadow-hard">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BatteryCharging className="h-5 w-5" aria-hidden />
          <p className="font-display text-sm font-black uppercase">Daily credits</p>
        </div>
        <p className="font-display text-sm font-black uppercase">
          {remaining}/{DAILY_CREDIT_LIMIT}
        </p>
      </div>
      <div className="mt-3 h-4 border-2 border-ink bg-bone">
        <div className="h-full bg-volt transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
