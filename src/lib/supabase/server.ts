import { cookies } from "next/headers";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClientEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/*
  TYPING NOTE (important, warna sab kuch `never` ho jata hai):
  installed @supabase/ssr apna client `SupabaseClient<Database, SchemaName, Schema>`
  ke purane generic order se banata hai, jabke naye supabase-js me order
  `<Database, SchemaNameOrClientOptions, SchemaName, Schema, ClientOptions>` hai.
  Is mismatch ki wajah se `Schema` never ban jata hai aur har query ka result
  `never` aata hai. Neeche hum client ko sahi shakal me wapas type kar dete hain.
  Yeh sirf TYPES ka masla hai - runtime behaviour bilkul same rehta hai.
*/
export type TypedSupabaseClient = SupabaseClient<Database, "public">;

// @supabase/ssr ka `cookies` option ek union type hai (browser | server), is wajah se
// TypeScript setAll ke parameters khud infer nahi kar pata. Isliye shape yahan likhi hai.
type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Server-side Supabase client (Server Components, Route Handlers, Server Actions).
// Cookies se auth session read/write hoti hai. anon key hi use hoti hai -
// RLS is client ko user ke permissions tak seemit rakhti hai.
export function createSupabaseServerClient(): TypedSupabaseClient {
  const cookieStore = cookies();
  const { url, anonKey } = getSupabaseClientEnv();

  const client = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component se cookie set call throw karti hai - yeh safe ignore hai
          // kyunki session refresh middleware me hota hai.
        }
      },
    },
  });

  return client as unknown as TypedSupabaseClient;
}
