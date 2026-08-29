"use client";

import { useState } from "react";
import { Loader2, LogIn, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAccount } from "./AccountProvider";

export function SignInDialog() {
  const { isSignInOpen, closeSignIn } = useAccount();
  const [notice, setNotice] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  if (!isSignInOpen) {
    return null;
  }

  const supabase = getSupabaseBrowserClient();

  const handleClose = () => {
    setNotice("");
    closeSignIn();
  };

  const handleGoogle = async () => {
    if (!supabase) {
      setNotice("Accounts are not configured yet.");
      return;
    }

    setIsBusy(true);
    setNotice("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });

    if (error) {
      setNotice(error.message);
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 p-4">
      <div className="w-full max-w-md border-2 border-ink bg-bone p-4 shadow-hard sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-2xl font-black uppercase leading-none">Sign in</p>
            <p className="mt-2 text-sm font-semibold text-ink/60">
              Your credits, downloads, and stash follow you across devices.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink bg-white"
            aria-label="Close sign in"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={isBusy}
          className="flex h-12 w-full items-center justify-center gap-2 border-2 border-ink bg-white font-display text-sm font-black uppercase shadow-[4px_4px_0_#11110f] transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogIn className="h-4 w-4" aria-hidden />}
          Continue with Google
        </button>

        <p className="mt-4 text-sm font-semibold leading-6 text-ink/60">
          Google is the only way in. No password to remember, and nothing but your email and name is shared.
        </p>

        {notice ? <p className="mt-3 text-sm font-bold text-ink/70">{notice}</p> : null}
      </div>
    </div>
  );
}
