export const DAILY_CREDIT_LIMIT = 12;
export const CREDIT_STORAGE_KEY = "prodbrogy-daily-credits";

export type CreditState = {
  date: string;
  used: number;
};

export function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getDefaultCreditState(): CreditState {
  return {
    date: getTodayKey(),
    used: 0
  };
}

export function normalizeCreditState(state: CreditState | null): CreditState {
  const today = getTodayKey();

  if (!state || state.date !== today) {
    return {
      date: today,
      used: 0
    };
  }

  return state;
}
