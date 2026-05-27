import { ExternalLink } from "lucide-react";
import { socialLinks } from "@/lib/socials";

export function Footer() {
  return (
    <footer id="site-footer" className="border-t-2 border-ink bg-bone px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div>
          <p className="font-display text-base font-black uppercase leading-none sm:text-lg">Prodbrogy</p>
          <p className="mt-1 text-xs font-bold uppercase text-ink/55">Sound supply</p>
        </div>

        <div className="flex flex-wrap justify-end gap-1.5 sm:gap-2">
          {socialLinks.map(({ id, label, href, Icon, tone }) => (
            <a
              key={id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="inline-flex h-8 min-w-0 items-center justify-center gap-1.5 border-2 border-ink bg-white px-1.5 font-display text-[9px] font-black uppercase shadow-[4px_4px_0_#11110f] transition hover:-translate-y-0.5 sm:h-9 sm:px-2 sm:text-[10px] lg:h-10 lg:gap-2 lg:px-3 lg:text-xs lg:shadow-hard"
            >
              <span
                className={`hidden h-5 w-5 shrink-0 items-center justify-center border-2 border-ink sm:flex lg:h-6 lg:w-6 ${tone}`}
              >
                <Icon className="h-3 w-3 lg:h-3.5 lg:w-3.5" aria-hidden />
              </span>
              <span className="truncate">{label}</span>
              <ExternalLink className="hidden h-3 w-3 shrink-0 sm:block lg:h-3.5 lg:w-3.5" aria-hidden />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
