import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminPasswordValid } from "@/lib/server/adminUpload";
import { supabaseUrl } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type AccountRow = {
  id: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  downloadCount: number;
  favoriteCount: number;
  creditsSpent: number;
  lastDownloadAt: string | null;
};

/**
 * Admin-only roster of signed-up accounts with their activity totals.
 * Gated by the same ADMIN_UPLOAD_PASSWORD as the rest of /admin, and uses the
 * service role key so it can read across every user's rows.
 */
export async function POST(request: Request) {
  let password: string | undefined;

  try {
    password = ((await request.json()) as { password?: string }).password;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isAdminPasswordValid(password ?? null)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Set SUPABASE_SERVICE_ROLE_KEY to view accounts." },
      { status: 503 }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const [profileResult, downloadResult, favoriteResult] = await Promise.all([
    admin.from("profiles").select("id, email, display_name, created_at").order("created_at", { ascending: false }),
    admin.from("downloads").select("user_id, credits_spent, created_at"),
    admin.from("favorites").select("user_id")
  ]);

  if (profileResult.error) {
    return NextResponse.json({ error: profileResult.error.message }, { status: 500 });
  }

  const downloads = downloadResult.data ?? [];
  const favorites = favoriteResult.data ?? [];

  const accounts: AccountRow[] = (profileResult.data ?? []).map((profile) => {
    const userDownloads = downloads.filter((row) => row.user_id === profile.id);
    const lastDownloadAt = userDownloads
      .map((row) => row.created_at as string)
      .sort()
      .pop();

    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.display_name,
      createdAt: profile.created_at,
      downloadCount: userDownloads.length,
      favoriteCount: favorites.filter((row) => row.user_id === profile.id).length,
      creditsSpent: userDownloads.reduce((total, row) => total + Number(row.credits_spent ?? 0), 0),
      lastDownloadAt: lastDownloadAt ?? null
    };
  });

  return NextResponse.json({
    accounts,
    totals: {
      accounts: accounts.length,
      downloads: downloads.length,
      favorites: favorites.length
    }
  });
}
