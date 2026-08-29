import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using Prodbrogy Sound Supply, accounts, credits, and downloads.",
  alternates: {
    canonical: "/terms"
  }
};

const LAST_UPDATED = "29 August 2026";

export default function TermsPage() {
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

        <h1 className="mt-6 font-display text-3xl font-black uppercase leading-none sm:text-4xl">Terms of Service</h1>
        <p className="mt-2 text-xs font-bold uppercase text-ink/55">Last updated {LAST_UPDATED}</p>

        <div className="mt-6 space-y-6 border-2 border-ink bg-white p-5 text-sm leading-6 shadow-hard sm:p-7 sm:text-base">
          <p className="border-2 border-ink bg-coral px-3 py-2 font-bold">
            <span className="uppercase">Phrases and one shots are royalty-free. MIDI, starters, and loops are not.</span>{" "}
            How you may use each, and the splits owed on any placement, are set out on the{" "}
            <Link href="/license" className="underline underline-offset-2">
              License &amp; Splits
            </Link>{" "}
            page, which forms part of these terms.
          </p>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">The deal</p>
            <p className="mt-2">
              Prodbrogy Sound Supply is run by an individual producer (@prodbrogy). By using the site or making an
              account you agree to these terms. If you do not agree, do not use the site.
            </p>
          </div>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">Accounts</p>
            <ul className="mt-2 space-y-1.5">
              <li>You need an account to download. Browsing and previewing are open to everyone.</li>
              <li>Give a real email address and keep your login details to yourself.</li>
              <li>One account per person. Extra accounts made to farm credits will be removed.</li>
              <li>
                You can delete your account at any time by emailing{" "}
                <a className="underline underline-offset-2" href="mailto:prodbrogy@gmail.com">prodbrogy@gmail.com</a>.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">Credits and downloads</p>
            <ul className="mt-2 space-y-1.5">
              <li>Downloads cost credits. Your balance resets daily at 00:00 UTC.</li>
              <li>Re-downloading a sound you already own is free.</li>
              <li>Credits have no cash value, cannot be bought, sold, or transferred, and expire on reset.</li>
              <li>
                The credit limit, prices, and bonuses may change at any time, and the catalogue may be added to or
                pulled from without notice.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">Using the sounds</p>
            <p className="mt-2">
              You get a personal, non-exclusive, non-transferable right to use downloaded sounds in your own music, on
              the terms on the{" "}
              <Link href="/license" className="underline underline-offset-2">
                License &amp; Splits
              </Link>{" "}
              page. Phrases and one shots are royalty-free, so you can release with them freely. MIDI, starters, and
              loops require you to inform @prodbrogy before any placement and to agree the split. Ownership of the
              sounds stays with @prodbrogy in every case. Whatever the category, you may not:
            </p>
            <ul className="mt-2 space-y-1.5">
              <li>Resell, redistribute, or re-upload the files, on their own or in a pack.</li>
              <li>Claim them as your own sounds or register them with a content ID system.</li>
              <li>Use them to train a machine learning or AI model.</li>
            </ul>
          </div>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">Fair use of the site</p>
            <p className="mt-2">
              Do not scrape the site, hammer it with automated requests, share account credentials, or try to get around
              the credit system, the admin area, or any other technical limit. Doing any of that ends your access.
            </p>
          </div>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">No guarantees</p>
            <p className="mt-2">
              The site is provided as is. It is one person&apos;s project, so there is no promise that it stays online,
              that files stay available, or that anything is bug-free. To the extent the law allows, no liability is
              accepted for any loss arising from using the site or the sounds.
            </p>
          </div>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">Ending access</p>
            <p className="mt-2">
              Accounts that break these terms may be suspended or deleted without notice. You can stop using the site
              whenever you like.
            </p>
          </div>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">Privacy</p>
            <p className="mt-2">
              What is collected and why is explained in the{" "}
              <Link href="/privacy" className="underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">Changes</p>
            <p className="mt-2">
              These terms may be updated. The date at the top changes when they do, and continuing to use the site means
              you accept the update.
            </p>
          </div>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">Contact</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href="mailto:prodbrogy@gmail.com"
                className="inline-flex items-center gap-2 border-2 border-ink bg-bone px-3 py-2 font-display text-[11px] font-black uppercase transition hover:-translate-y-0.5 hover:bg-white"
              >
                <Mail className="h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Email: <span className="normal-case">prodbrogy@gmail.com</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
