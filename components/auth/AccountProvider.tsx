"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ACCOUNT_CHANGED_EVENT,
  fetchAccountState,
  signedOutAccount,
  toAccountUser,
  type AccountState,
  type AccountUser
} from "@/lib/account";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { applyThemePreference, isThemePreference, readThemePreference } from "@/lib/theme";

type AccountContextValue = AccountState & {
  /** Full account details (credits, history, stash) are still in flight. */
  isLoading: boolean;
  isSignedIn: boolean;
  refresh: () => Promise<void>;
  openSignIn: () => void;
  closeSignIn: () => void;
  isSignInOpen: boolean;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({
  children,
  initialUser
}: {
  children: ReactNode;
  /** Resolved from the request cookies on the server, so the header paints the
   *  right button in the HTML instead of waiting for hydration. */
  initialUser: AccountUser | null;
}) {
  const [state, setState] = useState<AccountState>(() => ({ ...signedOutAccount, user: initialUser }));
  const [isLoading, setIsLoading] = useState(true);
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
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isActive = true;

    // The server already resolved the user from the same cookie, so this only
    // catches the case where it changed since the HTML was rendered (an expired
    // session, or a sign-in in another tab while this page sat open).
    const applyLocalSession = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!isActive) {
        return;
      }

      setState((current) => ({ ...current, user: session ? toAccountUser(session.user) : null }));
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
      isSignedIn: Boolean(state.user),
      refresh,
      isSignInOpen,
      openSignIn: () => setIsSignInOpen(true),
      closeSignIn: () => setIsSignInOpen(false)
    }),
    [isLoading, isSignInOpen, refresh, state]
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
