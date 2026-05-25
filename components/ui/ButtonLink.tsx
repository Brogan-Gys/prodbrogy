import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  icon: LucideIcon;
  variant?: "dark" | "light";
};

export function ButtonLink({ href, children, icon: Icon, variant = "dark" }: ButtonLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex h-12 items-center gap-2 border-2 border-ink px-4 font-display text-sm font-black uppercase shadow-hard transition hover:-translate-y-0.5",
        variant === "dark" ? "bg-ink text-bone" : "bg-white text-ink"
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {children}
    </a>
  );
}
