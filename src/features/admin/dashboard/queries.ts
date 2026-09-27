import { getAdminReviewQueue } from "@/features/admin/reviews/queries";
import { getAdminReportQueue } from "@/features/admin/reports/queries";
import { getAdminFeedbackQueue } from "@/features/admin/feedback/queries";
import { DEFAULT_FEEDBACK_STATUS } from "@/features/admin/feedback/types";

/*
  Admin dashboard ke counts (README §103 ke spirit me: admin ko ek nazar me pata
  chale kahan kaam pADa hai).

  SOURCE: yeh koi naya DB function nahi banata. Teen mojooda admin queue RPCs ka
  `total_count` (limit 1 ke saath) reuse karta hai, taake DB layer band rahe aur
  har jagah wahi is_admin() gate lage.

  - `failed` sirf tab true jab query hi na chali (network ya is_admin() ne roka).
    Aisi surat me UI count ke bajaye ek halka sa note dikhati hai - "0" nahi, jo
    ghalat tassali de.
  - Teenon reads parallel chalti hain (ek doosre par depend nahi).
*/

export interface AdminDashboardStats {
  pendingReviews: number;
  pendingReports: number;
  newFeedback: number;
  /** Koi bhi count fetch fail hui (is_admin()/network). */
  failed: boolean;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [reviews, reports, feedback] = await Promise.all([
    getAdminReviewQueue("pending", 1),
    getAdminReportQueue("pending", 1),
    getAdminFeedbackQueue({
      status: DEFAULT_FEEDBACK_STATUS,
      type: null,
      search: "",
      importantOnly: false,
      page: 1,
    }),
  ]);

  return {
    pendingReviews: reviews.total,
    pendingReports: reports.total,
    newFeedback: feedback.total,
    failed: reviews.failed || reports.failed || feedback.failed,
  };
}
