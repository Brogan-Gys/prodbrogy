import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatPillProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "dark" | "saved" | "coral" | "volt" | "stash";
};

export function StatPill({ icon: Icon, label, value, tone }: StatPillProps) {
  return (
    <div
      className={cn(
        "flex min-h-11 items-center gap-2 border-2 border-ink px-2.5 sm:min-h-14 sm:gap-3 sm:px-3",
        tone === "dark" && "bg-white text-ink shadow-[4px_4px_0_#11110f] sm:shadow-hard",
        tone === "saved" && "bg-white text-ink shadow-[4px_4px_0_#11110f] sm:shadow-hard",
        tone === "coral" && "bg-ink text-bone shadow-[4px_4px_0_#3a342c] sm:shadow-[6px_6px_0_#3a342c]",
        tone === "volt" && "bg-ink text-bone shadow-[4px_4px_0_#3a342c] sm:shadow-[6px_6px_0_#3a342c]",
        tone === "stash" && "bg-white text-ink shadow-[4px_4px_0_#11110f] sm:shadow-hard"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0 sm:h-5 sm:w-5", tone === "stash" && "text-coral")} aria-hidden />
      <div className="leading-tight">
        <p className="font-display text-[9px] font-black uppercase opacity-70 sm:text-[11px]">{label}</p>
        <p className="font-display text-sm font-black uppercase sm:text-lg">{value}</p>
      </div>
    </div>
  );
}
