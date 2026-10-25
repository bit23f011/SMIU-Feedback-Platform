import { revalidatePath, revalidateTag } from "next/cache";
import { PUBLIC_DATA_TAG, PUBLIC_RATINGS_TAG } from "@/lib/supabase/public";

/** Successful reviews and admin changes immediately expire the anonymous read cache. */
export function revalidatePublicPath(path: string, type?: "page" | "layout") {
  revalidateTag(PUBLIC_DATA_TAG);
  revalidatePath(path, type);
}

/** A review changes ratings/results while profile, photo and course reference caches remain reusable. */
export function revalidateReviewPath(path: string) {
  revalidateTag(PUBLIC_RATINGS_TAG);
  revalidatePath(path);
}
