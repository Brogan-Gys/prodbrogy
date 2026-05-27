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
        "inline-flex h-10 items-center gap-1.5 border-2 border-ink px-3 font-display text-xs font-black uppercase transition hover:-translate-y-0.5 sm:h-12 sm:gap-2 sm:px-4 sm:text-sm",
        variant === "dark"
          ? "bg-ink text-bone shadow-[4px_4px_0_#3a342c] sm:shadow-[6px_6px_0_#3a342c]"
          : "bg-white text-ink shadow-[4px_4px_0_#11110f] sm:shadow-hard"
      )}
    >
      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
      {children}
    </a>
  );
}
