import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ADMIN_REPORTS_PER_PAGE,
  EMPTY_REPORT_PAGE,
  type AdminReportPage,
  type ReportStatus,
} from "@/features/admin/reports/types";

/*
  Reports queue ka read (README §51).

  SECURITY:
  - Aam anon-key client, service role NAHI. `admin_report_queue()` ke andar
    `is_admin()` hai, is liye non-admin ko sirf error milta hai, data nahi.
  - Reporter ki koi shanaakht return nahi hoti - queue me reporter ka naam/email
    kuch nahi aata.
  - Error ka matan UI tak nahi jata; sirf `failed: true`.
*/
export async function getAdminReportQueue(
  status: ReportStatus,
  page: number,
): Promise<AdminReportPage> {
  try {
    const supabase = createSupabaseServerClient();

    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

    const { data, error } = await supabase.rpc("admin_report_queue", {
      p_status: status,
      p_limit: ADMIN_REPORTS_PER_PAGE,
      p_offset: (safePage - 1) * ADMIN_REPORTS_PER_PAGE,
    });

    if (error) return { ...EMPTY_REPORT_PAGE, failed: true };
    if (!data || data.length === 0) return EMPTY_REPORT_PAGE;

    return {
      failed: false,
      total: Number(data[0].total_count ?? 0),
      reports: data.map((row) => ({
        id: row.report_id,
        personId: row.person_id,
        personSlug: row.person_slug,
        personName: row.person_name,
        personActive: row.is_active,
        reason: row.reason,
        details: row.details,
        status: row.status,
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at,
        resolutionNote: row.resolution_note,
        reportCount: Number(row.report_count ?? 0),
      })),
    };
  } catch {
    return { ...EMPTY_REPORT_PAGE, failed: true };
  }
}
