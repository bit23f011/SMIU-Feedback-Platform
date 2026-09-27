import type { Database } from "@/lib/supabase/database.types";

/*
  Admin notifications ke shared types (README §54).

  Yeh site-wide notifications hain (banner/announcement) jo admin banata hai.
  System khud schedule ke mutabiq inhein live/off karta hai - koi source-code
  badalne ki zaroorat nahi. is_live_now us window ka natija hai jo public read
  dekhti hai (is_active + abhi ka waqt starts_at/ends_at ke beech).

  AUTHORITY yahan nahi: list/upsert/delete sab admin RPC (is_admin()) tay karti
  hain. Yeh file sirf naam aur shakal deti hai.
*/

export type NotificationPriority = Database["public"]["Enums"]["notification_priority"];

export const NOTIFICATION_PRIORITIES = [
  "info",
  "success",
  "warning",
  "critical",
] as const;

export const DEFAULT_NOTIFICATION_PRIORITY: NotificationPriority = "info";

export const NOTIFICATION_PRIORITY_LABELS: Record<NotificationPriority, string> = {
  info: "Info",
  success: "Success",
  warning: "Warning",
  critical: "Critical",
};

/** README §54: message ki max length (server bhi 1000 par enforce karta hai). */
export const NOTIFICATION_MESSAGE_MAX = 1000;

/** README §29: browser me bohat saara data ek saath na aaye. */
export const ADMIN_NOTIFICATIONS_PER_PAGE = 50;

export interface AdminNotification {
  id: string;
  title: string | null;
  message: string;
  priority: NotificationPriority;
  href: string | null;
  ctaLabel: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  /** is_active + abhi waqt window me. Yehi public ko dikhta hai. */
  isLiveNow: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNotificationPage {
  notifications: AdminNotification[];
  total: number;
  /* Query chali hi nahi (network ya is_admin() ne roka) - khali list se alag. */
  failed: boolean;
}

export const EMPTY_NOTIFICATION_PAGE: AdminNotificationPage = {
  notifications: [],
  total: 0,
  failed: false,
};

export function isNotificationPriority(value: unknown): value is NotificationPriority {
  return (
    typeof value === "string" &&
    (NOTIFICATION_PRIORITIES as readonly string[]).includes(value)
  );
}
