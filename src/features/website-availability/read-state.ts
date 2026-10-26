import { getSupabaseClientEnv } from "@/lib/env";
import {
  DEFAULT_WEBSITE_SETTINGS,
  WEBSITE_FIELDS,
  type WebsiteSettings,
  type WebsiteState,
} from "./types";

/** Edge-compatible anonymous read. Availability must never use a stale page cache. */
export async function readWebsiteState(
  fetcher: typeof fetch = fetch,
): Promise<WebsiteState> {
  try {
    const { url, anonKey } = getSupabaseClientEnv();
    const endpoint = new URL("/rest/v1/website_availability", url);
    endpoint.searchParams.set(
      "select",
      "is_enabled,greeting,title,message,farewell,signature",
    );
    endpoint.searchParams.set("id", "eq.true");
    const response = await fetcher(endpoint, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    const data: unknown = await response.json();
    // Backward-compatible deployment before the additive migration is installed.
    if (!response.ok) {
      const code =
        data && typeof data === "object"
          ? (data as { code?: string }).code
          : null;
      if (
        response.status === 404 &&
        (code === "PGRST205" || code === "42P01")
      ) {
        return { status: "open", settings: { ...DEFAULT_WEBSITE_SETTINGS } };
      }
      return { status: "unavailable", settings: null };
    }
    if (!Array.isArray(data) || data.length !== 1)
      return { status: "unavailable", settings: null };
    const row = data[0] as Record<string, unknown>;
    if (
      typeof row?.is_enabled !== "boolean" ||
      WEBSITE_FIELDS.some(
        (field) =>
          typeof row[field.key] !== "string" ||
          (row[field.key] as string).length > field.maxLength ||
          (field.required && !(row[field.key] as string).trim()),
      )
    ) {
      return { status: "unavailable", settings: null };
    }
    const settings = Object.fromEntries([
      ["is_enabled", row.is_enabled],
      ...WEBSITE_FIELDS.map((field) => [field.key, row[field.key]]),
    ]) as unknown as WebsiteSettings;
    return { status: settings.is_enabled ? "open" : "closed", settings };
  } catch {
    return { status: "unavailable", settings: null };
  }
}
