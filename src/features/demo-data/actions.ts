"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PUBLIC_DATA_TAG } from "@/lib/supabase/public";
import { GENERIC_ADMIN_ERROR, pickSafeMessage } from "@/features/admin/shared";
import { logBackendError } from "@/lib/server/diagnostics";
import type { DemoDataActionState } from "./types";

export async function setDemoDataAction(
  _previous: DemoDataActionState,
  formData: FormData,
): Promise<DemoDataActionState> {
  const enabled = formData.get("enabled");
  if (enabled !== "true" && enabled !== "false") {
    return { ok: false, error: "Choose ON or OFF." };
  }
  try {
    const { error } = await createSupabaseServerClient().rpc(
      "admin_set_demo_data",
      {
        p_enabled: enabled === "true",
      },
    );
    if (error) {
      logBackendError("admin.demo-data.write", error);
      return {
        ok: false,
        error: pickSafeMessage(
          error.message,
          new Set(["You do not have access to this."]),
        ),
      };
    }
  } catch (error) {
    logBackendError("admin.demo-data.write", error);
    return { ok: false, error: GENERIC_ADMIN_ERROR };
  }
  // Clear directory/profile/rankings caches and the persistent public layout together.
  revalidateTag(PUBLIC_DATA_TAG);
  revalidatePath("/", "layout");
  return { ok: true };
}
