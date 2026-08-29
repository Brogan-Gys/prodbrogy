import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type SoundStat = {
  soundId: string;
  downloadCount: number;
  favoriteCount: number;
};

/**
 * Per-sound download and stash counts. The underlying view exposes aggregates
 * only, never who downloaded what, so this is safe to read publicly.
 */
export async function GET() {
  if (!hasSupabaseConfig) {
    return NextResponse.json({ stats: [] as SoundStat[] });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data, error } = await supabase
    .from("sound_stats")
    .select("sound_id, download_count, favorite_count");

  if (error) {
    return NextResponse.json({ stats: [] as SoundStat[] });
  }

  const stats: SoundStat[] = (data ?? []).map((row) => ({
    soundId: row.sound_id as string,
    downloadCount: Number(row.download_count) || 0,
    favoriteCount: Number(row.favorite_count) || 0
  }));

  return NextResponse.json({ stats });
}
