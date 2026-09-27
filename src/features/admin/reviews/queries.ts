import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ADMIN_QUEUE_PER_PAGE,
  EMPTY_QUEUE_PAGE,
  type AdminQueuePage,
  type ModerationQueueStatus,
} from "@/features/admin/reviews/types";

/*
  Admin moderation queue ka read.

  SECURITY:
  - Yeh normal anon-key client hai, service role NAHI. Function ke andar
    `is_admin()` ka check hai, is liye non-admin ko sirf error milta hai, data
    nahi. Frontend ka koi role check is ki jagah nahi le sakta.
  - `admin_review_queue()` me author ka koi column hai hi nahi. Admin ko text
    dikhta hai, likhne wala nahi - moderation anonymous rehti hai.
  - Error ka matan kabhi UI tak nahi jata; sirf `failed: true` jata hai.
*/
export async function getAdminReviewQueue(
  status: ModerationQueueStatus,
  page: number,
): Promise<AdminQueuePage> {
  try {
    const supabase = createSupabaseServerClient();

    // Page number URL se aata hai, is liye yahan saaf karna zaroori hai.
    // DB bhi apni taraf se limit/offset clamp karti hai.
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

    const { data, error } = await supabase.rpc("admin_review_queue", {
      p_status: status,
      p_limit: ADMIN_QUEUE_PER_PAGE,
      p_offset: (safePage - 1) * ADMIN_QUEUE_PER_PAGE,
    });

    if (error) return { ...EMPTY_QUEUE_PAGE, failed: true };
    if (!data || data.length === 0) return EMPTY_QUEUE_PAGE;

    return {
      failed: false,
      // count(*) over () LIMIT se pehle chalta hai, is liye yeh poora total hai.
      total: Number(data[0].total_count ?? 0),
      reviews: data.map((row) => ({
        id: row.review_id,
        personId: row.person_id,
        personSlug: row.person_slug,
        personName: row.person_name,
        category: row.category,
        overallRating: row.overall_rating,
        comment: row.comment,
        isFeatured: row.is_featured,
        courseTitle: row.course_title,
        semesterLabel: row.semester_label,
        createdAt: row.created_at,
      })),
    };
  } catch {
    return { ...EMPTY_QUEUE_PAGE, failed: true };
  }
}
