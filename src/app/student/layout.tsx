import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { StudentNav } from "@/features/student/student-nav";
import { requireStudent } from "@/features/auth/session";
import { NotificationBanner } from "@/features/notifications/notification-banner";
export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStudent();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        account={{
          email: session.profile?.email ?? "",
          isAdmin: session.profile?.role === "admin",
        }}
      />
      <NotificationBanner />
      <main id="main-content" className="flex-1">
        <div className="container py-5">
          <div className="flex items-center gap-2 border-b border-border pb-4 text-[11px] text-muted-foreground">
            <span>SMIU</span>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-foreground">
              Student workspace
            </span>
            <span className="ml-auto hidden sm:block">Only visible to you</span>
          </div>
        </div>
        <div className="container pb-12 pt-4 md:pb-16">
          <div className="student-shell">
            <aside className="student-sidebar">
              <StudentNav />
            </aside>
            <div className="min-w-0">{children}</div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
