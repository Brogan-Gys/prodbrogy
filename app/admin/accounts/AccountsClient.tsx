"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, Heart, Loader2, Users } from "lucide-react";

type AccountRow = {
  id: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  downloadCount: number;
  favoriteCount: number;
  creditsSpent: number;
  lastDownloadAt: string | null;
};

type SoundStat = {
  soundId: string;
  downloadCount: number;
  favoriteCount: number;
};

type Totals = {
  accounts: number;
  downloads: number;
  favorites: number;
};

type SoundLookup = Record<string, string>;

function formatDate(value: string | null) {
  if (!value) {
    return "--";
  }

  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function AccountsClient() {
  const [password, setPassword] = useState("");
  const [accounts, setAccounts] = useState<AccountRow[] | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [soundStats, setSoundStats] = useState<SoundStat[]>([]);
  const [soundTitles, setSoundTitles] = useState<SoundLookup>({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const [accountResponse, statsResponse, soundsResponse] = await Promise.all([
        fetch("/api/admin/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password })
        }),
        fetch("/api/sound-stats", { cache: "no-store" }),
        fetch("/api/sounds", { cache: "no-store" })
      ]);

      const payload = (await accountResponse.json()) as { accounts?: AccountRow[]; totals?: Totals; error?: string };

      if (!accountResponse.ok) {
        setError(payload.error || "Could not load accounts.");
        setAccounts(null);
        return;
      }

      setAccounts(payload.accounts ?? []);
      setTotals(payload.totals ?? null);

      const statsPayload = (await statsResponse.json()) as { stats?: SoundStat[] };
      setSoundStats(statsPayload.stats ?? []);

      const soundsPayload = (await soundsResponse.json()) as { sounds?: { id: string; title: string }[] };
      setSoundTitles(
        Object.fromEntries((soundsPayload.sounds ?? []).map((sound) => [sound.id, sound.title])) as SoundLookup
      );
    } catch {
      setError("Could not reach the server.");
    } finally {
      setIsLoading(false);
    }
  };

  const rankedSounds = useMemo(
    () =>
      [...soundStats]
        .sort((a, b) => b.downloadCount - a.downloadCount || b.favoriteCount - a.favoriteCount)
        .slice(0, 25),
    [soundStats]
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-black uppercase leading-none sm:text-5xl">Accounts</h1>
      <p className="mt-2 font-semibold text-ink/60">Who signed up, and what the library is actually pulling.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex max-w-md gap-2">
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Admin password"
          className="input"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex h-12 shrink-0 items-center gap-2 border-2 border-ink bg-ink px-4 font-display text-sm font-black uppercase text-bone shadow-hard transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Load
        </button>
      </form>

      {error ? <p className="mt-4 border-2 border-ink bg-coral text-stamp p-3 font-bold">{error}</p> : null}

      {totals ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="border-2 border-ink bg-white p-4 shadow-hard">
            <Users className="h-5 w-5" aria-hidden />
            <p className="mt-2 font-display text-3xl font-black">{totals.accounts}</p>
            <p className="font-display text-xs font-black uppercase text-ink/55">Accounts</p>
          </div>
          <div className="border-2 border-ink bg-white p-4 shadow-hard">
            <ArrowDownToLine className="h-5 w-5" aria-hidden />
            <p className="mt-2 font-display text-3xl font-black">{totals.downloads}</p>
            <p className="font-display text-xs font-black uppercase text-ink/55">Downloads</p>
          </div>
          <div className="border-2 border-ink bg-white p-4 shadow-hard">
            <Heart className="h-5 w-5" aria-hidden />
            <p className="mt-2 font-display text-3xl font-black">{totals.favorites}</p>
            <p className="font-display text-xs font-black uppercase text-ink/55">Stashed</p>
          </div>
        </div>
      ) : null}

      {accounts ? (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-black uppercase">People</h2>
          <div className="mt-3 overflow-x-auto border-2 border-ink bg-white shadow-hard">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b-2 border-ink font-display text-xs font-black uppercase">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Joined</th>
                  <th className="p-3">Downloads</th>
                  <th className="p-3">Stashed</th>
                  <th className="p-3">Credits spent</th>
                  <th className="p-3">Last download</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 font-semibold text-ink/60">
                      Nobody has signed up yet.
                    </td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id} className="border-b border-ink/15 last:border-b-0">
                      <td className="p-3 font-bold">{account.displayName || "--"}</td>
                      <td className="p-3">{account.email || "--"}</td>
                      <td className="p-3">{formatDate(account.createdAt)}</td>
                      <td className="p-3 font-bold">{account.downloadCount}</td>
                      <td className="p-3">{account.favoriteCount}</td>
                      <td className="p-3">{account.creditsSpent}</td>
                      <td className="p-3">{formatDate(account.lastDownloadAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {accounts ? (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-black uppercase">Top sounds</h2>
          <div className="mt-3 overflow-x-auto border-2 border-ink bg-white shadow-hard">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b-2 border-ink font-display text-xs font-black uppercase">
                <tr>
                  <th className="p-3">Sound</th>
                  <th className="p-3">Downloads</th>
                  <th className="p-3">Stashed</th>
                </tr>
              </thead>
              <tbody>
                {rankedSounds.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 font-semibold text-ink/60">
                      No downloads or stashes recorded yet.
                    </td>
                  </tr>
                ) : (
                  rankedSounds.map((stat) => (
                    <tr key={stat.soundId} className="border-b border-ink/15 last:border-b-0">
                      <td className="p-3 font-bold">{soundTitles[stat.soundId] || stat.soundId}</td>
                      <td className="p-3">{stat.downloadCount}</td>
                      <td className="p-3">{stat.favoriteCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}
