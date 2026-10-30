import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

// Supabase client for Client Components.
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
