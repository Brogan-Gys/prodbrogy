"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ACCOUNT_CHANGED_EVENT,
  fetchAccountState,
  signedOutAccount,
  toAccountUser,
  type AccountState
} from "@/lib/account";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { applyThemePreference, isThemePreference, readThemePreference } from "@/lib/theme";

type AccountContextValue = AccountState & {
  /** Full account details (credits, history, stash) are still in flight. */
  isLoading: boolean;
  /** The header knows whether anyone is signed in. Settles before isLoading. */
  isUserResolved: boolean;
  isSignedIn: boolean;
  refresh: () => Promise<void>;
  openSignIn: () => void;
  closeSignIn: () => void;
  isSignInOpen: boolean;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccountState>(signedOutAccount);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserResolved, setIsUserResolved] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchAccountState();
      setState(next);

      // Signing in on a new device should bring the account's saved theme with
      // it; the local choice only wins when the profile has never stored one.
      if (isThemePreference(next.theme) && next.theme !== readThemePreference()) {
        applyThemePreference(next.theme);
      }
    } catch {
      setState(signedOutAccount);
    } finally {
      setIsUserResolved(true);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setIsUserResolved(true);
      setIsLoading(false);
      return;
    }

    let isActive = true;

    // The session lives in a cookie the browser already has, so this settles
    // without a network round trip and the header can paint the right button
    // immediately. /api/account then fills in credits, history, and stash.
    const applyLocalSession = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!isActive) {
        return;
      }

      setState((current) => ({ ...current, user: session ? toAccountUser(session.user) : null }));
      setIsUserResolved(true);
    };

    void applyLocalSession();
    void refresh();

    // Covers sign-in, sign-out, token refresh, and the same account changing
    // in another tab.
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!isActive || event === "INITIAL_SESSION") {
        return;
      }

      setState((current) => ({ ...current, user: session ? toAccountUser(session.user) : null }));
      setIsUserResolved(true);
      void refresh();
    });

    const handleChange = () => void refresh();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, handleChange);
    // Credits and history can change in another tab; resync when we regain focus.
    window.addEventListener("focus", handleChange);

    return () => {
      isActive = false;
      subscription.unsubscribe();
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, handleChange);
      window.removeEventListener("focus", handleChange);
    };
  }, [refresh]);

  const value = useMemo<AccountContextValue>(
    () => ({
      ...state,
      isLoading,
      isUserResolved,
      isSignedIn: Boolean(state.user),
      refresh,
      isSignInOpen,
      openSignIn: () => setIsSignInOpen(true),
      closeSignIn: () => setIsSignInOpen(false)
    }),
    [isLoading, isSignInOpen, isUserResolved, refresh, state]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const context = useContext(AccountContext);

  if (!context) {
    throw new Error("useAccount must be used inside an AccountProvider");
  }

  return context;
}
