import { NextResponse } from "next/server";
import { DAILY_CREDIT_LIMIT } from "@/lib/credits";
import { toAccountUser } from "@/lib/account";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isThemePreference } from "@/lib/theme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const signedOutState = {
  user: null,
  credits: { used: 0, total: DAILY_CREDIT_LIMIT, bonuses: 0 },
  downloadedIds: [] as string[],
  favoriteIds: [] as string[],
  theme: null as string | null
};

/**
 * Single source of truth for the signed-in user's session state. Replaces the
 * localStorage reads the client used to do for credits, history, and stash.
 */
export async function GET() {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(signedOutState);
  }

  // Verified against the cached JWKS rather than a round trip to the auth
  // server, which keeps this route off the header critical path.
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData ? toAccountUser(claimsData.claims) : null;

  if (!user) {
    return NextResponse.json(signedOutState);
  }

  const [creditResult, downloadResult, favoriteResult, profileResult] = await Promise.all([
    supabase.rpc("get_credit_state"),
    supabase.from("downloads").select("sound_id"),
    supabase.from("favorites").select("sound_id"),
    supabase.from("profiles").select("theme").eq("id", user.id).maybeSingle()
  ]);

  const credits = (creditResult.data as { used: number; total: number; bonuses: number } | null) ?? {
    used: 0,
    total: DAILY_CREDIT_LIMIT,
    bonuses: 0
  };

  return NextResponse.json({
    user,
    credits: {
      used: Number(credits.used) || 0,
      total: Number(credits.total) || DAILY_CREDIT_LIMIT,
      bonuses: Number(credits.bonuses) || 0
    },
    downloadedIds: (downloadResult.data ?? []).map((row) => row.sound_id as string),
    favoriteIds: (favoriteResult.data ?? []).map((row) => row.sound_id as string),
    // null means the account has never chosen one, so the browser's own choice wins.
    theme: isThemePreference(profileResult.data?.theme) ? profileResult.data.theme : null
  });
}

/** Stores the chosen theme on the profile so it follows the account to any
 *  other device or browser they sign in from. */
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Accounts are unavailable." }, { status: 503 });
  }

  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData ? toAccountUser(claimsData.claims) : null;

  if (!user) {
    return NextResponse.json({ error: "Sign in to save a theme." }, { status: 401 });
  }

  let theme: unknown;

  try {
    ({ theme } = (await request.json()) as { theme?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isThemePreference(theme)) {
    return NextResponse.json({ error: "Theme must be 'light' or 'dark'." }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update({ theme }).eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Could not save the theme." }, { status: 500 });
  }

  return NextResponse.json({ theme });
}
