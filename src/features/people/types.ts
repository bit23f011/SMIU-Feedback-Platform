import type { Database } from "@/lib/supabase/database.types";

/*
  Public directory ke liye person ka shape.
  Note: rating aur reviewCount yahan STRUCTURE ke taur par hain - Phase 1 me inki
  koi value nahi aati (null). Reviews Phase 2 me banenge. Yahan kabhi demo/fake
  numbers mat bharo: khali rating "Not rated yet" dikhati hai, 0 nahi.
*/

export type PersonCategory = Database["public"]["Enums"]["person_category"];
export type PersonGender = Database["public"]["Enums"]["person_gender"];

/*
  README §30. Internal teacher ko DB khud faculty role bhi de deti hai (usi ek
  person par, doosra record kabhi nahi). Yahan yeh sirf padhne ke liye hai -
  association ka faisla trigger karta hai, yeh field nahi.
*/
export type TeacherType = Database["public"]["Enums"]["teacher_type"];

export const TEACHER_TYPE_LABELS: Record<TeacherType, string> = {
  internal: "Internal",
  external: "External",
  corporate: "Corporate",
};

export interface PersonRoleSummary {
  category: PersonCategory;
  /** Approved position ka title, ya "Other" case me free-text title. */
  title: string | null;
  department: string | null;
  isPrimary: boolean;
}

export interface PersonSummary {
  id: string;
  slug: string;
  name: string;
  gender: PersonGender | null;
  photoUrl: string | null;
  headline: string | null;
  primaryCategory: PersonCategory | null;
  /** Sirf parhane walon par maani rakhta hai; baqi categories par null. */
  teacherType: TeacherType | null;
  roles: PersonRoleSummary[];
  /** Phase 1: hamesha null. Phase 2 me reviews se aayega. */
  rating: number | null;
  /** Phase 1: hamesha null. */
  reviewCount: number | null;
}
