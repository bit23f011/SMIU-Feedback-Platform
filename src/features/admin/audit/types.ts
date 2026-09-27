import type { Json } from "@/lib/supabase/database.types";

/*
  Audit log viewer ke types (README §49, §103).

  Har admin action (create/update/activate/deactivate/merge/reset wagera) audit
  log me jati hai. Yeh viewer read-only hai: actor (email admin-only), action,
  entity, aur details (jsonb) dikhata hai. Yahan koi secret nahi likha jata.
*/

export interface AdminAuditEntry {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Json | null;
  createdAt: string;
}

export const AUDIT_PAGE_SIZE = 50;

/*
  Aam entity types (quick filter chips). Yeh un migrations se pukhta hain jo yeh
  audit rows likhti hain. List me na hone wale types phir bhi log me aate hain;
  filter free-text se bhi ho sakta hai.
*/
export const AUDIT_ENTITY_QUICK_FILTERS: readonly string[] = [
  "person",
  "person_role",
  "teacher_assignment",
  "department",
  "program",
  "course",
  "semester",
  "position",
  "platform_settings",
];

export interface AdminAuditView {
  items: AdminAuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  failed: boolean;
}

export const EMPTY_AUDIT_VIEW: AdminAuditView = {
  items: [],
  total: 0,
  page: 1,
  pageSize: AUDIT_PAGE_SIZE,
  failed: false,
};
