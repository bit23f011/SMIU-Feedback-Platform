import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  EMPTY_CRITERIA_VIEW,
  type AdminCriteriaView,
} from "@/features/admin/criteria/types";

/*
  Review criteria ka read (README §49).

  SECURITY:
  - Aam anon-key client, service role NAHI. `admin_criteria_list()` ke andar
    is_admin() gate hai, is liye non-admin ko sirf error milta hai, data nahi.
  - Inactive criteria bhi aate hain (admin ko poora manzar chahiye) + har ek ka
    answer_count (taake pata rahe kis criterion par data lag chuka hai).
  - Error ka matan UI tak nahi jata; sirf `failed: true`.

  DB pehle hi category, sort_order, key par sort karta hai, is liye yahan dobara
  sort ki zaroorat nahi.
*/
export async function getAdminCriteria(): Promise<AdminCriteriaView> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_criteria_list");

    if (error) return { ...EMPTY_CRITERIA_VIEW, failed: true };
    if (!data || data.length === 0) return EMPTY_CRITERIA_VIEW;

    return {
      failed: false,
      criteria: data.map((row) => ({
        id: row.id,
        category: row.category,
        key: row.key,
        label: row.label,
        helpText: row.help_text,
        kind: row.kind,
        sortOrder: Number(row.sort_order ?? 0),
        isActive: row.is_active,
        answerCount: Number(row.answer_count ?? 0),
      })),
    };
  } catch {
    return { ...EMPTY_CRITERIA_VIEW, failed: true };
  }
}
