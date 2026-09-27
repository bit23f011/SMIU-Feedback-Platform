import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/*
  Email confirmation callback.

  User apne inbox me jo link kholta hai, wo yahan aata hai. Supabase ek `code`
  deta hai jise session me badalna hota hai (PKCE exchange).

  SECURITY:
   - `next` param ko sirf apni site ke andar rehne diya jata hai (open redirect).
   - Nakaami par asli error kabhi URL me nahi daalte; sirf ek generic flag.
   - Yahan koi naya email nahi bhejta - product wada "sirf ek email" hai.
*/

function safeNextPath(value: string | null, fallback: string): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), "/student");

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/verify-email?status=invalid`);
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Link purana ho gaya ya pehle istemal ho chuka hai.
    return NextResponse.redirect(`${origin}/auth/verify-email?status=expired`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
