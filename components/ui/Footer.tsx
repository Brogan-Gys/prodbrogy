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
              className="inline-flex h-9 items-center justify-center gap-2 border-2 border-ink bg-white px-2 font-display text-[10px] font-black uppercase shadow-hard transition hover:-translate-y-0.5 sm:h-10 sm:px-3 sm:text-xs"
            >
              <span className={`hidden h-6 w-6 items-center justify-center border-2 border-ink sm:flex ${tone}`}>
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span>{label}</span>
              <ExternalLink className="hidden h-3.5 w-3.5 sm:block" aria-hidden />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
