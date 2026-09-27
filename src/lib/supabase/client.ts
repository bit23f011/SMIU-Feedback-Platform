import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClientEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

// Browser (client component) Supabase client.
// Sirf anon key use hoti hai - koi secret nahi. Real authorization DB/RLS me hoti hai.
// Generic order ki wajah se cast zaroori hai - dekho server.ts ka TYPING NOTE.
export function createSupabaseBrowserClient(): SupabaseClient<Database, "public"> {
  const { url, anonKey } = getSupabaseClientEnv();
  return createBrowserClient<Database>(url, anonKey) as unknown as SupabaseClient<
    Database,
    "public"
  >;
}
