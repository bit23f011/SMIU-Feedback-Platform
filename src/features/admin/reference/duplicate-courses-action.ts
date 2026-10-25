"use server";

import { revalidatePublicPath } from "@/lib/supabase/cache-invalidation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logBackendError } from "@/lib/server/diagnostics";

export type DuplicateCoursesState = {
  ok: boolean;
  deleted?: number;
  error?: string;
};

export async function deleteDuplicateCoursesAction(
  _previous: DuplicateCoursesState,
  _formData: FormData,
): Promise<DuplicateCoursesState> {
  try {
    const { data, error } = await createSupabaseServerClient().rpc(
      "admin_delete_duplicate_courses",
    );
    if (error) {
      logBackendError("admin.courses.duplicates", error);
      return {
        ok: false,
        error:
          error.message === "You do not have access to this."
            ? error.message
            : "Could not remove duplicates. Please try again.",
      };
    }
    revalidatePublicPath("/", "layout");
    return { ok: true, deleted: data };
  } catch (error) {
    logBackendError("admin.courses.duplicates", error);
    return {
      ok: false,
      error: "Could not remove duplicates. Please try again.",
    };
  }
}
