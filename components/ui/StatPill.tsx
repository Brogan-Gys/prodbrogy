import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatPillProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "dark" | "coral" | "volt";
};

export function StatPill({ icon: Icon, label, value, tone }: StatPillProps) {
  return (
    <div
      className={cn(
        "flex min-h-14 items-center gap-3 border-2 border-ink px-3 shadow-hard",
        tone === "dark" && "bg-ink text-bone",
        tone === "coral" && "bg-coral text-ink",
        tone === "volt" && "bg-volt text-ink"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <div className="leading-tight">
        <p className="font-display text-[11px] font-black uppercase opacity-70">{label}</p>
        <p className="font-display text-lg font-black uppercase">{value}</p>
      </div>
    </div>
  );
}
