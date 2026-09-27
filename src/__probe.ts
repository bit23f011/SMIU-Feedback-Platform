import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function p0() {
  const s = createSupabaseServerClient();
  const { data } = await s.from("departments").select("id, name");
  return data ? data.map((r) => r.name) : [];
}
export async function p1() {
  const s = createSupabaseServerClient();
  const { data } = await s.from("review_criteria").select("id, key");
  return data ? data.map((r) => r.key) : [];
}
export async function p2() {
  const s = createSupabaseServerClient();
  const { data } = await s.rpc("is_admin");
  return data;
}
export async function p3() {
  const s = createSupabaseServerClient();
  const { data } = await s.rpc("review_limits");
  return data ? data[0].max_edits : 0;
}
