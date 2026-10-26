"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GENERIC_ADMIN_ERROR, pickSafeMessage } from "@/features/admin/shared";
import { logBackendError } from "@/lib/server/diagnostics";
import { WEBSITE_FIELDS, type WebsiteActionState } from "./types";

export async function updateWebsiteAction(
  _previous: WebsiteActionState,
  form: FormData,
): Promise<WebsiteActionState> {
  const mode = form.get("mode");
  const args: {
    p_is_enabled?: boolean;
    p_greeting?: string;
    p_title?: string;
    p_message?: string;
    p_farewell?: string;
    p_signature?: string;
  } = {};
  if (mode === "toggle") {
    const enabled = form.get("enabled");
    if (enabled !== "true" && enabled !== "false")
      return { ok: false, error: "Choose Website ON or OFF." };
    args.p_is_enabled = enabled === "true";
  } else if (mode === "message") {
    for (const field of WEBSITE_FIELDS) {
      const raw = form.get(field.key);
      if (
        typeof raw !== "string" ||
        raw.trim().length > field.maxLength ||
        (field.required && !raw.trim())
      ) {
        return {
          ok: false,
          error: `Check ${field.label.toLowerCase()} (maximum ${field.maxLength} characters).`,
        };
      }
      args[`p_${field.key}`] = raw.trim();
    }
  } else return { ok: false, error: "Choose a website control." };
  try {
    const { error } = await createSupabaseServerClient().rpc(
      "admin_update_website_availability",
      args,
    );
    if (error) {
      logBackendError("admin.website.write", error);
      return {
        ok: false,
        error: pickSafeMessage(
          error.message,
          new Set([
            "You do not have access to this.",
            "Please check the message fields and their length limits.",
          ]),
        ),
      };
    }
  } catch (error) {
    logBackendError("admin.website.write", error);
    return { ok: false, error: GENERIC_ADMIN_ERROR };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
