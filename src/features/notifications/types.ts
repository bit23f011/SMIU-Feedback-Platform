import type { NotificationPriority } from "@/lib/types";

// site_notifications table ki ek row (hand-written; generated types aane par yehi
// shape match karegi). Content DB se aata hai - kuch bhi hardcode nahi.
export interface NotificationRow {
  id: string;
  title: string | null;
  message: string;
  priority: NotificationPriority;
  href: string | null;
  cta_label: string | null;
  starts_at: string | null;
  ends_at: string | null;
}
