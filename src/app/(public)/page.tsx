import { BestTeacher } from "@/features/home/best-teacher";
import { FeaturedPeople } from "@/features/home/featured-people";
import { Hero } from "@/features/home/hero";
import { HomeCta } from "@/features/home/home-cta";
import { HowItWorks } from "@/features/home/how-it-works";
import { PrivacyPromise } from "@/features/home/privacy-promise";
import { NotificationBanner } from "@/features/notifications/notification-banner";

/*
  Homepage - jaan boojh kar chhoti: hero + search + category chips, ek highlight,
  kuch asli profiles, kaam kaise karta hai, privacy, aur ek CTA. Footer layout se
  aata hai.

  Ziyada sections add karne ka dabao hamesha hota hai; har naya section homepage
  ko landing-page banata hai aur product ko chhupata hai.
*/
export default function HomePage() {
  return (
    <>
      {/* Admin-driven announcement (DB se). Koi active notice na ho to kuch render nahi hota. */}
      <NotificationBanner />

      <Hero />
      <BestTeacher />
      <FeaturedPeople />
      <HowItWorks />
      <PrivacyPromise />
      <HomeCta />
    </>
  );
}
