import { BestTeacher } from "@/features/home/best-teacher";
import { FeaturedPeople } from "@/features/home/featured-people";
import { Hero } from "@/features/home/hero";
import { HomeCta } from "@/features/home/home-cta";
import { CampusPathways } from "@/features/home/campus-pathways";
import { FeaturedSpotlight } from "@/features/home/featured-spotlight";
import { Suspense } from "react";
export default function HomePage() {
  return (
    <>
      <Hero />
      <Suspense fallback={null}>
        <FeaturedSpotlight />
      </Suspense>
      <CampusPathways />
      <FeaturedPeople />
      <BestTeacher />
      <HomeCta />
    </>
  );
}
