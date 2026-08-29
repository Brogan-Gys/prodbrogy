import type { ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="font-display text-xs font-black uppercase text-ink/60">{label}</span>
      {children}
    </label>
  );
}
