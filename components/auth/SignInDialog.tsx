"use client";

import { useState } from "react";
import { Loader2, LogIn, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { announceAccountChange } from "@/lib/account";
import { useAccount } from "./AccountProvider";

type Mode = "signin" | "signup";

export function SignInDialog() {
  const { isSignInOpen, closeSignIn, refresh } = useAccount();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  if (!isSignInOpen) {
    return null;
  }

  const supabase = getSupabaseBrowserClient();

  const handleGoogle = async () => {
    if (!supabase) {
      setNotice("Accounts are not configured yet.");
      return;
    }

    setIsBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });

    if (error) {
      setNotice(error.message);
      setIsBusy(false);
    }
  };

  const handleEmail = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!supabase) {
      setNotice("Accounts are not configured yet.");
      return;
    }

    setIsBusy(true);
    setNotice("");

    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
          });

    setIsBusy(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    if (mode === "signup") {
      setNotice("Check your email to confirm your account.");
      return;
    }

    await refresh();
    announceAccountChange();
    closeSignIn();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 p-4">
      <div className="w-full max-w-md border-2 border-ink bg-bone p-4 shadow-hard sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-2xl font-black uppercase leading-none">
              {mode === "signin" ? "Sign in" : "Create account"}
            </p>
            <p className="mt-2 text-sm font-semibold text-ink/60">
              Your credits, downloads, and stash follow you across devices.
            </p>
          </div>
          <button
            type="button"
            onClick={closeSignIn}
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
          className="mb-4 flex h-12 w-full items-center justify-center gap-2 border-2 border-ink bg-white font-display text-sm font-black uppercase shadow-[4px_4px_0_#11110f] transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          <LogIn className="h-4 w-4" aria-hidden />
          Continue with Google
        </button>

        <div className="mb-4 flex items-center gap-3">
          <span className="h-0.5 flex-1 bg-ink/20" />
          <span className="font-display text-[11px] font-black uppercase text-ink/50">or email</span>
          <span className="h-0.5 flex-1 bg-ink/20" />
        </div>

        <form onSubmit={handleEmail} className="grid gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
            className="input"
          />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password (8+ characters)"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="input"
          />
          <button
            type="submit"
            disabled={isBusy}
            className="flex h-12 items-center justify-center gap-2 border-2 border-ink bg-ink font-display text-sm font-black uppercase text-bone shadow-[4px_4px_0_#3a342c] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {notice ? <p className="mt-3 text-sm font-bold text-ink/70">{notice}</p> : null}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setNotice("");
          }}
          className="mt-4 font-display text-[11px] font-black uppercase text-ink/60 underline"
        >
          {mode === "signin" ? "No account? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
