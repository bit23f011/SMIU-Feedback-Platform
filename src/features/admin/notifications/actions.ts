"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GENERIC_ADMIN_ERROR, isUuid, pickSafeMessage } from "@/features/admin/shared";
import {
  DEFAULT_NOTIFICATION_PRIORITY,
  isNotificationPriority,
  type NotificationPriority,
} from "@/features/admin/notifications/types";
import type { NotificationActionState } from "@/features/admin/notifications/form-state";

/*
  Notifications ke writes (README §54).

  ASOOL: yahan koi permission tay nahi hoti. admin_upsert_notification aur
  admin_delete_notification dono SECURITY DEFINER + is_admin() hain aur audit
  hoti hai. Yeh file sirf shakal check karti hai aur behtar message deti hai.

  Waqt: form se datetime-local aati hai (ya khali). Khali = null (koi schedule
  nahi). Server hi window ka waqt authoritative maanta hai (README §55/§54).

  NOTE: NotificationActionState type aur EMPTY_NOTIFICATION_ACTION_STATE ab ek
  alag plain module (form-state.ts) me hain. Wajah: "use server" file sirf async
  functions export kar sakti hai - type/object yahan se export karna build par
  error deta.
*/

const SAFE_MESSAGES = new Set<string>([
  "You do not have access to this.",
  "A message is required.",
  "Please keep the message shorter.",
  "The end time must be after the start time.",
  "That notification is not available.",
]);

/** datetime-local ya date string ko trim; khali ho to null. */
function cleanTimestamp(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function cleanText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/*
  README §54: notification banao ya update. p_id khali = naya, warna update.
  message zaroori (DB bhi enforce). priority valid enum honi chahiye.
*/
export async function upsertNotificationAction(
  _previous: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  const idRaw = formData.get("notificationId");
  // id sirf tab bhejo jab valid uuid ho; warna insert (null).
  const id = isUuid(idRaw) ? idRaw : null;

  const message = (formData.get("message") ?? "").toString().trim();
  const title = cleanText(formData.get("title"));
  const href = cleanText(formData.get("href"));
  const ctaLabel = cleanText(formData.get("ctaLabel"));
  const isActive = formData.get("isActive") === "true";
  const startsAt = cleanTimestamp(formData.get("startsAt"));
  const endsAt = cleanTimestamp(formData.get("endsAt"));

  const priorityRaw = formData.get("priority");
  let priority: NotificationPriority = DEFAULT_NOTIFICATION_PRIORITY;
  if (priorityRaw !== null && priorityRaw !== "") {
    if (!isNotificationPriority(priorityRaw)) {
      return { ok: false, error: "That action is not allowed." };
    }
    priority = priorityRaw;
  }

  // Server hi asal enforcer hai; yeh sirf behtar message ke liye.
  if (!message) {
    return { ok: false, error: "A message is required.", notificationId: id ?? undefined };
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_upsert_notification", {
      p_id: id,
      p_title: title,
      p_message: message,
      p_priority: priority,
      p_href: href,
      p_cta_label: ctaLabel,
      p_is_active: isActive,
      p_starts_at: startsAt,
      p_ends_at: endsAt,
    });
    if (error) {
      return {
        ok: false,
        error: pickSafeMessage(error.message, SAFE_MESSAGES),
        notificationId: id ?? undefined,
      };
    }
    revalidatePath("/admin/notifications");
    return { ok: true, notificationId: typeof data === "string" ? data : (id ?? undefined) };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, notificationId: id ?? undefined };
  }
}

/* README §54: notification hata do. Audit hoti hai. */
export async function deleteNotificationAction(
  _previous: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  const id = formData.get("notificationId");

  if (!isUuid(id)) {
    return { ok: false, error: GENERIC_ADMIN_ERROR };
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("admin_delete_notification", { p_id: id });
    if (error) {
      return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES), notificationId: id };
    }
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR, notificationId: id };
  }

  revalidatePath("/admin/notifications");
  return { ok: true, notificationId: id };
}
