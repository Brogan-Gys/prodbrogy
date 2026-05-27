import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  icon: LucideIcon;
  variant?: "dark" | "light";
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

export function ButtonLink({ href, children, icon: Icon, variant = "dark", onClick }: ButtonLinkProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn(
        "inline-flex h-12 items-center gap-2 border-2 border-ink px-4 font-display text-sm font-black uppercase transition hover:-translate-y-0.5",
        variant === "dark" ? "bg-ink text-bone shadow-[6px_6px_0_#3a342c]" : "bg-white text-ink shadow-hard"
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {children}
    </a>
  );
}
