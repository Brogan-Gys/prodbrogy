import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * OAuth and email-confirmation landing point. Supabase redirects here with a
 * `code`, which we exchange for a session cookie before sending the visitor on.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("next") || "/";
  // Only allow same-site redirects, so `next` cannot be used as an open redirect.
  const safeRedirect = redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/?auth_error=missing_code`);
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(`${origin}/?auth_error=not_configured`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/?auth_error=exchange_failed`);
  }

  return NextResponse.redirect(`${origin}${safeRedirect}`);
}
