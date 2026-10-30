// Public Supabase settings. Both are safe to ship to browsers (row-level security protects the data);
// env vars override them, the fallbacks keep deploys working if the host has none set.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fpubcjcqpsjnafnmkkzo.supabase.co";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_cEmaH2tiYsMN_WEFgehTBQ_ktnhYBje";
