import { PageTransition } from "@/components/common/page-transition";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getHeaderAccount } from "@/features/auth/session";
import { NotificationBanner } from "@/features/notifications/notification-banner";
import { PublicProfilePreview } from "@/features/people/profile-modal";
import { DemoDataBanner } from "@/features/demo-data/demo-data-banner";
import { Suspense } from "react";

/*
  Public route group ka shell: header + main + footer.
  Yahan ki saari pages publicly accessible hain (koi auth zaroori nahi).

  Header ko sirf "kaun signed in hai" batate hain taake navbar sahi dikhe.
  Yeh koi gate nahi hai - public pages waise hi public rehti hain.

  PageTransition sirf <main> ke andar hai - header aur footer jagah par jame
  rehte hain, sirf content halka sa fade hota hai. Poora page fade karne se
  navbar "blink" karta hai aur wo sasta lagta hai.
*/
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await getHeaderAccount();

  return (
    <PublicProfilePreview>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader account={account} />
        <Suspense fallback={null}>
          <DemoDataBanner />
        </Suspense>
        <Suspense fallback={null}>
          <NotificationBanner />
        </Suspense>
        <main id="main-content" className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <SiteFooter />
      </div>
    </PublicProfilePreview>
  );
}
