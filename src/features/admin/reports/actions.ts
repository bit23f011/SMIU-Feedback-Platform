"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GENERIC_ADMIN_ERROR, isSlug, isUuid, pickSafeMessage } from "@/features/admin/shared";
import { isReportResolveAction } from "@/features/admin/reports/types";
import type { ReportActionState } from "@/features/admin/reports/form-state";

/*
  Reports ke writes (README §51, §52, §53).

  ASOOL: yahan koi permission tay nahi hoti. Har RPC SECURITY DEFINER hai aur
  pehla kaam is_admin() check, phir har faisla admin_audit_log me. Agar yeh file
  poori hata di jaye, DB ka rawaiya wahi rehta hai. Neeche ke check sirf behtar
  message ke liye hain.

  README §51 ka bunyaadi asool: report ACCEPT karna khud profile ko delete ya
  band NAHI karta. Profile band karna (setPersonActiveAction) ek ALAG, explicit
  step hai jis me reason zaroori hai.

  NOTE: ReportActionState type aur EMPTY_REPORT_ACTION_STATE ab ek alag plain
  module (form-state.ts) me hain. Wajah: "use server" file sirf async functions
  export kar sakti hai - type/object yahan se export karna build par error deta.
*/

const SAFE_MESSAGES = new Set<string>([
  "You do not have access to this.",
  "That action is not allowed.",
  "That report is not available.",
  "Please keep the note shorter.",
  "A reason is required.",
  "Please keep the reason shorter.",
  "That profile is not available.",
  "Choose two different profiles.",
  "The profile to keep is not available.",
  "The duplicate profile is not available.",
]);

function revalidateReportViews(personSlug: unknown) {
  // Queue khud badalti hai; profile ki public halat bhi badal sakti hai.
  revalidatePath("/admin/reports");
  if (isSlug(personSlug)) {
    revalidatePath(`/people/${personSlug}`);
  }
}

/* README §51: pending report ko accept/reject. Profile ko chhuta nahi. */
export async function resolveReportAction(
  _previous: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const reportId = formData.get("reportId");
  const action = formData.get("action");
  const note = (formData.get("note") ?? "").toString();
  const personSlug = formData.get("personSlug");

  if (!isUuid(reportId)) {
    return { ok: false, error: GENERIC_ADMIN_ERROR };
  }
  if (!isReportResolveAction(action)) {
    return { ok: false, error: "That action is not allowed.", reportId };
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("resolve_report", {
      p_report_id: reportId,
      p_action: action,
      p_note: note.trim() ? note.trim() : null,
    });
    if (error) {
      return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), reportId };
    }
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, reportId };
  }

  revalidateReportViews(personSlug);
  return { ok: true, reportId };
}

/*
  README §51 ka explicit step: profile ko deactivate ya wapas activate karna.
  Reason zaroori. Yeh accept-report se bilkul alag hai.
*/
export async function setPersonActiveAction(
  _previous: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const personId = formData.get("personId");
  const active = formData.get("active") === "true";
  const reason = (formData.get("reason") ?? "").toString();
  const personSlug = formData.get("personSlug");

  if (!isUuid(personId)) {
    return { ok: false, error: GENERIC_ADMIN_ERROR };
  }
  if (!reason.trim()) {
    return { ok: false, error: "A reason is required.", personId };
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("set_person_active", {
      p_person_id: personId,
      p_active: active,
      p_reason: reason.trim(),
    });
    if (error) {
      return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), personId };
    }
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, personId };
  }

  revalidateReportViews(personSlug);
  return { ok: true, personId };
}

/*
  README §52: do profile merge. Duplicate ke children canonical par jaate hain,
  duplicate deactivate ho jata hai. Double counting DB me sambhali jati hai.
*/
export async function mergePeopleAction(
  _previous: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const canonicalId = formData.get("canonicalId");
  const duplicateId = formData.get("duplicateId");
  const reason = (formData.get("reason") ?? "").toString();
  const canonicalSlug = formData.get("canonicalSlug");
  const duplicateSlug = formData.get("duplicateSlug");

  if (!isUuid(canonicalId) || !isUuid(duplicateId)) {
    return { ok: false, error: GENERIC_ADMIN_ERROR };
  }
  if (canonicalId === duplicateId) {
    return { ok: false, error: "Choose two different profiles.", personId: canonicalId };
  }
  if (!reason.trim()) {
    return { ok: false, error: "A reason is required.", personId: canonicalId };
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("admin_merge_people", {
      p_canonical_id: canonicalId,
      p_duplicate_id: duplicateId,
      p_reason: reason.trim(),
    });
    if (error) {
      return {
        ok: false,
        error: pickSafeMessage(error.message, SAFE_MESSAGES),
        personId: canonicalId,
      };
    }
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, personId: canonicalId };
  }

  revalidatePath("/admin/reports");
  if (isSlug(canonicalSlug)) revalidatePath(`/people/${canonicalSlug}`);
  if (isSlug(duplicateSlug)) revalidatePath(`/people/${duplicateSlug}`);
  return { ok: true, personId: canonicalId };
}

/*
  README §53: kisi profile ke reviews reset. Archival hai (delete nahi) aur DB me
  reason zaroori. Aggregate foran 0 ho jata hai.
*/
export async function resetPersonReviewsAction(
  _previous: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const personId = formData.get("personId");
  const reason = (formData.get("reason") ?? "").toString();
  const personSlug = formData.get("personSlug");

  if (!isUuid(personId)) {
    return { ok: false, error: GENERIC_ADMIN_ERROR };
  }
  if (!reason.trim()) {
    return { ok: false, error: "A reason is required.", personId };
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("admin_reset_person_reviews", {
      p_person_id: personId,
      p_reason: reason.trim(),
    });
    if (error) {
      return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), personId };
    }
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, personId };
  }

  revalidateReportViews(personSlug);
  return { ok: true, personId };
}
