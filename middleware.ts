import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

export async function middleware(request: NextRequest) {
  if (!hasSupabaseConfig) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  // Refreshes an expired session and writes the rotated cookies onto the
  // response. Without this, sessions silently expire on the server.
  try {
    const getUserPromise = supabase.auth.getUser();
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("supabase middleware timeout")), 2500)
    );
    await Promise.race([getUserPromise, timeout]);
  } catch (err) {
    // Don't block the request if Supabase is slow/unreachable.
    // Proceed with the response so routing/middleware doesn't time out.
    // (Logs may not appear in all Edge environments.)
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets, image files, and the Sanity studio,
     * which manages its own auth.
     */
    "/((?!_next/static|_next/image|studio|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|zip)$).*)"
  ]
};
