import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Toggle a sound in the signed-in user's stash. */
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Accounts are not configured." }, { status: 503 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to save sounds.", reason: "unauthenticated" }, { status: 401 });
  }

  let soundId: string | undefined;

  try {
    soundId = ((await request.json()) as { soundId?: string }).soundId;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!soundId) {
    return NextResponse.json({ error: "Missing sound id." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("favorites")
    .select("sound_id")
    .eq("sound_id", soundId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("favorites").delete().eq("sound_id", soundId);

    if (error) {
      return NextResponse.json({ error: "Could not update your stash." }, { status: 500 });
    }

    return NextResponse.json({ favorited: false });
  }

  const { error } = await supabase.from("favorites").insert({ user_id: user.id, sound_id: soundId });

  if (error) {
    return NextResponse.json({ error: "Could not update your stash." }, { status: 500 });
  }

  return NextResponse.json({ favorited: true });
}
