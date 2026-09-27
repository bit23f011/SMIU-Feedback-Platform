"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GENERIC_ADMIN_ERROR, isUuid, pickSafeMessage } from "@/features/admin/shared";
import {
  isProgramLevel,
  isSemesterSeason,
  isPersonCategory,
  type ReferenceActionState,
} from "@/features/admin/reference/types";

/*
  Reference-data ke writes (README §49, §31).

  ASOOL: yahan koi authority nahi. Har RPC SECURITY DEFINER + is_admin() hai aur
  audit hoti hai. Yeh file sirf shakal check karti hai aur DB ke error me se sirf
  allowlist wale (bina table/column naam ke) message user tak bhejti hai.

  Slug create par lock hai, is liye rename kabhi URL nahi torta. Hard delete nahi:
  band karne ke liye is_active=false (archival) taake FK na tootein.
*/

const SAFE_MESSAGES = new Set<string>([
  "You do not have access to this.",
  "A name is required.",
  "A title is required.",
  "Choose a department.",
  "Choose a program.",
  "Choose a season.",
  "Enter a valid year.",
  "The end date cannot be before the start date.",
  "That semester already exists.",
  "This position title is not allowed.",
  "That item is not available.",
  "No university is configured.",
]);

/* Chhote helpers (sirf shakal ke liye, faisla DB me). */
function str(formData: FormData, key: string): string {
  return (formData.get(key) ?? "").toString().trim();
}
function nullableStr(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v ? v : null;
}
function idOrNull(formData: FormData, key = "id"): string | null {
  const v = formData.get(key);
  return isUuid(v) ? v : null;
}
/** Select true/false: default active jab tak explicitly "false" na ho. */
function activeDefaultTrue(formData: FormData, key = "isActive"): boolean {
  return formData.get(key) !== "false";
}
/** Button ka bheja hua active flag (set-active). */
function activeFlag(formData: FormData, key = "active"): boolean {
  return formData.get(key) === "true";
}

// ---------------------------------------------------------------------------
// DEPARTMENTS
// ---------------------------------------------------------------------------
export async function upsertDepartmentAction(
  _previous: ReferenceActionState,
  formData: FormData,
): Promise<ReferenceActionState> {
  const id = idOrNull(formData);
  const name = str(formData, "name");
  if (!name) return { ok: false, error: "A name is required.", id: id ?? undefined };

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_upsert_department", {
      p_id: id,
      p_name: name,
      p_short_name: nullableStr(formData, "shortName"),
      p_is_active: activeDefaultTrue(formData),
    });
    if (error) {
      return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), id: id ?? undefined };
    }
    revalidatePath("/admin/departments");
    return { ok: true, id: typeof data === "string" ? data : (id ?? undefined) };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, id: id ?? undefined };
  }
}

export async function setDepartmentActiveAction(
  _previous: ReferenceActionState,
  formData: FormData,
): Promise<ReferenceActionState> {
  const id = idOrNull(formData);
  if (id === null) return { ok: false, error: "That item is not available." };
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("admin_set_department_active", {
      p_id: id,
      p_active: activeFlag(formData),
    });
    if (error) return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), id };
    revalidatePath("/admin/departments");
    return { ok: true, id };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, id };
  }
}

// ---------------------------------------------------------------------------
// PROGRAMS
// ---------------------------------------------------------------------------
export async function upsertProgramAction(
  _previous: ReferenceActionState,
  formData: FormData,
): Promise<ReferenceActionState> {
  const id = idOrNull(formData);
  const name = str(formData, "name");
  if (!name) return { ok: false, error: "A name is required.", id: id ?? undefined };

  const departmentId = idOrNull(formData, "departmentId");
  if (departmentId === null) {
    return { ok: false, error: "Choose a department.", id: id ?? undefined };
  }
  const levelRaw = formData.get("level");
  const level = isProgramLevel(levelRaw) ? levelRaw : null;

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_upsert_program", {
      p_id: id,
      p_name: name,
      p_short_name: nullableStr(formData, "shortName"),
      p_level: level,
      p_department_id: departmentId,
      p_is_active: activeDefaultTrue(formData),
    });
    if (error) {
      return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), id: id ?? undefined };
    }
    revalidatePath("/admin/programs");
    return { ok: true, id: typeof data === "string" ? data : (id ?? undefined) };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, id: id ?? undefined };
  }
}

export async function setProgramActiveAction(
  _previous: ReferenceActionState,
  formData: FormData,
): Promise<ReferenceActionState> {
  const id = idOrNull(formData);
  if (id === null) return { ok: false, error: "That item is not available." };
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("admin_set_program_active", {
      p_id: id,
      p_active: activeFlag(formData),
    });
    if (error) return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), id };
    revalidatePath("/admin/programs");
    return { ok: true, id };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, id };
  }
}

