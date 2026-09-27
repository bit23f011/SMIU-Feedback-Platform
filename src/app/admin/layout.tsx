import * as React from "react";

import Link from "next/link";

import { ProfAuraLogo } from "@/components/brand/profaura-logo";
import { Badge } from "@/components/ui/badge";
import { AdminNav } from "@/features/admin/admin-nav";
import { requireAdmin } from "@/features/auth/session";

/*
  Admin area ka shell - public site se alag chrome (apna topbar + sidebar),
  taake yeh galti se public page ki tarah na lage.

  SECURITY: `requireAdmin()` SERVER par chalta hai (layout server component hai).
  Non-admin ko "access denied" nahi, seedha home par bheja jata hai - admin area
  ka wujood hi zahir nahi karte.

  Admin role sirf DB me set hota hai. `profiles` par koi update grant/policy nahi
  hai, is liye koi user khud ko admin nahi bana sakta - chahe wo API seedha hit kare.
  Har admin WRITE aage chal kar RLS + SECURITY DEFINER functions se guzregi aur
  audit log me jayegi.
*/
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ProfAuraLogo size="sm" />
              <span className="sr-only">Admin dashboard</span>
            </Link>
            <Badge variant="accent">Admin</Badge>
          </div>
          <Link
            href="/"
            className="text-sm text-ink-600 transition-colors duration-150 ease-out hover:text-foreground"
          >
            Back to site
          </Link>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="border-b border-border bg-background px-4 py-3 md:w-60 md:shrink-0 md:border-b-0 md:border-r md:px-4 md:py-6">
          <AdminNav className="md:sticky md:top-24" />
        </aside>

        <main id="main-content" className="min-w-0 flex-1">
          <div className="px-4 py-8 sm:px-6 lg:px-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
