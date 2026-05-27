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
        "flex min-h-14 items-center gap-3 border-2 border-ink px-3",
        tone === "dark" && "bg-white text-ink shadow-hard",
        tone === "saved" && "bg-white text-ink shadow-hard",
        tone === "coral" && "bg-ink text-bone shadow-[6px_6px_0_#3a342c]",
        tone === "volt" && "bg-ink text-bone shadow-[6px_6px_0_#3a342c]",
        tone === "stash" && "bg-white text-ink shadow-hard"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", tone === "stash" && "text-coral")} aria-hidden />
      <div className="leading-tight">
        <p className="font-display text-[11px] font-black uppercase opacity-70">{label}</p>
        <p className="font-display text-lg font-black uppercase">{value}</p>
      </div>
    </div>
  );
}
