"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isModerationAction } from "@/features/admin/reviews/types";
import type { ModerationState } from "@/features/admin/reviews/form-state";

/*
  Moderation ke writes (README §22).

  ASOOL: yahan koi permission tay nahi hoti. `moderate_review()` SECURITY
  DEFINER hai aur pehla hi kaam `is_admin()` check karna hai, phir har action
  `admin_audit_log` me likha jata hai. Agar yeh file poori hata di jaye, DB ka
  rawaiya bilkul wahi rehta hai.

  Is liye neeche jo check hain wo sirf behtar message ke liye hain, rok ke liye
  nahi. DevTools se `action` badal kar bhejna bekaar hai: jo list DB ke andar
  nahi, uska jawab "That action is not allowed." hai.

  NOTE: ModerationState type aur EMPTY_MODERATION_STATE ab ek alag plain module
  (form-state.ts) me hain. Wajah: "use server" file sirf async functions export
  kar sakti hai - type/object yahan se export karna build par error deta.
*/

const GENERIC_ERROR = "We could not apply that change right now. Please try again.";

/*
  Sirf yeh messages user tak jate hain. Yeh wahi text hai jo migration ki
  functions `raise exception` karti hain. In me table, column ya constraint ka
  koi naam nahi, is liye inhein dikhana mehfooz hai.
*/
const SAFE_DB_MESSAGES = new Set<string>([
  "You do not have access to this.",
  "That review is not available to moderate.",
  "Approve this review before featuring it.",
  "That action is not allowed.",
]);

function safeMessage(message: string | undefined): string {
  if (message && SAFE_DB_MESSAGES.has(message)) return message;
  return GENERIC_ERROR;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

export async function moderateReviewAction(
  _previous: ModerationState,
  formData: FormData,
): Promise<ModerationState> {
  const reviewId = formData.get("reviewId");
  const action = formData.get("action");
  const personSlug = (formData.get("personSlug") ?? "").toString();

  if (!isUuid(reviewId)) {
    return { ok: false, error: GENERIC_ERROR };
  }

  if (!isModerationAction(action)) {
    return { ok: false, error: "That action is not allowed.", reviewId };
  }

  try {
    const supabase = createSupabaseServerClient();

    const { error } = await supabase.rpc("moderate_review", {
      p_review_id: reviewId,
      p_action: action,
    });

    if (error) {
      return { ok: false, error: safeMessage(error.message), reviewId };
    }
  } catch {
    return { ok: false, error: GENERIC_ERROR, reviewId };
  }

  // Queue khud badalti hai, aur public profile par text ab dikh ya chhup sakta hai.
  revalidatePath("/admin/reviews");
  if (/^[a-z0-9-]+$/.test(personSlug)) {
    revalidatePath(`/people/${personSlug}`);
  }

  return { ok: true, reviewId };
}
