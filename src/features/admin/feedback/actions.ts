"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GENERIC_ADMIN_ERROR, isUuid, pickSafeMessage } from "@/features/admin/shared";
import { isFeedbackStatus, type FeedbackStatus } from "@/features/admin/feedback/types";
import type { FeedbackActionState } from "@/features/admin/feedback/form-state";

/*
  Website feedback ke writes (README §58).

  ASOOL: yahan koi permission tay nahi hoti. `update_feedback` SECURITY DEFINER
  hai aur pehla kaam is_admin() check, phir har badlaav admin_audit_log me. Yeh
  file sirf shakal check karti hai aur behtar message deti hai.

  YAAD: feedback ka status/important badalna kisi teacher rating/ranking par asar
  NAHI daalta - yeh dataset bilkul alag hai (README §56).

  NOTE: FeedbackActionState type aur EMPTY_FEEDBACK_ACTION_STATE ab ek alag plain
  module (form-state.ts) me hain. Wajah: "use server" file sirf async functions
  export kar sakti hai - type/object yahan se export karna build par error deta.
*/

const SAFE_MESSAGES = new Set<string>([
  "You do not have access to this.",
  "Nothing to update.",
  "That feedback is not available.",
]);

/*
  README §58: feedback ka status badlo (New/Reviewing/Resolved/Archived) aur/ya
  "important" toggle karo. Dono me se kam se kam ek zaroori (DB bhi enforce karta
  hai). Status agar diya hai to valid enum hona chahiye.
*/
export async function updateFeedbackAction(
  _previous: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  const feedbackId = formData.get("feedbackId");
  const statusRaw = formData.get("status");
  const importantRaw = formData.get("important");

  if (!isUuid(feedbackId)) {
    return { ok: false, error: GENERIC_ADMIN_ERROR };
  }

  // status field ho bhi sakti hai, na bhi. Agar hai to valid honi chahiye.
  let status: FeedbackStatus | null = null;
  if (statusRaw !== null && statusRaw !== "") {
    if (!isFeedbackStatus(statusRaw)) {
      return { ok: false, error: "That action is not allowed.", feedbackId };
    }
    status = statusRaw;
  }

  // important: "true"/"false" bheji jati hai; missing = koi badlaav nahi.
  let important: boolean | null = null;
  if (importantRaw === "true") important = true;
  else if (importantRaw === "false") important = false;

  if (status === null && important === null) {
    return { ok: false, error: "Nothing to update.", feedbackId };
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("update_feedback", {
      p_feedback_id: feedbackId,
      p_status: status,
      p_important: important,
    });
    if (error) {
      return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), feedbackId };
    }
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, feedbackId };
  }

  revalidatePath("/admin/website-feedback");
  return { ok: true, feedbackId };
}
