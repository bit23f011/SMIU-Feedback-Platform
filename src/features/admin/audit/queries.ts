import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  AUDIT_PAGE_SIZE,
  EMPTY_AUDIT_VIEW,
  type AdminAuditView,
} from "@/features/admin/audit/types";

/*
  Audit log ka read (README §49, §103).

  SECURITY:
  - Aam anon-key client, service role NAHI. admin_audit_list ke andar is_admin()
    gate hai; actor ka email left-join se aata hai (admin-only surface).
  - Read-only. Error UI tak nahi jata; sirf `failed: true`.
*/

interface AuditQueryInput {
  entityType?: string | null;
  page?: number;
}

export async function getAdminAudit(input: AuditQueryInput = {}): Promise<AdminAuditView> {
  const page = Math.max(1, Math.trunc(input.page ?? 1));
  const pageSize = AUDIT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  const entity = (input.entityType ?? "").trim();

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_audit_list", {
      p_entity_type: entity ? entity : null,
      p_limit: pageSize,
      p_offset: offset,
    });

    if (error) return { ...EMPTY_AUDIT_VIEW, page, failed: true };
    if (!data || data.length === 0) return { ...EMPTY_AUDIT_VIEW, page };

    return {
      failed: false,
      page,
      pageSize,
      total: Number(data[0]?.total_count ?? 0),
      items: data.map((row) => ({
        id: row.id,
        actorId: row.actor_id,
        actorEmail: row.actor_email,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        details: row.details,
        createdAt: row.created_at,
      })),
    };
  } catch {
    return { ...EMPTY_AUDIT_VIEW, page, failed: true };
  }
}
