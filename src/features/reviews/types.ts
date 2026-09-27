import type { Database } from "@/lib/supabase/database.types";
import type { PersonCategory } from "@/features/people/types";

/*
  Reviews ke shared types.

  Yaad rahe: in me se kisi bhi public type me author ka koi field NAHI hai -
  `reviews` table me author column hai hi nahi. Anonymity structure se aati hai.
*/

export type ReviewCriterionKind = Database["public"]["Enums"]["review_criterion_kind"];
export type ReviewStatus = Database["public"]["Enums"]["review_status"];

/*
  Likhe hue text ki moderation (README §22).

    none      = is review me koi text hai hi nahi, moderate karne ko kuch nahi
    pending   = text likha gaya hai, admin ne abhi dekha nahi
    approved  = text public par dikh raha hai
    rejected  = text rad kar diya gaya
    hidden    = pehle dikhta tha, ab chhupa diya gaya

  Rating IN sab soorton me ginti hai. Sirf text ruka hota hai.
*/
export type ReviewModerationStatus =
  Database["public"]["Enums"]["review_moderation_status"];

/*
  Do alag scales hain, in ko mat milao:

    * OVERALL rating 1 se 10 tak hai (README §15-§19). Yeh `reviews.overall_rating`
      column hai, koi criterion nahi.
    * Har CRITERION ka star 1 se 5 tak hai.

  Yeh numbers sirf UI aur behtar error messages ke liye hain. Asli had DB me hai:
  `reviews_overall_rating_range` check aur submit_review/update_my_review.
*/
export const OVERALL_MIN = 1;
export const OVERALL_MAX = 10;
export const STAR_MIN = 1;
export const STAR_MAX = 5;

export type OverallRating = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** 10 se 1 tak, is tarteeb me distribution bars dikhte hain. */
export const OVERALL_VALUES_DESC: readonly OverallRating[] = [
  10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
];

/** Ek sawal (category ke hisab se DB se aata hai, code me hardcode nahi). */
export interface ReviewCriterion {
  id: string;
  key: string;
  label: string;
  helpText: string | null;
  kind: ReviewCriterionKind;
  sortOrder: number;
}

/** Ek review ka ek jawab. */
export interface ReviewAnswer {
  key: string;
  label: string;
  kind: ReviewCriterionKind;
  star: number | null;
  yes: boolean | null;
}

/*
  Review ka course + semester context (README §25).

  Purani reviews me yeh null ho sakta hai, kyunke uniqueness rule baad me aaya.
  Is liye har field nullable hai aur UI ko null ki soorat me chip chhupani hai,
  "Unknown course" jaisa kuch likhna nahi.
*/
export interface ReviewContext {
  courseCode: string | null;
  courseTitle: string | null;
  semesterLabel: string | null;
}

/** Public par dikhne wali review. Koi identity nahi. */
export interface PublicReview extends ReviewContext {
  id: string;
  overallRating: number;
  /*
    null ke do matlab ho sakte hain: ya to student ne kuch likha hi nahi, ya
    text abhi approve nahi hua. Public ke liye dono ek jaise hain - is liye
    yahan jaan boojh kar koi "pending" flag nahi bheja jata, warna log ginne
    lag jate ke kis banday par kitni reviews rukein hui hain.
  */
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  wasEdited: boolean;
  isFeatured: boolean;
  answers: ReviewAnswer[];
}

/** Ek page ki reviews + total (server-side pagination, README §23). */
export interface PublicReviewPage {
  reviews: PublicReview[];
  total: number;
}

/** Profile page par kitni reviews ek page me (README §23: takreeban 10-20). */
export const REVIEWS_PER_PAGE = 10;

/** Upar kitni featured reviews dikhein (README §24: takreeban 3-5). */
export const FEATURED_REVIEWS_LIMIT = 3;

/** Person ka overall summary. reviewCount 0 ho to rating null rehti hai. */
export interface PersonRatingStats {
  reviewCount: number;
  averageRating: number | null;
  /** 1..10 ke counts (README §15 overall scale) - bar chart ke liye. */
  distribution: Record<OverallRating, number>;
}

