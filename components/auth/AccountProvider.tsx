"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ACCOUNT_CHANGED_EVENT,
  fetchAccountState,
  signedOutAccount,
  type AccountState
} from "@/lib/account";

type AccountContextValue = AccountState & {
  isLoading: boolean;
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
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setState(await fetchAccountState());
    } catch {
      setState(signedOutAccount);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const handleChange = () => void refresh();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, handleChange);
    // Credits and history can change in another tab; resync when we regain focus.
    window.addEventListener("focus", handleChange);

    return () => {
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