// ---------------------------------------------------------------------------
// COURSES
// ---------------------------------------------------------------------------
export async function upsertCourseAction(
  _previous: ReferenceActionState,
  formData: FormData,
): Promise<ReferenceActionState> {
  const id = idOrNull(formData);
  const title = str(formData, "title");
  if (!title) return { ok: false, error: "A title is required.", id: id ?? undefined };

  const departmentId = idOrNull(formData, "departmentId");
  if (departmentId === null) {
    return { ok: false, error: "Choose a department.", id: id ?? undefined };
  }
  const programId = idOrNull(formData, "programId");

  const chRaw = str(formData, "creditHours");
  const chParsed = chRaw === "" ? null : Number.parseFloat(chRaw);
  const creditHours = chParsed !== null && Number.isFinite(chParsed) ? chParsed : null;

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_upsert_course", {
      p_id: id,
      p_title: title,
      p_code: nullableStr(formData, "code"),
      p_credit_hours: creditHours,
      p_department_id: departmentId,
      p_program_id: programId,
      p_is_active: activeDefaultTrue(formData),
    });
    if (error) {
      return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), id: id ?? undefined };
    }
    revalidatePath("/admin/courses");
    return { ok: true, id: typeof data === "string" ? data : (id ?? undefined) };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, id: id ?? undefined };
  }
}

export async function setCourseActiveAction(
  _previous: ReferenceActionState,
  formData: FormData,
): Promise<ReferenceActionState> {
  const id = idOrNull(formData);
  if (id === null) return { ok: false, error: "That item is not available." };
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("admin_set_course_active", {
      p_id: id,
      p_active: activeFlag(formData),
    });
    if (error) return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), id };
    revalidatePath("/admin/courses");
    return { ok: true, id };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, id };
  }
}

// ---------------------------------------------------------------------------
// SEMESTERS (no is_active column: list + upsert only; single-current in DB)
// ---------------------------------------------------------------------------
export async function upsertSemesterAction(
  _previous: ReferenceActionState,
  formData: FormData,
): Promise<ReferenceActionState> {
  const id = idOrNull(formData);
  const label = str(formData, "label");
  if (!label) return { ok: false, error: "A name is required.", id: id ?? undefined };

  const seasonRaw = formData.get("season");
  if (!isSemesterSeason(seasonRaw)) {
    return { ok: false, error: "Choose a season.", id: id ?? undefined };
  }
  const yearParsed = Number.parseInt(str(formData, "year"), 10);
  if (!Number.isFinite(yearParsed) || yearParsed < 2000 || yearParsed > 2100) {
    return { ok: false, error: "Enter a valid year.", id: id ?? undefined };
  }
  const startsOn = nullableStr(formData, "startsOn");
  const endsOn = nullableStr(formData, "endsOn");
  if (startsOn && endsOn && endsOn < startsOn) {
    return { ok: false, error: "The end date cannot be before the start date.", id: id ?? undefined };
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_upsert_semester", {
      p_id: id,
      p_label: label,
      p_season: seasonRaw,
      p_year: yearParsed,
      p_is_current: formData.get("isCurrent") === "true",
      p_starts_on: startsOn,
      p_ends_on: endsOn,
    });
    if (error) {
      return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), id: id ?? undefined };
    }
    revalidatePath("/admin/semesters");
    return { ok: true, id: typeof data === "string" ? data : (id ?? undefined) };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, id: id ?? undefined };
  }
}

// ---------------------------------------------------------------------------
// POSITIONS (README §31 blocklist enforced in DB)
// ---------------------------------------------------------------------------
export async function upsertPositionAction(
  _previous: ReferenceActionState,
  formData: FormData,
): Promise<ReferenceActionState> {
  const id = idOrNull(formData);
  const title = str(formData, "title");
  if (!title) return { ok: false, error: "A title is required.", id: id ?? undefined };

  const categoryRaw = formData.get("category");
  const category = isPersonCategory(categoryRaw) ? categoryRaw : null;

  const rankParsed = Number.parseInt(str(formData, "rank"), 10);
  const rank = Number.isFinite(rankParsed) ? rankParsed : null;

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_upsert_position", {
      p_id: id,
      p_title: title,
      p_rank: rank,
      p_category: category,
      p_is_active: activeDefaultTrue(formData),
    });
    if (error) {
      return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), id: id ?? undefined };
    }
    revalidatePath("/admin/positions");
    return { ok: true, id: typeof data === "string" ? data : (id ?? undefined) };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, id: id ?? undefined };
  }
}

export async function setPositionActiveAction(
  _previous: ReferenceActionState,
  formData: FormData,
): Promise<ReferenceActionState> {
  const id = idOrNull(formData);
  if (id === null) return { ok: false, error: "That item is not available." };
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("admin_set_position_active", {
      p_id: id,
      p_active: activeFlag(formData),
    });
    if (error) return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), id };
    revalidatePath("/admin/positions");
    return { ok: true, id };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, id };
  }
}
