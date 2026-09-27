import { NextResponse, type NextRequest } from "next/server";

import { buildContentSecurityPolicy } from "@/lib/security/csp";
import { updateSession } from "@/lib/supabase/middleware";

/*
  Next.js middleware.

  DO kaam karta hai:
   1) Har matched request par ek naya CSP nonce banata hai aur usay request +
      response dono par set karta hai (details neeche).
   2) Har matched request par Supabase session refresh (token rotation).
   3) Signed-out user ko /student ya /admin par jane se pehle login bhej deta hai.

  Point 3 SIRF UX hai - "login page dekho, khali dashboard nahi". Yeh security
  NAHI hai aur na ise security samjha jaye:
   - middleware sirf role nahi, sirf "cookie hai ya nahi" dekhta hai (yahan
     DB query karna har request par mehnga aur nazuk hai),
   - asli gate do jagah hai: server layouts me requireStudent()/requireAdmin(),
     aur uske neeche Supabase RLS.

  Yani middleware hata bhi den to koi doosre ka data nahi dekh sakta.

  CSP nonce ka rasta:
   - x-nonce request header par jata hai taake Next framework scripts aur hamari
     ThemeScript wahi nonce le sakein (server render ke waqt read hota hai).
   - Content-Security-Policy(-Report-Only) response header par jata hai. Redirect
     response par bhi lagta hai taake koi bhi page nonce ke baghair na jaye.
*/

const PROTECTED_PREFIXES = ["/student", "/admin"] as const;

// Signed-in banda in auth pages par ruk kar kya karega.
const AUTH_ONLY_PATHS = ["/auth/login", "/auth/signup"] as const;

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  // Per-request nonce. crypto.randomUUID edge runtime me maujood hai; base64
  // isliye taake CSP token compact rahe.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildContentSecurityPolicy(nonce);

  // Modified request headers: Next inhe server render par forward karta hai, wahan
  // se ThemeScript/framework nonce uthate hain.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const { response, user } = await updateSession(request, requestHeaders);
  response.headers.set(csp.header, csp.value);

  const { pathname, search } = request.nextUrl;

  if (!user && isProtected(pathname)) {
    const loginUrl = new URL("/auth/login", request.url);
    // `next` me sirf apni site ka path jata hai (query ke saath), poora URL nahi.
    loginUrl.searchParams.set("next", `${pathname}${search}`);

    const redirectResponse = NextResponse.redirect(loginUrl);
    // Refresh hui cookies redirect par bhi saath le jao, warna session gir jata hai.
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    redirectResponse.headers.set(csp.header, csp.value);
    return redirectResponse;
  }

  if (user && AUTH_ONLY_PATHS.some((path) => pathname === path)) {
    const redirectResponse = NextResponse.redirect(new URL("/student", request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    redirectResponse.headers.set(csp.header, csp.value);
    return redirectResponse;
  }

  return response;
}

export const config = {
  // Static assets + image optimizer ko skip karo, baaki sab par chalo.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
