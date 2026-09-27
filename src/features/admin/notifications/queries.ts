import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ADMIN_NOTIFICATIONS_PER_PAGE,
  EMPTY_NOTIFICATION_PAGE,
  type AdminNotificationPage,
} from "@/features/admin/notifications/types";

/*
  Notifications list ka read (README §54).

  SECURITY:
  - Aam anon-key client, service role NAHI. `admin_notification_list()` ke andar
    is_admin() gate hai, is liye non-admin ko sirf error milta hai, data nahi.
  - Yeh admin view hai: inactive/expired notifications bhi aati hain + is_live_now
    flag. Public read alag hai (sirf abhi live wali).
  - Error ka matan UI tak nahi jata; sirf `failed: true`.
*/
export async function getAdminNotifications(page: number): Promise<AdminNotificationPage> {
  try {
    const supabase = createSupabaseServerClient();

    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

    const { data, error } = await supabase.rpc("admin_notification_list", {
      p_limit: ADMIN_NOTIFICATIONS_PER_PAGE,
      p_offset: (safePage - 1) * ADMIN_NOTIFICATIONS_PER_PAGE,
    });

    if (error) return { ...EMPTY_NOTIFICATION_PAGE, failed: true };
    if (!data || data.length === 0) return EMPTY_NOTIFICATION_PAGE;

    return {
      failed: false,
      total: Number(data[0].total_count ?? 0),
      notifications: data.map((row) => ({
        id: row.id,
        title: row.title,
        message: row.message,
        priority: row.priority,
        href: row.href,
        ctaLabel: row.cta_label,
        isActive: row.is_active,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        isLiveNow: row.is_live_now,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    };
  } catch {
    return { ...EMPTY_NOTIFICATION_PAGE, failed: true };
  }
}
