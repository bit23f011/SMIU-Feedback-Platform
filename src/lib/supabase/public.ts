import { createClient } from "@supabase/supabase-js";
import { getSupabaseClientEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";
import { serverRealtimeOptions } from "@/lib/supabase/server-realtime";

export const PUBLIC_DATA_TAG = "public-feedback-data";
export const PUBLIC_RATINGS_TAG = "public-feedback-ratings";
export function publicReadTags(input: string | URL | Request) {
  const path = new URL(
    input instanceof Request ? input.url : String(input),
  ).pathname
    .split("/")
    .filter(Boolean);
  const resource = path[2] === "rpc" ? path[3] : path[2];
  const tags = [PUBLIC_DATA_TAG];
  if (["people", "directory_people"].includes(resource))
    tags.push("public-feedback-people");
  if (
    [
      "person_rating_stats",
      "person_criteria_stats",
      "person_reviews",
      "featured_person_reviews",
      "person_course_ratings",
      "person_semester_ratings",
      "directory_people",
      "directory_courses",
    ].includes(resource)
  )
    tags.push(PUBLIC_RATINGS_TAG);
  if (
    ["review_criteria", "courses", "semesters", "directory_courses"].includes(
      resource,
    )
  )
    tags.push("public-feedback-reference");
  if (resource === "home_images") tags.push("public-feedback-images");
  return tags;
}
const PUBLIC_TABLES = new Set([
  "demo_data_settings",
  "people",
  "person_rating_stats",
  "person_criteria_stats",
  "review_criteria",
  "home_images",
  "courses",
  "semesters",
]);
const PUBLIC_READ_RPC = new Set([
  "directory_people",
  "directory_courses",
  "person_reviews",
  "featured_person_reviews",
  "person_course_ratings",
  "person_semester_ratings",
]);

/** Cache only explicit anonymous reads; user sessions, private data and writes use the server client. */
export function isCacheablePublicRequest(
  input: string | URL | Request,
  init?: RequestInit,
): boolean {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const method = (
    init?.method ?? (input instanceof Request ? input.method : "GET")
  ).toUpperCase();
  const path = url.pathname.split("/").filter(Boolean);
  if (path[0] !== "rest" || path[1] !== "v1") return false;
  if (method === "GET" && PUBLIC_TABLES.has(path[2])) return true;
  return method === "POST" && path[2] === "rpc" && PUBLIC_READ_RPC.has(path[3]);
}

export function createSupabasePublicClient() {
  const { url, anonKey } = getSupabaseClientEnv();
  return createClient<Database, "public">(url, anonKey, {
    realtime: serverRealtimeOptions,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch(input, init) {
        if (!isCacheablePublicRequest(input, init))
          return fetch(input, { ...init, cache: "no-store" });
        const timeout = AbortSignal.timeout(10_000);
        return fetch(input, {
          ...init,
          signal: init?.signal
            ? AbortSignal.any([init.signal, timeout])
            : timeout,
          next: { revalidate: 30, tags: publicReadTags(input) },
        });
      },
    },
  });
}
