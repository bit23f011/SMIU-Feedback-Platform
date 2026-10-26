import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logBackendError } from "@/lib/server/diagnostics";
import type { WebsiteSettings } from "./types";

export async function getAdminWebsiteSettings(): Promise<WebsiteSettings | null> {
  try {
    const { data, error } = await createSupabaseServerClient().rpc(
      "admin_website_availability",
    );
    if (error) {
      logBackendError("admin.website.read", error);
      return null;
    }
    return data?.[0] ?? null;
  } catch (error) {
    logBackendError("admin.website.read", error);
    return null;
  }
}
