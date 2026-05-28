import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Instagram, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "License & Splits",
  description: "Usage terms and BeatStars splits for Prodbrogy Sound Supply sounds.",
  alternates: {
    canonical: "/license"
  }
};

const contactLinks = [
  { label: "Instagram", handle: "@prodbrogy", href: "https://instagram.com/prodbrogy", Icon: Instagram },
  { label: "Email", handle: "prodbrogy@gmail.com", href: "mailto:prodbrogy@gmail.com", Icon: Mail }
];

export default function LicensePage() {
  return (
    <main className="grain min-h-screen bg-bone text-ink">
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 border-2 border-ink bg-white px-3 py-2 font-display text-[11px] font-black uppercase shadow-hard transition hover:-translate-y-0.5"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to sounds
        </Link>

        <h1 className="mt-6 font-display text-3xl font-black uppercase leading-none sm:text-4xl">License &amp; Splits</h1>

        <div className="mt-6 space-y-6 border-2 border-ink bg-white p-5 text-sm leading-6 shadow-hard sm:p-7 sm:text-base">
          <p className="border-2 border-ink bg-coral px-3 py-2 font-bold">
            These sounds are <span className="uppercase">not royalty-free.</span> Any placement &mdash; indie or major &mdash; I
            (@prodbrogy) need to be informed first. Reach me through the contacts below.
          </p>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">BeatStars splits</p>
            <ul className="mt-2 space-y-1.5">
              <li>
                <span className="font-bold">Loop made by just me</span> &mdash; 50% you &amp; 50% me.
              </li>
              <li>
                <span className="font-bold">Melody made by multiple people</span> &mdash; split equally between everyone
                involved (e.g. 3 contributors = 33.33% each).
              </li>
              <li>
                <span className="font-bold">MIDI</span> &mdash; also gets split with me, same as above.
              </li>
            </ul>
          </div>

          <p className="font-semibold">Thank you for grabbing these sounds :)</p>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">Contact</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {contactLinks.map(({ label, handle, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border-2 border-ink bg-bone px-3 py-2 font-display text-[11px] font-black uppercase transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    {label}: <span className="normal-case">{handle}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
