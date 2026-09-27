"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GENERIC_ADMIN_ERROR, isUuid, pickSafeMessage } from "@/features/admin/shared";
import {
  isPersonCategory,
  isPersonGender,
  isTeacherType,
  type AssignmentActionState,
  type PersonActionState,
  type RoleActionState,
  type TeacherType,
} from "@/features/admin/people/types";

/*
  People ke writes (README §28-§30, §49-§51).

  ASOOL: yahan koi authority nahi. Har RPC SECURITY DEFINER + is_admin() hai aur
  audit hoti hai. Yeh file sirf shakal check karti hai (behtar message ke liye)
  aur DB error me se sirf allowlist wale message bhejti hai.

  Ahem qawaid (DB dobara laagu karti hai, yahan sirf UX):
   - Teacher ke liye teacher type zaroori. Lab instructor par kabhi force nahi.
   - Internal teacher ko department chahiye (Faculty role auto banta hai).
   - slug/primary_category create par lock. is_active yahan se nahi (§51 alag).
*/

const SAFE_MESSAGES = new Set<string>([
  "You do not have access to this.",
  "A name is required.",
  "Choose a category.",
  "Choose a teacher type.",
  "Choose a department.",
  "Choose a position.",
  "No university is configured.",
  "That item is not available.",
  "That role already exists.",
  "Choose a course.",
  "Choose a semester.",
  "That assignment already exists.",
]);

function str(formData: FormData, key: string): string {
  return (formData.get(key) ?? "").toString().trim();
}
function nullableStr(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v ? v : null;
}
function idOrNull(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return isUuid(v) ? v : null;
}
function revalidatePerson(personId: string | null): void {
  revalidatePath("/admin/people");
  if (personId) revalidatePath(`/admin/people/${personId}`);
}

// ---------------------------------------------------------------------------
// CREATE PERSON (README §28-§30)
// ---------------------------------------------------------------------------
export async function createPersonAction(
  _previous: PersonActionState,
  formData: FormData,
): Promise<PersonActionState> {
  const fullName = str(formData, "fullName");
  if (!fullName) return { ok: false, error: "A name is required." };

  const categoryRaw = formData.get("category");
  if (!isPersonCategory(categoryRaw)) return { ok: false, error: "Choose a category." };
  const category = categoryRaw;

  const genderRaw = formData.get("gender");
  const gender = isPersonGender(genderRaw) ? genderRaw : null;

  // Teacher type sirf Teacher par. Lab instructor par kabhi nahi.
  let teacherType: TeacherType | null = null;
  if (category === "teacher") {
    const ttRaw = formData.get("teacherType");
    if (!isTeacherType(ttRaw)) return { ok: false, error: "Choose a teacher type." };
    teacherType = ttRaw;
  }

  const departmentId = idOrNull(formData, "departmentId");
  // Internal teacher -> department zaroori (Faculty se judne ke liye).
  if (category === "teacher" && teacherType === "internal" && departmentId === null) {
    return { ok: false, error: "Choose a department." };
  }
  const positionId = idOrNull(formData, "positionId");

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_create_person", {
      p_full_name: fullName,
      p_category: category,
      p_gender: gender,
      p_teacher_type: teacherType,
      p_department_id: departmentId,
      p_position_id: positionId,
      p_display_name: nullableStr(formData, "displayName"),
      p_headline: nullableStr(formData, "headline"),
    });
    if (error) return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES) };
    revalidatePath("/admin/people");
    return { ok: true, personId: typeof data === "string" ? data : undefined };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR };
  }
}

/* Sirf teacherType ka type nikalne ke liye (readable). */
function asTeacherType(v: unknown) {
  return isTeacherType(v) ? v : null;
}

