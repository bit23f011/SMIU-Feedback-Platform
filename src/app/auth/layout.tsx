import * as React from "react";

import Link from "next/link";

import { ProfAuraLogo } from "@/components/brand/profaura-logo";
import { SITE } from "@/lib/constants";

/*
  Auth area ka shell (/auth/login, /auth/signup).

  Site header/footer jaan boojh kar nahi hai: auth screen ek focused kaam hai,
  navigation wahan distraction banti hai. Sirf brand (home ka raasta) aur ek
  patli footer line rakhi hai.

  NOTE (security): yeh sirf layout hai. Asli authentication, session, aur
  verification Phase 2 me - aur uska enforcement hamesha server/Supabase par
  hoga, is layout par nahi.
*/
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b border-border bg-background">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ProfAuraLogo size="sm" />
            <span className="sr-only">{SITE.name} home</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-ink-600 transition-colors duration-150 ease-out hover:text-foreground"
          >
            Back to site
          </Link>
        </div>
      </header>

      {/*
        py-8 (pehle py-12 sm:py-16). Sign in ka card chhota hai, is liye itni
        vertical padding se page bewajah scroll karta tha. Ab content fit hone
        par scroll nahi hota, magar spacing tang bhi nahi lagti.
      */}
      <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="border-t border-border bg-background py-4">
        <p className="container text-center text-xs text-muted-foreground">
          {SITE.university.line}
        </p>
      </footer>
    </div>
  );
}
