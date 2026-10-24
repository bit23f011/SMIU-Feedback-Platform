import { BestTeacher } from "@/features/home/best-teacher";
import { FeaturedPeople } from "@/features/home/featured-people";
import { Hero } from "@/features/home/hero";
import { HomeCta } from "@/features/home/home-cta";
import { CampusPathways } from "@/features/home/campus-pathways";
export default function HomePage() {
  return (
    <>
      <Hero />
      <CampusPathways />
      <FeaturedPeople />
      <BestTeacher />
      <HomeCta />
    </>
  );
}
