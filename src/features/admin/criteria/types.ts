import type { Database } from "@/lib/supabase/database.types";

/*
  Review criteria editor ke shared types (README §49).

  Criteria wohi sawal hain jin par student rating deta hai (Course Knowledge,
  Teaching Way, Nature, Strictness YES/NO, wagera). Admin inhein add/edit kar
  sakta hai bina source-code chhue.

  ZAROORI: hard delete nahi (review_answers.criterion_id delete restrict). Purana
  criterion band karna is_active=false se. Update par category/key/kind LOCK
  rehte hain (warna pehle se maujood jawaabon ka matlab badal jata). Naya criterion
  add hote hi submit_review usay expect karne lagti hai.

  AUTHORITY yahan nahi: list/upsert dono admin RPC (is_admin()). Yeh file sirf
  naam/shakal aur label deti hai.
*/

export type PersonCategory = Database["public"]["Enums"]["person_category"];
export type ReviewCriterionKind = Database["public"]["Enums"]["review_criterion_kind"];

/* Reference schema ki tarteeb (person_category enum). */
export const PERSON_CATEGORY_ORDER: readonly PersonCategory[] = [
  "teacher",
  "lab_instructor",
  "faculty",
  "university_staff",
  "hr_staff",
] as const;

export const PERSON_CATEGORY_LABELS: Record<PersonCategory, string> = {
  teacher: "Teacher",
  lab_instructor: "Lab instructor",
  faculty: "Faculty",
  university_staff: "University staff",
  hr_staff: "HR staff",
};

export const CRITERION_KIND_ORDER: readonly ReviewCriterionKind[] = ["star", "yes_no"] as const;

export const CRITERION_KIND_LABELS: Record<ReviewCriterionKind, string> = {
  star: "Rating (1 to 5 stars)",
  yes_no: "Yes / No",
};

export interface AdminCriterion {
  id: string;
  category: PersonCategory;
  key: string;
  label: string;
  helpText: string | null;
  kind: ReviewCriterionKind;
  sortOrder: number;
  isActive: boolean;
  /** Is criterion ke against kitne jawaab maujood hain (delete-safety context). */
  answerCount: number;
}

export interface AdminCriteriaView {
  criteria: AdminCriterion[];
  failed: boolean;
}

export const EMPTY_CRITERIA_VIEW: AdminCriteriaView = {
  criteria: [],
  failed: false,
};

export function isPersonCategory(value: unknown): value is PersonCategory {
  return (
    typeof value === "string" &&
    (PERSON_CATEGORY_ORDER as readonly string[]).includes(value)
  );
}

export function isCriterionKind(value: unknown): value is ReviewCriterionKind {
  return (
    typeof value === "string" && (CRITERION_KIND_ORDER as readonly string[]).includes(value)
  );
}

/** DB ki key check se milti-julti (sirf pehle-se-batane ke liye). */
export function isCriterionKey(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9_]+$/.test(value);
}
