-- Prodbrogy accounts schema.
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Profiles: one row per signed-up account, mirrored from auth.users so the
-- admin view can read accounts without querying the auth schema directly.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  theme text,
  created_at timestamptz not null default now()
);

-- Added after the initial release: the chosen light/dark theme, so it follows
-- the account across devices instead of living only in one browser.
alter table public.profiles add column if not exists theme text;

alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles add constraint profiles_theme_check
  check (theme is null or theme in ('light', 'dark'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill anyone who signed up before this schema was applied.
insert into public.profiles (id, email, display_name, created_at)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(u.email, '@', 1)
  ),
  u.created_at
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Downloads: doubles as the download history AND the credit ledger. Credits
-- used today = sum(credits_spent) over rows created today, so the two can
-- never drift apart. The unique constraint is what makes re-downloading free.
-- ---------------------------------------------------------------------------
create table if not exists public.downloads (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  sound_id text not null,
  sound_title text,
  sound_category text,
  credits_spent numeric(5, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, sound_id)
);

create index if not exists downloads_user_created_idx on public.downloads (user_id, created_at desc);
create index if not exists downloads_sound_idx on public.downloads (sound_id);

-- ---------------------------------------------------------------------------
-- Favorites ("stash")
-- ---------------------------------------------------------------------------
create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  sound_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, sound_id)
);

create index if not exists favorites_sound_idx on public.favorites (sound_id);

-- ---------------------------------------------------------------------------
-- Social bonus claims: each claimed social link grants extra daily credits.
-- ---------------------------------------------------------------------------
create table if not exists public.social_bonus_claims (
  user_id uuid not null references auth.users (id) on delete cascade,
  bonus_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, bonus_id)
);

-- ---------------------------------------------------------------------------
-- Credit constants. These MUST stay in sync with lib/credits.ts.
-- ---------------------------------------------------------------------------
create or replace function public.daily_credit_limit()
returns numeric language sql immutable as $$ select 12::numeric $$;

create or replace function public.social_credit_bonus()
returns numeric language sql immutable as $$ select 2::numeric $$;

-- Start of the current credit day, in UTC.
create or replace function public.credit_day_start()
returns timestamptz language sql stable as $$
  select date_trunc('day', now() at time zone 'utc') at time zone 'utc'
$$;

-- ---------------------------------------------------------------------------
-- Credit balance for the calling user.
-- ---------------------------------------------------------------------------
create or replace function public.get_credit_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_used numeric;
  v_bonuses integer;
begin
  if v_user_id is null then
    return jsonb_build_object('used', 0, 'total', daily_credit_limit(), 'bonuses', 0);
  end if;

  select coalesce(sum(credits_spent), 0) into v_used
  from downloads
  where user_id = v_user_id and created_at >= credit_day_start();

  select count(*) into v_bonuses from social_bonus_claims where user_id = v_user_id;

  return jsonb_build_object(
    'used', v_used,
    'bonuses', v_bonuses,
    'total', daily_credit_limit() + (v_bonuses * social_credit_bonus())
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Atomic spend. Checks the balance and records the download in one
-- transaction so two concurrent requests cannot both pass the check.
-- ---------------------------------------------------------------------------
create or replace function public.spend_credits_for_download(
  p_sound_id text,
  p_title text,
  p_category text,
  p_credits numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_used numeric;
  v_bonuses integer;
  v_total numeric;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  -- Lock this user's ledger rows so a concurrent request cannot read a stale
  -- balance between the check below and the insert.
  perform 1 from downloads where user_id = v_user_id for update;

  if exists (select 1 from downloads where user_id = v_user_id and sound_id = p_sound_id) then
    return jsonb_build_object('ok', true, 'charged', 0, 'reason', 'already_owned');
  end if;

  select coalesce(sum(credits_spent), 0) into v_used
  from downloads
  where user_id = v_user_id and created_at >= credit_day_start();

  select count(*) into v_bonuses from social_bonus_claims where user_id = v_user_id;
  v_total := daily_credit_limit() + (v_bonuses * social_credit_bonus());

  if v_used + p_credits > v_total then
    return jsonb_build_object(
      'ok', false,
      'reason', 'insufficient_credits',
      'used', v_used,
      'total', v_total
    );
  end if;

  insert into downloads (user_id, sound_id, sound_title, sound_category, credits_spent)
  values (v_user_id, p_sound_id, p_title, p_category, p_credits);

  return jsonb_build_object(
    'ok', true,
    'charged', p_credits,
    'used', v_used + p_credits,
    'total', v_total
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Public per-sound counts. Aggregates only: no user identities are exposed.
-- ---------------------------------------------------------------------------
create or replace view public.sound_stats
with (security_invoker = off) as
select
  ids.sound_id,
  coalesce(d.download_count, 0)::bigint as download_count,
  coalesce(f.favorite_count, 0)::bigint as favorite_count
from (
  select sound_id from public.downloads
  union
  select sound_id from public.favorites
) ids
left join (
  select sound_id, count(*) as download_count from public.downloads group by sound_id
) d on d.sound_id = ids.sound_id
left join (
  select sound_id, count(*) as favorite_count from public.favorites group by sound_id
) f on f.sound_id = ids.sound_id;

grant select on public.sound_stats to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security. Every user sees only their own rows.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.downloads enable row level security;
alter table public.favorites enable row level security;
alter table public.social_bonus_claims enable row level security;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "own downloads read" on public.downloads;
create policy "own downloads read" on public.downloads
  for select using (auth.uid() = user_id);

drop policy if exists "own favorites read" on public.favorites;
create policy "own favorites read" on public.favorites
  for select using (auth.uid() = user_id);

drop policy if exists "own favorites write" on public.favorites;
create policy "own favorites write" on public.favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists "own favorites delete" on public.favorites;
create policy "own favorites delete" on public.favorites
  for delete using (auth.uid() = user_id);

drop policy if exists "own bonus read" on public.social_bonus_claims;
create policy "own bonus read" on public.social_bonus_claims
  for select using (auth.uid() = user_id);

drop policy if exists "own bonus write" on public.social_bonus_claims;
create policy "own bonus write" on public.social_bonus_claims
  for insert with check (auth.uid() = user_id);

-- Note: downloads deliberately has no INSERT policy. The only way to add a row
-- is spend_credits_for_download(), which enforces the credit limit. A client
-- cannot insert directly and grant itself free downloads.
