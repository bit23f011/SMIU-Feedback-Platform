import { createSupabaseServerClient } from "@/lib/supabase/server";

import { NotificationBannerClient } from "@/features/notifications/notification-banner-client";
import type { NotificationRow } from "@/features/notifications/types";

/*
  Website-open / announcement banner.
  - Content DB (site_notifications) se aata hai, koi hardcoded text nahi.
  - Schedule-aware: sirf woh notice jo is waqt active hai (starts_at/ends_at window)
    aur is_active = true. Server time (now) se compare hota hai - frontend clock trust nahi.
  - Sabse latest active notice dikhata hai.
  - Fail-safe: agar table abhi nahi bani (migration apply se pehle) ya koi error ho,
    to banner silently skip ho jata hai (site kabhi crash nahi karti).

  NOTE: yeh server client cookies() use karta hai, isliye jis page par render hoga
  woh dynamic ho jayega - matlab admin ka change turant nazar aata hai (build ki
  zaroorat nahi).
*/
export async function NotificationBanner() {
  let row: NotificationRow | null = null;

  try {
    const supabase = createSupabaseServerClient();
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("site_notifications")
      .select("id,title,message,priority,href,cta_label,starts_at,ends_at")
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      row = data as unknown as NotificationRow;
    }
  } catch {
    // Table missing / env missing / network - banner ko skip karo, site chalti rahe.
    row = null;
  }

  if (!row) return null;

  return <NotificationBannerClient notification={row} />;
}
