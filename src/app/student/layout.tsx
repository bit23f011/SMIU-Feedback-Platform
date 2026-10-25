import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { StudentNav } from "@/features/student/student-nav";
import { requireStudent } from "@/features/auth/session";
import { NotificationBanner } from "@/features/notifications/notification-banner";
import { Suspense } from "react";
export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStudent();
  return (
    <div className="student-layout flex flex-col">
      <SiteHeader
        account={{
          email: session.profile?.email ?? "",
          isAdmin: session.profile?.role === "admin",
        }}
      />
      <Suspense fallback={null}>
        <NotificationBanner />
      </Suspense>
      <div className="student-workspace min-h-0 flex-1">
        <div className="student-shell">
          <aside className="student-sidebar">
            <StudentNav />
          </aside>
          <div className="student-content min-w-0">
            <main id="main-content" className="pb-10 pt-5 md:pb-12 md:pt-7">
              {children}
            </main>
            <SiteFooter />
          </div>
        </div>
      </div>
    </div>
  );
}
