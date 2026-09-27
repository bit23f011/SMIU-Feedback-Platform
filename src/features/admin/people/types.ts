import type { Database } from "@/lib/supabase/database.types";
import {
  PERSON_CATEGORY_LABELS,
  PERSON_CATEGORY_ORDER,
  isPersonCategory,
  type PersonCategory,
} from "@/features/admin/criteria/types";

/*
  People admin ke shared types (README §28-§30, §49-§50).

  Ek person = ek public profile. Admin naya person bana sakta hai, core fields
  edit kar sakta hai, roles aur teaching assignments jor sakta hai, aur verify /
  (alag se) deactivate kar sakta hai.

  AUTHORITY yahan nahi: har RPC SECURITY DEFINER + is_admin() hai. slug aur
  primary_category create par lock hote hain (identity/URL stable). is_active is
  file se nahi (alag set_person_active §51). teacher_type sirf Teacher par.

  Person categories criteria module se aate hain (ek hi jagah). Gender aur teacher
  type yahan.
*/

export type PersonGender = Database["public"]["Enums"]["person_gender"];
export type TeacherType = Database["public"]["Enums"]["teacher_type"];

export {
  PERSON_CATEGORY_LABELS,
  PERSON_CATEGORY_ORDER,
  isPersonCategory,
};
export type { PersonCategory };

/* README: Gender sirf Male/Female (public content, English label). */
export const PERSON_GENDER_ORDER: readonly PersonGender[] = ["male", "female"] as const;

export const PERSON_GENDER_LABELS: Record<PersonGender, string> = {
  male: "Male",
  female: "Female",
};

export const TEACHER_TYPE_ORDER: readonly TeacherType[] = [
  "internal",
  "external",
  "corporate",
] as const;

export const TEACHER_TYPE_LABELS: Record<TeacherType, string> = {
  internal: "Internal",
  external: "External",
  corporate: "Corporate",
};

export function isPersonGender(value: unknown): value is PersonGender {
  return typeof value === "string" && (PERSON_GENDER_ORDER as readonly string[]).includes(value);
}

export function isTeacherType(value: unknown): value is TeacherType {
  return typeof value === "string" && (TEACHER_TYPE_ORDER as readonly string[]).includes(value);
}

/* People list ka status filter. */
export type PeopleStatus = "all" | "active" | "inactive" | "unverified";

export const PEOPLE_STATUS_OPTIONS: readonly { value: PeopleStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "unverified", label: "Unverified" },
];

export function isPeopleStatus(value: unknown): value is PeopleStatus {
  return value === "all" || value === "active" || value === "inactive" || value === "unverified";
}

export const PEOPLE_PAGE_SIZE = 20;

export interface AdminPersonListItem {
  id: string;
  fullName: string;
  displayName: string | null;
  slug: string;
  primaryCategory: PersonCategory | null;
  teacherType: TeacherType | null;
  gender: PersonGender | null;
  headline: string | null;
  isActive: boolean;
  isVerified: boolean;
  roleCount: number;
  reviewCount: number;
}

export interface AdminPeopleView {
  items: AdminPersonListItem[];
  total: number;
  page: number;
  pageSize: number;
  failed: boolean;
}

export const EMPTY_PEOPLE_VIEW: AdminPeopleView = {
  items: [],
  total: 0,
  page: 1,
  pageSize: PEOPLE_PAGE_SIZE,
  failed: false,
};

export interface AdminPersonDetail {
  id: string;
  fullName: string;
  displayName: string | null;
  titlePrefix: string | null;
  headline: string | null;
  bio: string | null;
  slug: string;
  gender: PersonGender | null;
  primaryCategory: PersonCategory | null;
  teacherType: TeacherType | null;
  isActive: boolean;
  isVerified: boolean;
}

export interface AdminPersonRole {
  id: string;
  category: PersonCategory;
  departmentId: string | null;
  departmentName: string | null;
  positionId: string | null;
  positionTitle: string | null;
  titleOverride: string | null;
  isPrimary: boolean;
  isActive: boolean;
}

export interface AdminPersonAssignment {
  id: string;
  courseOfferingId: string;
  courseId: string;
  courseTitle: string;
  semesterId: string;
  semesterLabel: string;
  section: string | null;
  category: PersonCategory;
  isActive: boolean;
}

export interface AdminPersonBundle {
  person: AdminPersonDetail | null;
  roles: AdminPersonRole[];
  assignments: AdminPersonAssignment[];
  failed: boolean;
}

export const EMPTY_PERSON_BUNDLE: AdminPersonBundle = {
  person: null,
  roles: [],
  assignments: [],
  failed: false,
};

/* Action states: person / role / assignment alag id lautate hain. */
export interface PersonActionState {
  ok: boolean;
  error?: string;
  personId?: string;
}
export const EMPTY_PERSON_ACTION_STATE: PersonActionState = { ok: false };

export interface RoleActionState {
  ok: boolean;
  error?: string;
  roleId?: string;
}
export const EMPTY_ROLE_ACTION_STATE: RoleActionState = { ok: false };

export interface AssignmentActionState {
  ok: boolean;
  error?: string;
  assignmentId?: string;
}
export const EMPTY_ASSIGNMENT_ACTION_STATE: AssignmentActionState = { ok: false };
