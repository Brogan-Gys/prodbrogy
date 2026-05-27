"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

export function SubmissionCallout() {
  const [isOpen, setIsOpen] = useState(false);
  const [isNearFiles, setIsNearFiles] = useState(false);

  useEffect(() => {
    const filesSection = document.getElementById("sound-files");

    if (!filesSection) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsNearFiles(entry.isIntersecting);

        if (!entry.isIntersecting) {
          setIsOpen(false);
        }
      },
      {
        rootMargin: "-18% 0px -18% 0px",
        threshold: 0.05
      }
    );

    observer.observe(filesSection);

    return () => observer.disconnect();
  }, []);

  return (
    <aside
      className={`fixed bottom-4 right-3 z-40 transition duration-300 sm:bottom-6 sm:right-6 ${
        isNearFiles ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      {isOpen ? (
        <div className="relative w-[min(calc(100vw-24px),340px)] border-2 border-ink bg-ink p-3 text-bone shadow-[6px_6px_0_#ffffff]">
          <span className="absolute -right-2 bottom-7 h-4 w-4 rotate-45 border-r-2 border-t-2 border-ink bg-ink" aria-hidden />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-xs font-black uppercase text-bone/65">Made something?</p>
              <p className="font-display text-2xl font-black uppercase leading-none">Send it back</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-bone bg-ink text-bone transition hover:-translate-y-0.5"
              aria-label="Close submission bubble"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <p className="mt-2 text-sm font-semibold leading-5 text-bone/75">
            Made a beat or melody with a sound? Send it on Telegram.
          </p>

          <a
            href="https://t.me/prodbrogy"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 border-2 border-bone bg-volt px-3 font-display text-xs font-black uppercase text-ink transition hover:-translate-y-0.5"
          >
            <Send className="h-4 w-4" aria-hidden />
            Message on Telegram
          </a>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-ink bg-volt px-4 font-display text-xs font-black uppercase text-ink shadow-hard transition hover:-translate-y-0.5"
          aria-label="Open submission bubble"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          Send it back
        </button>
      )}
    </aside>
  );
}
