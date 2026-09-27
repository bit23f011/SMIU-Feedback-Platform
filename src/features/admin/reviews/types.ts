import type { PersonCategory } from "@/features/people/types";
import type { Database } from "@/lib/supabase/database.types";

/*
  Admin moderation ke shared types (README §22).

  YAAD RAHE: is file me koi authority nahi hai. Yeh sirf naam aur shakal tay
  karti hai. Kaun moderate kar sakta hai aur kaunsa action jaiz hai, wo poori
  tarah `moderate_review()` (SECURITY DEFINER + is_admin()) tay karti hai.
*/

export type ModerationStatus = Database["public"]["Enums"]["review_moderation_status"];

/*
  Queue me sirf yeh chaar halatein dikhti hain. 'none' ka matlab hai review me
  koi text hai hi nahi - us par moderation ka koi sawal nahi banta, is liye wo
  tab bhi nahi hai.
*/
export const MODERATION_QUEUE_STATUSES = ["pending", "approved", "rejected", "hidden"] as const;

export type ModerationQueueStatus = (typeof MODERATION_QUEUE_STATUSES)[number];

export const DEFAULT_QUEUE_STATUS: ModerationQueueStatus = "pending";

/** Har queue page par kitni reviews (README §23: browser me bohat saara text na aaye). */
export const ADMIN_QUEUE_PER_PAGE = 20;

export interface ModerationTab {
  status: ModerationQueueStatus;
  label: string;
  /** Tab khulne par ek line ka matlab, taake action ka natija saaf rahe. */
  help: string;
}

export const MODERATION_TABS: readonly ModerationTab[] = [
  {
    status: "pending",
    label: "Pending",
    help: "Text that has been submitted but is not public yet. Nothing here is visible to visitors.",
  },
  {
    status: "approved",
    label: "Approved",
    help: "Text that is public on the profile page. Approved text can also be featured.",
  },
  {
    status: "rejected",
    label: "Rejected",
    help: "Text that was turned down. The rating still counts, only the written part stays hidden.",
  },
  {
    status: "hidden",
    label: "Hidden",
    help: "Text taken down after it was published. The record is kept so the decision can be revisited.",
  },
] as const;

/*
  Jo actions server manta hai. Yeh list `moderate_review()` ke andar wali
  if/elsif se hoobahoo milni chahiye. Yahan se kuch hata dena button ghayab
  karta hai, permission nahi badalta.
*/
export const MODERATION_ACTIONS = ["approve", "reject", "hide", "feature", "unfeature"] as const;

export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export interface AdminQueueReview {
  id: string;
  personId: string;
  personSlug: string;
  personName: string;
  category: PersonCategory;
  overallRating: number;
  /** Queue me sirf wahi reviews aati hain jin me text hai. */
  comment: string | null;
  isFeatured: boolean;
  courseTitle: string | null;
  semesterLabel: string | null;
  createdAt: string;
}

export interface AdminQueuePage {
  reviews: AdminQueueReview[];
  total: number;
  /*
    Query chali hi nahi (network, ya is_admin() ne rok diya). Isay khali queue
    se alag rakhna zaroori hai - warna admin ko lagta hai kaam khatam ho gaya,
    halanke list load hi nahi hui.
  */
  failed: boolean;
}

export const EMPTY_QUEUE_PAGE: AdminQueuePage = { reviews: [], total: 0, failed: false };

export function isModerationQueueStatus(value: unknown): value is ModerationQueueStatus {
  return (
    typeof value === "string" &&
    (MODERATION_QUEUE_STATUSES as readonly string[]).includes(value)
  );
}

export function isModerationAction(value: unknown): value is ModerationAction {
  return typeof value === "string" && (MODERATION_ACTIONS as readonly string[]).includes(value);
}

/** Queue card par "BS Software Engineering · Fall 2025" jaisi ek line. */
export function formatQueueContext(review: AdminQueueReview): string | null {
  if (review.courseTitle && review.semesterLabel) {
    return `${review.courseTitle} · ${review.semesterLabel}`;
  }
  return review.courseTitle ?? review.semesterLabel ?? null;
}
