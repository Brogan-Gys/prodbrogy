import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Email confirmation landing point.
 *
 * Supabase's default confirmation link returns the session in a URL *fragment*,
 * which browsers never send to the server — so a server-rendered app cannot see
 * it and the visitor lands signed out. Instead the email template points here
 * with a token hash, which we verify server-side and turn into a session cookie.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") || "/";
  // Same-site redirects only, so `next` cannot be used as an open redirect.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/?auth_error=missing_token`);
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(`${origin}/?auth_error=not_configured`);
  }

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    return NextResponse.redirect(`${origin}/?auth_error=confirm_failed`);
  }

  return NextResponse.redirect(`${origin}${safeNext}?welcome=1`);
}
