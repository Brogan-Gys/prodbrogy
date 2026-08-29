import { NextResponse } from "next/server";
import { DAILY_CREDIT_LIMIT } from "@/lib/credits";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const signedOutState = {
  user: null,
  credits: { used: 0, total: DAILY_CREDIT_LIMIT, bonuses: 0 },
  downloadedIds: [] as string[],
  favoriteIds: [] as string[]
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

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(signedOutState);
  }

  const [creditResult, downloadResult, favoriteResult] = await Promise.all([
    supabase.rpc("get_credit_state"),
    supabase.from("downloads").select("sound_id"),
    supabase.from("favorites").select("sound_id")
  ]);

  const credits = (creditResult.data as { used: number; total: number; bonuses: number } | null) ?? {
    used: 0,
    total: DAILY_CREDIT_LIMIT,
    bonuses: 0
  };

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name:
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email?.split("@")[0] ||
        "Producer"
    },
    credits: {
      used: Number(credits.used) || 0,
      total: Number(credits.total) || DAILY_CREDIT_LIMIT,
      bonuses: Number(credits.bonuses) || 0
    },
    downloadedIds: (downloadResult.data ?? []).map((row) => row.sound_id as string),
    favoriteIds: (favoriteResult.data ?? []).map((row) => row.sound_id as string)
  });
}
