import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

import { getSupabaseClientEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

// @supabase/ssr ka `cookies` option union type hai, is liye setAll ke parameters
// explicitly type karne parte hain (warna implicit any error aata hai).
type CookieToSet = { name: string; value: string; options?: CookieOptions };

export interface SessionRefreshResult {
  /** Wo response jis par refreshed auth cookies lag chuki hain. */
  response: NextResponse;
  /** Verified user (getUser se), ya null. Sirf UX redirects ke liye. */
  user: User | null;
}

// Middleware helper: har request par auth session ko refresh karta hai (token rotation).
// YAHAN koi authorization decision nahi hoti - sirf cookie/session refresh.
// Asli access control hamesha DB RLS + server components ke guards me hoti hai.
//
// requestHeaders optional hai: root middleware isme CSP nonce (x-nonce +
// Content-Security-Policy) daal kar bhejta hai taake Next apne framework scripts
// par wahi nonce laga sake. Yahan hum in headers ko har NextResponse.next() me
// aage carry karte hain warna nonce request tak nahi pohnchta.
export async function updateSession(
  request: NextRequest,
  requestHeaders?: Headers,
): Promise<SessionRefreshResult> {
  const nextInit = requestHeaders
    ? { request: { headers: requestHeaders } }
    : { request };
  let response = NextResponse.next(nextInit);

  const { url, anonKey } = getSupabaseClientEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next(nextInit);
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() call zaroori hai - yeh expired token ko refresh karta hai, aur
  // cookie ke bajaye Supabase se verify karwa kar user deta hai.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
