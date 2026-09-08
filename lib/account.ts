import type { ThemePreference } from "@/lib/theme";

export type AccountUser = {
  id: string;
  email?: string | null;
  name: string;
};

export type AccountCredits = {
  used: number;
  total: number;
  bonuses: number;
};

export type AccountState = {
  user: AccountUser | null;
  credits: AccountCredits;
  downloadedIds: string[];
  favoriteIds: string[];
  /** Theme saved on the profile, or null when the account never chose one. */
  theme: ThemePreference | null;
};

export const ACCOUNT_CHANGED_EVENT = "account:changed";

export const signedOutAccount: AccountState = {
  user: null,
  credits: { used: 0, total: 0, bonuses: 0 },
  downloadedIds: [],
  favoriteIds: [],
  theme: null
};

export async function fetchAccountState(): Promise<AccountState> {
  const response = await fetch("/api/account", { cache: "no-store" });

  if (!response.ok) {
    return signedOutAccount;
  }

  return (await response.json()) as AccountState;
}

/** Lets any component tell the rest of the page to re-read account state. */
export function announceAccountChange() {
  window.dispatchEvent(new Event(ACCOUNT_CHANGED_EVENT));
}
