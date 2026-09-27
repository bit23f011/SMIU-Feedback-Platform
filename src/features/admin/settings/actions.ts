"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GENERIC_ADMIN_ERROR, pickSafeMessage } from "@/features/admin/shared";
import { isFeatureFlagKey } from "@/features/admin/settings/types";
import type { FeatureFlagActionState } from "@/features/admin/settings/form-state";

/*
  Feature controls ke writes (README §55).

  ASOOL: yahan koi authority nahi. set_feature_flag SECURITY DEFINER + is_admin()
  hai aur schedule ka waqt server-side authoritative hai. Yeh file sirf key ki
  shakal check karti hai aur behtar message deti hai.

  Do surtein:
   - Toggle / schedule set karna: enabled aur (optional) starts/ends bhejo.
   - Schedule clear karna: clearSchedule=true (DB dono waqt null kar deta hai;
     coalesce se null "no-change" hota, is liye alag flag chahiye).

  NOTE: FeatureFlagActionState type aur EMPTY_FEATURE_FLAG_ACTION_STATE ab ek alag
  plain module (form-state.ts) me hain. Wajah: "use server" file sirf async
  functions export kar sakti hai - type/object yahan se export karna build par
  error deta.
*/

const SAFE_MESSAGES = new Set<string>([
  "You do not have access to this.",
  "The end time must be after the start time.",
  "That control is not available.",
]);

function cleanTimestamp(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function setFeatureFlagAction(
  _previous: FeatureFlagActionState,
  formData: FormData,
): Promise<FeatureFlagActionState> {
  const key = formData.get("key");

  // Sirf known keys. DB bhi rok deta hai, magar yahan behtar message milta hai.
  if (!isFeatureFlagKey(key)) {
    return { ok: false, error: "That control is not available." };
  }

  const clearSchedule = formData.get("clearSchedule") === "true";

  // enabled optional: "true"/"false" ho to badlo, warna na chheiro (null).
  const enabledRaw = formData.get("enabled");
  let enabled: boolean | null = null;
  if (enabledRaw === "true") enabled = true;
  else if (enabledRaw === "false") enabled = false;

  const startsAt = clearSchedule ? null : cleanTimestamp(formData.get("startsAt"));
  const endsAt = clearSchedule ? null : cleanTimestamp(formData.get("endsAt"));

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("set_feature_flag", {
      p_key: key,
      p_enabled: enabled,
      p_starts_at: startsAt,
      p_ends_at: endsAt,
      p_clear_schedule: clearSchedule,
    });
    if (error) {
      return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), key };
    }
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, key };
  }

  revalidatePath("/admin/settings");
  return { ok: true, key };
}