export const EMPTY_RATING_STATS: PersonRatingStats = {
  reviewCount: 0,
  averageRating: null,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 },
};

/** Ek criterion ka person-level summary. */
export interface PersonCriterionStat {
  criterionId: string;
  key: string;
  label: string;
  kind: ReviewCriterionKind;
  sortOrder: number;
  /** kind = 'star' */
  averageStar: number | null;
  starResponses: number;
  /** kind = 'yes_no' */
  yesCount: number;
  boolResponses: number;
}

/** Student ko apni review ka poora shape (edit form isay bharta hai). */
export interface MyReview extends ReviewContext {
  id: string;
  personId: string;
  personSlug: string;
  personName: string;
  category: PersonCategory;
  overallRating: number;
  comment: string | null;
  status: ReviewStatus;
  /** Sirf text ke liye. Rating is se ruki hui nahi hoti. */
  moderationStatus: ReviewModerationStatus;
  editCount: number;
  editsLeft: number;
  /*
    Course aur semester edit nahi ho sakte (update_my_review in ko chhoota hi
    nahi). Wajah: yehi dono uniqueness ka scope hain - inhein badalne dena
    "ek review per course per semester" wale rule me pichhle darwaze se ghusna
    hai. Galat scope chuna gaya ho to review delete kar ke naya likha jaye.
  */
  courseId: string | null;
  semesterId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Edit form ke liye: meri review + uske jawab. */
export interface MyReviewDetail extends MyReview {
  answers: Record<string, { star: number | null; yes: boolean | null }>;
}

export interface ReviewLimits {
  maxPerDay: number;
  maxEdits: number;
}

/*
  Review form me chunne ke liye ek jaiz course + semester jorha (README §25).

  courseId null hai to matlab yeh sirf semester wala option hai (staff/HR ki
  reviews course se nahi bandhi jatin). isAssigned batata hai ke yeh jorha admin
  ke record kiye hue teaching assignment se aaya hai ya department ke fallback
  se - UI is par bharosa nahi karti, sirf tarteeb behtar dikhati hai.
*/
export interface ReviewOption {
  courseId: string | null;
  courseCode: string | null;
  courseTitle: string | null;
  semesterId: string;
  semesterLabel: string;
  isAssigned: boolean;
}

/** Kis person + course + semester par meri review pehle se hai. */
export interface ReviewScope {
  personId: string;
  courseId: string | null;
  semesterId: string | null;
}

/** Category course se bandhi hai ya nahi (README §25). */
export function categoryNeedsCourse(category: PersonCategory): boolean {
  return category === "teacher" || category === "lab_instructor";
}

/*
  Chip ka text. Dono cheezein null hon to null wapas jata hai, taake UI khaali
  chip na banaye. Code maujood ho to code hi behtar hai: "CS-201 · Fall 2025".
*/
export function formatReviewContext(context: ReviewContext): string | null {
  const course = context.courseCode ?? context.courseTitle;
  if (course && context.semesterLabel) return `${course} · ${context.semesterLabel}`;
  return course ?? context.semesterLabel ?? null;
}

/** Agar DB se limits na mil sakein to yehi safe default hai (UI copy ke liye). */
export const FALLBACK_REVIEW_LIMITS: ReviewLimits = { maxPerDay: 10, maxEdits: 2 };

/*
  Comment ki had README §21 ke mutabiq WORDS me hai, characters me nahi.

  COMMENT_MAX_CHARS ek doosri deewar hai: 150 "words" ki aar me koi ek bohat
  lamba lafz bhej kar payload bara na kar de. DB me bhi bilkul yehi dono checks
  hain, is liye client ka counter hata dene se kuch nahi badalta.
*/
export const COMMENT_MAX_WORDS = 150;
export const COMMENT_MAX_CHARS = 1500;

/*
  Word count client aur server DONO jagah yehi function karta hai, taake
  counter aur validation kabhi alag jawab na dein. DB bhi isi tarah ginta hai:
  btrim + whitespace par split.
*/
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}
