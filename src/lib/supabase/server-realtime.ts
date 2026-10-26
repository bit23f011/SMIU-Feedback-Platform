import type { SupabaseClientOptions } from "@supabase/supabase-js";

// Supabase initialises Realtime even for REST-only clients. Node 20 needs an
// explicit transport; keeping this in server clients leaves the browser native.
export const serverRealtimeOptions: NonNullable<
  SupabaseClientOptions<"public">["realtime"]
> = { transport: require("ws") };
