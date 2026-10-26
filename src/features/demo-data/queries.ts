import { cache } from "react";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logBackendError } from "@/lib/server/diagnostics";
import type { DemoDataState } from "./types";

export const isDemoDataEnabled = cache(async (): Promise<boolean> => {
  try {
    const { data, error } = await createSupabasePublicClient()
      .from("demo_data_settings")
      .select("is_enabled")
      .eq("id", true)
      .maybeSingle();
    return !error && data?.is_enabled === true;
  } catch {
    return false;
  }
});

export async function getAdminDemoDataState(): Promise<DemoDataState | null> {
  try {
    const { data, error } = await createSupabaseServerClient().rpc(
      "admin_demo_data_state",
    );
    const row = data?.[0];
    if (error || !row) {
      if (error) logBackendError("admin.demo-data.read", error);
      return null;
    }
    return {
      enabled: row.is_enabled,
      teacherCount: Number(row.teacher_count),
      ratingCount: Number(row.rating_count),
      commentCount: Number(row.comment_count),
    };
  } catch (error) {
    logBackendError("admin.demo-data.read", error);
    return null;
  }
}
