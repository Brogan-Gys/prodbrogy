import { ExternalLink } from "lucide-react";
import { socialLinks } from "@/lib/socials";

export function Footer() {
  return (
    <footer className="border-t-2 border-ink bg-bone px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-lg font-black uppercase leading-none">Prodbrogy</p>
          <p className="mt-1 text-xs font-bold uppercase text-ink/55">Sound supply</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {socialLinks.map(({ id, label, href, Icon, tone }) => (
            <a
              key={id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 border-2 border-ink bg-white px-3 font-display text-xs font-black uppercase shadow-hard transition hover:-translate-y-0.5"
            >
              <span className={`flex h-6 w-6 items-center justify-center border-2 border-ink ${tone}`}>
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              {label}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
