import type { Database } from "@/lib/supabase/database.types";

/*
  POSITIONS - approved designations ki SINGLE SOURCE OF TRUTH (frontend side).

  Platform par sirf yeh paanch designations exist karti hain:
      Coordinator, HOD, Associate Professor, Professor, Dean
  Inke ilawa koi designation na yahan add karo, na kisi form/filter me hardcode.

  Jis shakhs ki designation in paanch me nahi aati, uske liye "Other" option hai:
      position_id = null  +  person_roles.title_override = free text
  Isi liye OTHER_POSITION ek UI sentinel hai, database row nahi.

  SECURITY NOTE: yeh list sirf UI convenience ke liye hai. Asli list database
  (public.positions) me hai aur wahi final authority hai. Koi bhi write jo
  designation set karti hai, server par dobara validate hogi - frontend list ko
  kabhi security ki tarah treat mat karo.
*/

export type PositionSlug =
  | "coordinator"
  | "hod"
  | "associate-professor"
  | "professor"
  | "dean";

/** "Other" koi DB row nahi - sirf UI ka option hai. */
export const OTHER_POSITION = "other" as const;

export type PositionSelectValue = PositionSlug | typeof OTHER_POSITION;

export interface PositionOption {
  value: PositionSelectValue;
  label: string;
  /** Bada number = senior. Sirf ordering ke liye. */
  rank: number;
}

/** Dropdown/filter ke liye seniority order (senior pehle), phir "Other". */
export const POSITION_OPTIONS: readonly PositionOption[] = [
  { value: "dean", label: "Dean", rank: 70 },
  { value: "professor", label: "Professor", rank: 60 },
  { value: "associate-professor", label: "Associate Professor", rank: 50 },
  { value: "hod", label: "HOD", rank: 40 },
  { value: "coordinator", label: "Coordinator", rank: 30 },
  { value: OTHER_POSITION, label: "Other", rank: 0 },
] as const;

/** Sirf asli DB positions (bina "Other" ke). */
export const POSITION_SLUGS: readonly PositionSlug[] = POSITION_OPTIONS.filter(
  (option): option is PositionOption & { value: PositionSlug } => option.value !== OTHER_POSITION,
).map((option) => option.value);

export function isPositionSlug(value: string): value is PositionSlug {
  return (POSITION_SLUGS as readonly string[]).includes(value);
}

/**
 * Kisi role ka display title nikalta hai.
 * Pehle position ka title, warna title_override ("Other" wala case), warna null.
 */
export function resolveRoleTitle(role: {
  position?: { title: string | null } | null;
  title_override?: string | null;
}): string | null {
  const positionTitle = role.position?.title?.trim();
  if (positionTitle) return positionTitle;

  const override = role.title_override?.trim();
  if (override) return override;

  return null;
}

export type PersonCategory = Database["public"]["Enums"]["person_category"];
export type PersonGender = Database["public"]["Enums"]["person_gender"];
