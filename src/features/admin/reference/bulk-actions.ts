"use server";

import { revalidatePublicPath } from "@/lib/supabase/cache-invalidation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logBackendError } from "@/lib/server/diagnostics";
import { isUuid, pickSafeMessage } from "@/features/admin/shared";
import {
  parseCourseList,
  parseSemesterList,
  type BulkReferenceState,
} from "@/features/admin/reference/bulk-list";

const SAFE_MESSAGES = new Set([
  "You do not have access to this.",
  "Choose a department.",
  "Enter a valid course list.",
  "Enter a valid semester list.",
]);

export async function addCourseListAction(
  _previous: BulkReferenceState,
  formData: FormData,
): Promise<BulkReferenceState> {
  const departmentId = formData.get("departmentId");
  if (!isUuid(departmentId))
    return { ok: false, error: "Choose a department for this list." };
  const parsed = parseCourseList(String(formData.get("entries") ?? ""));
  if (parsed.error || !parsed.items.length)
    return { ok: false, error: parsed.error ?? "Enter at least one course." };
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_add_course_list", {
      p_department_id: departmentId,
      p_courses: parsed.items.map(({ title, code }) => ({ title, code })),
    });
    if (error) {
      logBackendError("admin.courses.bulk", error);
      return {
        ok: false,
        error: pickSafeMessage(error.message, SAFE_MESSAGES),
      };
    }
    const result = data?.[0];
    if (!result)
      return {
        ok: false,
        error: "We could not save this list. Please try again.",
      };
    revalidatePublicPath("/", "layout");
    return {
      ok: true,
      added: result.added,
      skipped: result.skipped + parsed.duplicates,
    };
  } catch (error) {
    logBackendError("admin.courses.bulk", error);
    return {
      ok: false,
      error: "We could not save this list. Please try again.",
    };
  }
}

export async function addSemesterListAction(
  _previous: BulkReferenceState,
  formData: FormData,
): Promise<BulkReferenceState> {
  const parsed = parseSemesterList(String(formData.get("entries") ?? ""));
  if (parsed.error || !parsed.items.length)
    return { ok: false, error: parsed.error ?? "Enter at least one semester." };
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_add_semester_list", {
      p_semesters: parsed.items.map(({ label, season, year }) => ({
        label,
        season,
        year,
      })),
    });
    if (error) {
      logBackendError("admin.semesters.bulk", error);
      return {
        ok: false,
        error: pickSafeMessage(error.message, SAFE_MESSAGES),
      };
    }
    const result = data?.[0];
    if (!result)
      return {
        ok: false,
        error: "We could not save this list. Please try again.",
      };
    revalidatePublicPath("/", "layout");
    return {
      ok: true,
      added: result.added,
      skipped: result.skipped + parsed.duplicates,
    };
  } catch (error) {
    logBackendError("admin.semesters.bulk", error);
    return {
      ok: false,
      error: "We could not save this list. Please try again.",
    };
  }
}
