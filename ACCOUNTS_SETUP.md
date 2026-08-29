# Accounts setup

Accounts are optional: with no Supabase env vars set, the site still builds and
runs, previews still work, and the credit meter shows a "sign in" prompt instead
of a balance. Downloads are the one thing that require an account.

## 1. Create the Supabase project

1. Go to <https://supabase.com/dashboard> and create a new project.
2. Wait for it to finish provisioning (a minute or two).

## 2. Run the schema

Open **SQL Editor → New query**, paste the entire contents of
[`supabase/schema.sql`](supabase/schema.sql), and run it. It is idempotent, so
you can re-run it safely after any future change.

This creates:

| Object | What it does |
| --- | --- |
| `profiles` | One row per account, auto-created by a trigger on signup |
| `downloads` | Download history **and** the credit ledger, in one table |
| `favorites` | The stash |
| `social_bonus_claims` | Extra daily credits per claimed social link |
| `spend_credits_for_download()` | Atomic credit check + spend |
| `get_credit_state()` | The signed-in user's balance |
| `sound_stats` | Public per-sound download and stash counts |

## 3. Turn on the sign-in methods

**Email + password** — Authentication → Providers → Email. It is on by default.
Leave "Confirm email" enabled unless you want instant signups.

**Google** — Authentication → Providers → Google. You need a Google OAuth client
from <https://console.cloud.google.com/apis/credentials>:

- Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
- Paste the client ID and secret into Supabase.

Then under Authentication → URL Configuration, add your site URL and
`https://prodbrogysoundsupply.com/auth/callback` to the redirect allow list
(plus `http://localhost:3000/auth/callback` for local dev).

## 4. Set the environment variables

From Project Settings → API:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

Add all three in Vercel (Project → Settings → Environment Variables) and to your
local `.env.local`.

> The service role key bypasses row level security. It is only read in
> `/api/admin/accounts`, never sent to the browser. Do not prefix it with
> `NEXT_PUBLIC_`.

## 5. Admin views

`/admin/accounts` lists everyone who signed up, with their download count,
stash count, credits spent, and last download, plus a ranked table of which
sounds are pulling. It is gated by the same `ADMIN_UPLOAD_PASSWORD` as
`/admin/upload`.

## How credits work now

Previously the daily limit lived in `localStorage`, so clearing site data or
opening a private tab reset it — the limit was decorative. Now:

- The client sends only a **sound id** to `/api/download`. Price and file URL are
  resolved server-side from Sanity, so neither can be tampered with.
- `spend_credits_for_download()` checks the balance and writes the ledger row in
  a single transaction, with a row lock, so two concurrent requests cannot both
  pass the check.
- `downloads` has **no INSERT policy**. The RPC is the only way to add a row, so
  a client cannot grant itself free downloads even with a valid session.
- Re-downloading something you already own is free, via the
  `unique (user_id, sound_id)` constraint.

**Credits now reset at 00:00 UTC**, not local midnight. The old localStorage
version used the visitor's local date. If you want a different reset timezone,
change `credit_day_start()` in the schema.

Keep `daily_credit_limit()` and `social_credit_bonus()` in the schema in sync
with `DAILY_CREDIT_LIMIT` and `SOCIAL_CREDIT_BONUS` in `lib/credits.ts`.

## Not carried over

Existing visitors' `localStorage` download history and stash are **not** migrated
into their new account — there is no reliable way to tie anonymous local state to
a person who has not signed in yet. Their first signed-in session starts with an
empty history and a full credit balance.
