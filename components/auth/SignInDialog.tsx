"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, LogIn, MailCheck, X } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  if (!isSignInOpen) {
    return null;
  }

  const supabase = getSupabaseBrowserClient();

  const handleClose = () => {
    setAwaitingConfirmation(false);
    setNotice("");
    closeSignIn();
  };

  // Dedicated screen after signup. The old version showed a one-line notice
  // under the form, which read as "nothing happened" and left people guessing.
  if (awaitingConfirmation) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 p-4">
        <div className="w-full max-w-md border-2 border-ink bg-bone p-4 shadow-hard sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <MailCheck className="h-6 w-6 shrink-0" aria-hidden />
              <p className="font-display text-2xl font-black uppercase leading-none">Check your email</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink bg-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <p className="text-sm font-semibold leading-6 text-ink/70">
            We sent a confirmation link to <span className="font-black text-ink">{email}</span>. Click it and you will
            come straight back here already signed in — no need to enter your password again.
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-ink/60">
            Nothing yet? Check your spam folder. The link expires in 24 hours.
          </p>

          <button
            type="button"
            onClick={handleClose}
            className="mt-5 h-12 w-full border-2 border-ink bg-ink font-display text-sm font-black uppercase text-bone shadow-[4px_4px_0_#3a342c] transition hover:-translate-y-0.5"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

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

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setIsBusy(false);

      if (error) {
        setNotice(error.message);
        return;
      }

      await refresh();
      announceAccountChange();
      closeSignIn();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` }
    });

    setIsBusy(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    // When email confirmation is turned off, signUp returns a live session and
    // the visitor is already signed in — no need to send them to their inbox.
    if (data.session) {
      await refresh();
      announceAccountChange();
      closeSignIn();
      return;
    }

    setAwaitingConfirmation(true);
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
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password (8+ characters)"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="input pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center border-2 border-ink bg-white text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
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
