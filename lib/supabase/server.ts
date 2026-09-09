import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { toAccountUser, type AccountUser } from "@/lib/account";
import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from "./config";

export async function getSupabaseServerClient() {
  if (!hasSupabaseConfig) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // middleware refreshes the session instead, so this is safe to skip.
        }
      }
    }
  });
}

export async function getCurrentUser() {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
}

/** The signed-in user in the display shape the header renders, resolved from
 *  the request cookies so the first paint is already correct. Verified against
 *  the cached JWKS, so it costs no round trip to the auth server. */
export async function getCurrentAccountUser(): Promise<AccountUser | null> {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  try {
    const { data } = await supabase.auth.getClaims();

    return data ? toAccountUser(data.claims) : null;
  } catch {
    // A slow or unreachable auth server must not hold up the page; the client
    // provider still settles this once it hydrates.
    return null;
  }
}
