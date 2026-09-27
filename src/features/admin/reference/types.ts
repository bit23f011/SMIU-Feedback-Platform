import type { Database } from "@/lib/supabase/database.types";
import {
  PERSON_CATEGORY_LABELS,
  PERSON_CATEGORY_ORDER,
  isPersonCategory,
  type PersonCategory,
} from "@/features/admin/criteria/types";

/*
  Reference-data admin ke shared types (README §49).

  Yeh wo bunyaadi data hai jis par baaki sab khada hai: Departments, Programs,
  Courses, Semesters, Positions. Admin inhein add/edit/retire kar sakta hai bina
  source-code chhue.

  AUTHORITY yahan nahi: har list/upsert/set-active ek admin RPC (is_admin()) hai.
  Yeh file sirf naam/shakal, label aur guards deti hai. Slug create par lock hota
  hai (URL stable) aur hard delete nahi hota (is_active=false = archival).
*/

export type ProgramLevel = Database["public"]["Enums"]["program_level"];
export type SemesterSeason = Database["public"]["Enums"]["semester_season"];

/* Person category labels criteria module se aate hain (ek hi jagah). */
export {
  PERSON_CATEGORY_LABELS,
  PERSON_CATEGORY_ORDER,
  isPersonCategory,
};
export type { PersonCategory };

export const PROGRAM_LEVEL_ORDER: readonly ProgramLevel[] = [
  "undergraduate",
  "graduate",
  "postgraduate",
  "diploma",
] as const;

export const PROGRAM_LEVEL_LABELS: Record<ProgramLevel, string> = {
  undergraduate: "Undergraduate",
  graduate: "Graduate",
  postgraduate: "Postgraduate",
  diploma: "Diploma",
};

export const SEMESTER_SEASON_ORDER: readonly SemesterSeason[] = [
  "spring",
  "summer",
  "fall",
  "winter",
] as const;

export const SEMESTER_SEASON_LABELS: Record<SemesterSeason, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

export function isProgramLevel(value: unknown): value is ProgramLevel {
  return (
    typeof value === "string" && (PROGRAM_LEVEL_ORDER as readonly string[]).includes(value)
  );
}

export function isSemesterSeason(value: unknown): value is SemesterSeason {
  return (
    typeof value === "string" && (SEMESTER_SEASON_ORDER as readonly string[]).includes(value)
  );
}

export interface AdminDepartment {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  isActive: boolean;
  universityId: string;
  programCount: number;
  courseCount: number;
  roleCount: number;
}

export interface AdminProgram {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  level: ProgramLevel;
  isActive: boolean;
  departmentId: string;
  departmentName: string | null;
  courseCount: number;
}

export interface AdminCourse {
  id: string;
  title: string;
  code: string | null;
  slug: string;
  creditHours: number | null;
  isActive: boolean;
  departmentId: string | null;
  departmentName: string | null;
  programId: string | null;
  programName: string | null;
  offeringCount: number;
}

export interface AdminSemester {
  id: string;
  label: string;
  season: SemesterSeason;
  year: number;
  slug: string;
  isCurrent: boolean;
  startsOn: string | null;
  endsOn: string | null;
  offeringCount: number;
}

export interface AdminPosition {
  id: string;
  title: string;
  slug: string;
  rank: number;
  category: PersonCategory | null;
  isActive: boolean;
  roleCount: number;
}

/** Har list ek chhote wrapper me: data + failed flag (error kabhi UI tak nahi). */
export interface AdminRefList<T> {
  items: T[];
  failed: boolean;
}

export function emptyRefList<T>(failed = false): AdminRefList<T> {
  return { items: [], failed };
}

/* Saari reference actions ek hi state shape use karti hain. */
export interface ReferenceActionState {
  ok: boolean;
  error?: string;
  id?: string;
}

export const EMPTY_REFERENCE_ACTION_STATE: ReferenceActionState = { ok: false };
