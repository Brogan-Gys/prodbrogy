export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Accounts are optional infrastructure: the site still renders and previews
 * sounds without Supabase configured. Anything that spends credits checks this
 * first and fails closed with a clear message rather than crashing the page.
 */
export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
