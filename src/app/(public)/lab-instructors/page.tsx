import type { Metadata } from "next";

import {
  buildCategoryMetadata,
  CategoryPageView,
  type CategorySearchParams,
} from "@/features/directory/category-page";

// Route slug aur category meta ka slug ek hi hona chahiye (lib/constants.ts).
const SLUG = "lab-instructors";

export const metadata: Metadata = buildCategoryMetadata(SLUG);

export default function Page({ searchParams }: { searchParams?: CategorySearchParams }) {
  return <CategoryPageView slug={SLUG} searchParams={searchParams} />;
}