// ---------------------------------------------------------------------------
// UPDATE PERSON (core fields; is_active/slug/category LOCK)
// ---------------------------------------------------------------------------
export async function updatePersonAction(
  _previous: PersonActionState,
  formData: FormData,
): Promise<PersonActionState> {
  const id = idOrNull(formData, "id");
  if (id === null) return { ok: false, error: "That item is not available." };

  const fullName = str(formData, "fullName");
  if (!fullName) return { ok: false, error: "A name is required.", personId: id };

  const genderRaw = formData.get("gender");
  const gender = isPersonGender(genderRaw) ? genderRaw : null;
  const teacherType = asTeacherType(formData.get("teacherType"));

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_update_person", {
      p_id: id,
      p_full_name: fullName,
      p_display_name: nullableStr(formData, "displayName"),
      p_title_prefix: nullableStr(formData, "titlePrefix"),
      p_headline: nullableStr(formData, "headline"),
      p_bio: nullableStr(formData, "bio"),
      p_gender: gender,
      p_teacher_type: teacherType,
      p_is_verified: formData.get("isVerified") === "true",
    });
    if (error) return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), personId: id };
    revalidatePerson(id);
    return { ok: true, personId: typeof data === "string" ? data : id };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, personId: id };
  }
}

// ---------------------------------------------------------------------------
// ROLES
// ---------------------------------------------------------------------------
export async function addRoleAction(
  _previous: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  const personId = idOrNull(formData, "personId");
  if (personId === null) return { ok: false, error: "That item is not available." };

  const categoryRaw = formData.get("category");
  if (!isPersonCategory(categoryRaw)) return { ok: false, error: "Choose a category." };

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_add_role", {
      p_person_id: personId,
      p_category: categoryRaw,
      p_department_id: idOrNull(formData, "departmentId"),
      p_position_id: idOrNull(formData, "positionId"),
      p_is_primary: formData.get("isPrimary") === "true",
    });
    if (error) return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES) };
    revalidatePerson(personId);
    return { ok: true, roleId: typeof data === "string" ? data : undefined };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR };
  }
}

export async function setRoleActiveAction(
  _previous: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  const roleId = idOrNull(formData, "roleId");
  if (roleId === null) return { ok: false, error: "That item is not available." };
  const personId = idOrNull(formData, "personId");

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("admin_set_role_active", {
      p_role_id: roleId,
      p_active: formData.get("active") === "true",
    });
    if (error) return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), roleId };
    revalidatePerson(personId);
    return { ok: true, roleId };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, roleId };
  }
}

export async function setPrimaryRoleAction(
  _previous: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  const roleId = idOrNull(formData, "roleId");
  if (roleId === null) return { ok: false, error: "That item is not available." };
  const personId = idOrNull(formData, "personId");

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("admin_set_primary_role", { p_role_id: roleId });
    if (error) return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), roleId };
    revalidatePerson(personId);
    return { ok: true, roleId };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, roleId };
  }
}

// ---------------------------------------------------------------------------
// ASSIGNMENTS (course + semester)
// ---------------------------------------------------------------------------
export async function addAssignmentAction(
  _previous: AssignmentActionState,
  formData: FormData,
): Promise<AssignmentActionState> {
  const personId = idOrNull(formData, "personId");
  if (personId === null) return { ok: false, error: "That item is not available." };

  const courseId = idOrNull(formData, "courseId");
  if (courseId === null) return { ok: false, error: "Choose a course." };
  const semesterId = idOrNull(formData, "semesterId");
  if (semesterId === null) return { ok: false, error: "Choose a semester." };

  const categoryRaw = formData.get("category");
  const category = isPersonCategory(categoryRaw) ? categoryRaw : null;

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_add_assignment", {
      p_person_id: personId,
      p_course_id: courseId,
      p_semester_id: semesterId,
      p_section: nullableStr(formData, "section"),
      p_category: category,
    });
    if (error) return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES) };
    revalidatePerson(personId);
    return { ok: true, assignmentId: typeof data === "string" ? data : undefined };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR };
  }
}

export async function setAssignmentActiveAction(
  _previous: AssignmentActionState,
  formData: FormData,
): Promise<AssignmentActionState> {
  const assignmentId = idOrNull(formData, "assignmentId");
  if (assignmentId === null) return { ok: false, error: "That item is not available." };
  const personId = idOrNull(formData, "personId");

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("admin_set_assignment_active", {
      p_assignment_id: assignmentId,
      p_active: formData.get("active") === "true",
    });
    if (error) {
      return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), assignmentId };
    }
    revalidatePerson(personId);
    return { ok: true, assignmentId };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, assignmentId };
  }
}
