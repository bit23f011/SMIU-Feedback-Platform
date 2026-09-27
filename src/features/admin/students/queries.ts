import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  EMPTY_STUDENTS_VIEW,
  STUDENTS_PAGE_SIZE,
  type AdminStudentsView,
  type StudentStatus,
} from "@/features/admin/students/types";

/*
  Students / accounts ka read (README §49).

  SECURITY:
  - Aam anon-key client, service role NAHI. admin_students_list ke andar is_admin()
    gate hai; email sirf admin ko milta hai.
  - Yeh function REVIEWS se kabhi join nahi karta (anonymity), is liye kisi account
    ko uski reviews se jorna mumkin nahi.
  - Error UI tak nahi jata; sirf `failed: true`.
*/

interface StudentsQueryInput {
  search?: string | null;
  status?: StudentStatus;
  page?: number;
}

export async function getAdminStudents(input: StudentsQueryInput = {}): Promise<AdminStudentsView> {
  const page = Math.max(1, Math.trunc(input.page ?? 1));
  const pageSize = STUDENTS_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  const search = (input.search ?? "").trim();

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_students_list", {
      p_search: search ? search : null,
      p_status: input.status ?? "all",
      p_limit: pageSize,
      p_offset: offset,
    });

    if (error) return { ...EMPTY_STUDENTS_VIEW, page, failed: true };
    if (!data || data.length === 0) return { ...EMPTY_STUDENTS_VIEW, page };

    return {
      failed: false,
      page,
      pageSize,
      total: Number(data[0]?.total_count ?? 0),
      items: data.map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        isActive: row.is_active,
        createdAt: row.created_at,
      })),
    };
  } catch {
    return { ...EMPTY_STUDENTS_VIEW, page, failed: true };
  }
}
