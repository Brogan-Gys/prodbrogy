import { Send } from "lucide-react";

export function SubmissionCallout() {
  return (
    <section className="grid gap-3 border-2 border-ink bg-ink p-4 text-bone shadow-hard md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <p className="font-display text-sm font-black uppercase text-bone/65">Made something?</p>
        <h2 className="font-display text-3xl font-black uppercase leading-none">Send it back</h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-bone/75">
          Made a beat or melody with a sound? Send it on Telegram.
        </p>
      </div>

      <a
        href="https://t.me/prodbrogy"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-12 items-center justify-center gap-2 border-2 border-bone bg-volt px-4 font-display text-sm font-black uppercase text-ink shadow-hard transition hover:-translate-y-0.5"
      >
        <Send className="h-4 w-4" aria-hidden />
        Message on Telegram
      </a>
    </section>
  );
}
