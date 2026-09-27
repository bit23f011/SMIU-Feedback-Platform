"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GENERIC_ADMIN_ERROR, isUuid, pickSafeMessage } from "@/features/admin/shared";
import {
  isCriterionKey,
  isCriterionKind,
  isPersonCategory,
  type PersonCategory,
  type ReviewCriterionKind,
} from "@/features/admin/criteria/types";
import type { CriterionActionState } from "@/features/admin/criteria/form-state";

/*
  Review criteria ke writes (README §49).

  ASOOL: yahan koi authority nahi. admin_upsert_criterion SECURITY DEFINER +
  is_admin() hai aur audit hoti hai. Yeh file sirf shakal check karti hai.

  Do surtein:
   - Naya (id khali): category + key + kind + label zaroori. Hard rules DB me bhi.
   - Update (id maujood): DB sirf label/help/sort/is_active badalta hai;
     category/key/kind ko haath nahi lagata (purane jawaabon ka matlab qaim rahe).
     Phir bhi RPC signature inhein maangti hai, is liye edit form current values
     (hidden) bhejti hai aur hum unhein aage pass kar dete hain.

  NOTE: CriterionActionState type aur EMPTY_CRITERION_ACTION_STATE ab ek alag
  plain module (form-state.ts) me hain. Wajah: "use server" file sirf async
  functions export kar sakti hai - type/object yahan se export karna build par
  error deta.
*/

const SAFE_MESSAGES = new Set<string>([
  "You do not have access to this.",
  "A label is required.",
  "The key may use only lowercase letters, numbers and underscores.",
  "Category and kind are required.",
  "That criterion is not available.",
]);

export async function upsertCriterionAction(
  _previous: CriterionActionState,
  formData: FormData,
): Promise<CriterionActionState> {
  const idRaw = formData.get("criterionId");
  const id = isUuid(idRaw) ? idRaw : null;

  const label = (formData.get("label") ?? "").toString().trim();
  const helpRaw = (formData.get("helpText") ?? "").toString().trim();
  const helpText = helpRaw ? helpRaw : null;

  const categoryRaw = formData.get("category");
  const kindRaw = formData.get("kind");
  const keyRaw = (formData.get("key") ?? "").toString().trim().toLowerCase();

  // Category aur kind hamesha valid enum hone chahiye (create par naya, update par
  // hidden current value). Warna behtar message.
  if (!isPersonCategory(categoryRaw) || !isCriterionKind(kindRaw)) {
    return { ok: false, error: "Category and kind are required.", criterionId: id ?? undefined };
  }
  const category: PersonCategory = categoryRaw;
  const kind: ReviewCriterionKind = kindRaw;

  if (!label) {
    return { ok: false, error: "A label is required.", criterionId: id ?? undefined };
  }

  // Naye criterion ke liye key ki shakal check. Update par DB key ignore karta hai,
  // magar hum phir bhi maujooda key bhejte hain jo pehle se valid hoti hai.
  if (id === null && !isCriterionKey(keyRaw)) {
    return {
      ok: false,
      error: "The key may use only lowercase letters, numbers and underscores.",
    };
  }

  const sortRaw = Number.parseInt((formData.get("sortOrder") ?? "").toString(), 10);
  const sortOrder = Number.isFinite(sortRaw) ? sortRaw : 0;
  const isActive = formData.get("isActive") !== "false"; // default active

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_upsert_criterion", {
      p_id: id,
      p_category: category,
      p_key: keyRaw,
      p_label: label,
      p_help_text: helpText,
      p_kind: kind,
      p_sort_order: sortOrder,
      p_is_active: isActive,
    });
    if (error) {
      return {
        ok: false,
        error: pickSafeMessage(error.message, SAFE_MESSAGES),
        criterionId: id ?? undefined,
      };
    }
    revalidatePath("/admin/criteria");
    return { ok: true, criterionId: typeof data === "string" ? data : (id ?? undefined) };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, criterionId: id ?? undefined };
  }
}
