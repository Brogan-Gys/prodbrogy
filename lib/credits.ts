export const DAILY_CREDIT_LIMIT = 20;
export const SOCIAL_CREDIT_BONUS = 5;
export const CREDIT_STORAGE_KEY = "prodbrogy-daily-credits";
export const CATEGORY_CREDIT_COSTS: Record<string, number> = {
  midi: 0.5,
  loops: 1,
  phrases: 0.5,
  oneshots: 0.5,
  starters: 1
};

export type CreditState = {
  date: string;
  used: number;
  claimedSocialBonuses?: string[];
};

export function getTodayKey() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

export function getDefaultCreditState(): CreditState {
  return {
    date: getTodayKey(),
    used: 0,
    claimedSocialBonuses: []
  };
}

export function normalizeCreditState(state: CreditState | null): CreditState {
  const today = getTodayKey();

  if (!state || state.date !== today) {
    return getDefaultCreditState();
  }

  return {
    date: today,
    used: Number.isFinite(state.used) ? state.used : 0,
    claimedSocialBonuses: Array.isArray(state.claimedSocialBonuses)
      ? state.claimedSocialBonuses.filter((id) => typeof id === "string")
      : []
  };
}

export function getSocialBonusCredits(state: CreditState) {
  return (state.claimedSocialBonuses?.length ?? 0) * SOCIAL_CREDIT_BONUS;
}

export function getDailyCreditTotal(state: CreditState) {
  return DAILY_CREDIT_LIMIT + getSocialBonusCredits(state);
}

export function getCategoryCreditCost(category: string, fallback = 1) {
  return CATEGORY_CREDIT_COSTS[category] ?? fallback;
}
