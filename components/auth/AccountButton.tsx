"use client";

import { useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { announceAccountChange } from "@/lib/account";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAccount } from "./AccountProvider";

export function AccountButton() {
  const { user, isLoading, openSignIn, refresh } = useAccount();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    setIsSigningOut(true);
    await supabase.auth.signOut();
    await refresh();
    announceAccountChange();
    setIsSigningOut(false);
  };

  if (isLoading) {
    return <span className="h-10 w-24 animate-pulse border-2 border-ink/20 bg-ink/5" aria-hidden />;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={openSignIn}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap border-2 border-ink bg-volt text-stamp px-3 font-display text-xs font-black uppercase transition hover:-translate-y-0.5"
      >
        <LogIn className="h-4 w-4" aria-hidden />
        Sign in
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[140px] truncate font-display text-xs font-black uppercase text-ink/70 sm:inline">
        {user.name}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap border-2 border-ink bg-white px-3 font-display text-xs font-black uppercase transition hover:-translate-y-0.5 disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}
