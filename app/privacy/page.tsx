import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Prodbrogy Sound Supply collects when you make an account, and what happens to it.",
  alternates: {
    canonical: "/privacy"
  }
};

const LAST_UPDATED = "29 August 2026";

export default function PrivacyPage() {
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

        <h1 className="mt-6 font-display text-3xl font-black uppercase leading-none sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-xs font-bold uppercase text-ink/55">Last updated {LAST_UPDATED}</p>

        <div className="mt-6 space-y-6 border-2 border-ink bg-white p-5 text-sm leading-6 shadow-hard sm:p-7 sm:text-base">
          <p className="border-2 border-ink bg-coral px-3 py-2 font-bold">
            Short version: you can browse and preview everything without an account. Making an account stores your email
            and what you have downloaded, so your daily credits and stash work. Nothing is sold or shared with
            advertisers.
          </p>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">Who runs this site</p>
            <p className="mt-2">
              Prodbrogy Sound Supply is run by an individual producer (@prodbrogy). For any privacy question, or to have
              your account and data deleted, email <a className="underline underline-offset-2" href="mailto:prodbrogy@gmail.com">prodbrogy@gmail.com</a>.
            </p>
          </div>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">What is collected</p>
            <ul className="mt-2 space-y-1.5">
              <li>
                <span className="font-bold">Browsing without an account</span> &mdash; nothing that identifies you. No
                account, no tracking or advertising cookies.
              </li>
              <li>
                <span className="font-bold">When you sign up with email</span> &mdash; your email address and a
                display name derived from it.
              </li>
              <li>
                <span className="font-bold">When you sign in with Google</span> &mdash; your email address and your
                Google profile name. Nothing else from your Google account is requested, and your Google password is
                never seen by this site.
              </li>
              <li>
                <span className="font-bold">While using your account</span> &mdash; which sounds you download, which
                ones you stash, the daily credits you have spent, and any social bonus you have claimed.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">Why it is collected</p>
            <p className="mt-2">
              Only to run the site: to sign you in, to enforce the daily download credit limit fairly, to keep your
              download history and stash available across devices, and to see in aggregate which sounds are popular.
              There is no advertising, profiling, or automated decision-making.
            </p>
          </div>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">Who it is shared with</p>
            <p className="mt-2">
              Your data is never sold, rented, or shared for advertising. It is stored with the services that run the
              site:
            </p>
            <ul className="mt-2 space-y-1.5">
              <li>
                <span className="font-bold">Supabase</span> &mdash; accounts, sign-in, and the download/stash database.
              </li>
              <li>
                <span className="font-bold">Vercel</span> &mdash; hosting, including standard server request logs.
              </li>
              <li>
                <span className="font-bold">Cloudflare R2</span> &mdash; storage and delivery of the audio files.
              </li>
              <li>
                <span className="font-bold">Sanity</span> &mdash; the sound catalogue itself. It holds no personal data.
              </li>
            </ul>
            <p className="mt-2">
              Information may also be disclosed if legally required.
            </p>
          </div>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">Cookies</p>
            <p className="mt-2">
              Only the sign-in session cookie set by Supabase, which is what keeps you logged in. There are no
              analytics, advertising, or third-party tracking cookies. Clearing it signs you out.
            </p>
          </div>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">How long it is kept</p>
            <p className="mt-2">
              Your account data is kept for as long as the account exists. Delete the account and the profile, download
              history, stash, and credit records go with it.
            </p>
          </div>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">Your rights</p>
            <p className="mt-2">
              You can ask for a copy of your data, ask for it to be corrected, or ask for the whole account to be
              deleted. Email <a className="underline underline-offset-2" href="mailto:prodbrogy@gmail.com">prodbrogy@gmail.com</a> and
              it will be handled. Depending on where you live you may also have the right to complain to your local
              data protection authority.
            </p>
          </div>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">Children</p>
            <p className="mt-2">
              This site is not aimed at children under 13, and accounts are not knowingly created for them.
            </p>
          </div>

          <div>
            <p className="font-display text-xs font-black uppercase text-ink/55">Changes</p>
            <p className="mt-2">
              If this policy changes, the date at the top changes with it.
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
