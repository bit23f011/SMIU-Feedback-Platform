// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  fetch: vi.fn(),
  path: vi.fn(),
  tag: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.create }));
vi.mock("@/lib/env", () => ({
  getSupabaseClientEnv: () => ({
    url: "https://project.supabase.co",
    anonKey: "anon-test-key",
  }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.path,
  revalidateTag: mocks.tag,
}));
import {
  createSupabasePublicClient,
  isCacheablePublicRequest,
  PUBLIC_DATA_TAG,
  PUBLIC_RATINGS_TAG,
} from "@/lib/supabase/public";
import {
  revalidatePublicPath,
  revalidateReviewPath,
} from "@/lib/supabase/cache-invalidation";
import { hasSupabaseAuthCookie } from "@/lib/supabase/auth-cookie";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.fetch.mockResolvedValue(new Response("[]"));
});

it.each(["people", "person_rating_stats", "review_criteria", "home_images"])(
  "caches public %s GETs",
  (table) => {
    expect(
      isCacheablePublicRequest(
        `https://project.supabase.co/rest/v1/${table}?select=*`,
      ),
    ).toBe(true);
  },
);
it.each(["profiles", "review_authors", "favorites", "recently_viewed"])(
  "never caches private %s reads",
  (table) => {
    expect(
      isCacheablePublicRequest(`https://project.supabase.co/rest/v1/${table}`),
    ).toBe(false);
  },
);
it("caches only allowlisted read RPCs and leaves writes and scheduled flags uncached", () => {
  for (const name of ["person_reviews", "directory_people"])
    expect(
      isCacheablePublicRequest(
        `https://project.supabase.co/rest/v1/rpc/${name}`,
        { method: "POST" },
      ),
    ).toBe(true);
  for (const name of [
    "submit_review",
    "update_my_review",
    "get_my_reviews",
    "feature_enabled",
  ])
    expect(
      isCacheablePublicRequest(
        `https://project.supabase.co/rest/v1/rpc/${name}`,
        { method: "POST" },
      ),
    ).toBe(false);
  expect(
    isCacheablePublicRequest("https://project.supabase.co/auth/v1/user"),
  ).toBe(false);
});
it("creates a cookie-free anonymous client and tags short-lived reads without timing out writes", async () => {
  createSupabasePublicClient();
  const options = mocks.create.mock.calls[0][2];
  expect(options.auth).toEqual({
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  });
  expect(options.cookies).toBeUndefined();
  await options.global.fetch("https://project.supabase.co/rest/v1/people");
  expect(mocks.fetch.mock.calls[0][1].next).toEqual({
    revalidate: 30,
    tags: [PUBLIC_DATA_TAG, "public-feedback-people"],
  });
  await options.global.fetch(
    "https://project.supabase.co/rest/v1/rpc/submit_review",
    { method: "POST" },
  );
  expect(mocks.fetch.mock.calls[1][1]).toEqual({
    method: "POST",
    cache: "no-store",
  });
});
it("refreshes review results without expiring course, photo and profile-reference caches", () => {
  revalidateReviewPath("/people/teacher-a");
  expect(mocks.tag).toHaveBeenCalledWith(PUBLIC_RATINGS_TAG);
  expect(mocks.tag).not.toHaveBeenCalledWith(PUBLIC_DATA_TAG);
});
it("expires cached public results alongside the changed page", () => {
  revalidatePublicPath("/people/teacher-a");
  expect(mocks.tag).toHaveBeenCalledWith(PUBLIC_DATA_TAG);
  expect(mocks.path).toHaveBeenCalledWith("/people/teacher-a", undefined);
});
it("recognizes chunked session cookies and skips auth work only when no session cookie exists", () => {
  expect(hasSupabaseAuthCookie([{ name: "theme" }])).toBe(false);
  expect(hasSupabaseAuthCookie([{ name: "sb-project-auth-token" }])).toBe(true);
  expect(hasSupabaseAuthCookie([{ name: "sb-project-auth-token.0" }])).toBe(
    true,
  );
  expect(hasSupabaseAuthCookie([{ name: "sb-project-auth-token.1" }])).toBe(
    true,
  );
  expect(
    hasSupabaseAuthCookie([{ name: "sb-project-auth-token-invalid" }]),
  ).toBe(false);
});
