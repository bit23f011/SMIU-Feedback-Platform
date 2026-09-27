import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ADMIN_FEEDBACK_PER_PAGE,
  EMPTY_FEEDBACK_PAGE,
  type AdminFeedbackFilters,
  type AdminFeedbackPage,
} from "@/features/admin/feedback/types";

/*
  Website feedback queue ka read (README §58, §59).

  SECURITY:
  - Aam anon-key client, service role NAHI. `admin_feedback_queue()` ke andar
    is_admin() gate hai, is liye non-admin ko sirf error milta hai, data nahi.
  - Bhejne wale ki shanaakht (student id, email, auth id) return NAHI hoti -
    sirf `from_student` boolean. `contact_email` wahi hai jo user ne khud
    follow-up ke liye diya, aur wo sirf admin queue me dikhta hai.
  - Error ka matan UI tak nahi jata; sirf `failed: true`.
*/
export async function getAdminFeedbackQueue(
  filters: AdminFeedbackFilters,
): Promise<AdminFeedbackPage> {
  try {
    const supabase = createSupabaseServerClient();

    const safePage =
      Number.isFinite(filters.page) && filters.page > 0 ? Math.floor(filters.page) : 1;
    const search = filters.search.trim();

    const { data, error } = await supabase.rpc("admin_feedback_queue", {
      p_status: filters.status,
      p_type: filters.type,
      p_search: search ? search : null,
      p_important_only: filters.importantOnly,
      p_limit: ADMIN_FEEDBACK_PER_PAGE,
      p_offset: (safePage - 1) * ADMIN_FEEDBACK_PER_PAGE,
    });

    if (error) return { ...EMPTY_FEEDBACK_PAGE, failed: true };
    if (!data || data.length === 0) return EMPTY_FEEDBACK_PAGE;

    return {
      failed: false,
      total: Number(data[0].total_count ?? 0),
      feedback: data.map((row) => ({
        id: row.feedback_id,
        type: row.feedback_type,
        rating: row.experience_rating === null ? null : Number(row.experience_rating),
        message: row.message,
        contactEmail: row.contact_email,
        status: row.status,
        isImportant: row.is_important,
        fromStudent: row.from_student,
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at,
      })),
    };
  } catch {
    return { ...EMPTY_FEEDBACK_PAGE, failed: true };
  }
}
