import * as React from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { StudentNav } from "@/features/student/student-nav";
import { requireStudent } from "@/features/auth/session";

/*
  Student area ka shell (signed-in students ke liye).

  SECURITY: `requireStudent()` yahan SERVER par chalta hai. Layout ek server
  component hai, is liye yeh check browser me bypass nahi ho sakta. Wo teen
  cheezein dekhta hai: session mojood ho, email confirm ho chuka ho, aur profile
  active student ho. Koi bhi shart poori na ho to redirect.

  Phir bhi yeh AAKHRI boundary nahi hai. Asli boundary Supabase RLS hai: agar
  kisi din yeh layout badal bhi jaye, DB kisi doosre student ka data wapas nahi
  karegi. Layout guard sirf "ghalat page par na pahuncho" wala kaam karta hai.
*/
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStudent();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        account={{
          email: session.profile?.email ?? "",
          isAdmin: session.profile?.role === "admin",
        }}
      />

      <main id="main-content" className="flex-1 bg-surface">
        <div className="container py-8 md:py-10">
          <div className="flex flex-col gap-6 md:flex-row md:gap-8">
            <div className="md:w-60 md:shrink-0">
              <StudentNav className="md:sticky md:top-24" />
            </div>
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
