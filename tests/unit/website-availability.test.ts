// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { readWebsiteState } from "@/features/website-availability/read-state";
import {
  DEFAULT_WEBSITE_SETTINGS,
  isAdminPath,
  isWebsiteRecoveryPath,
} from "@/features/website-availability/types";
vi.mock("@/lib/env", () => ({
  getSupabaseClientEnv: () => ({
    url: "https://project.supabase.co",
    anonKey: "public-test-key",
  }),
}));

const fetcher = vi.fn();
beforeEach(() => {
  fetcher.mockReset();
});
it.each([true, false])(
  "reads the persisted website state %s without a stale cache",
  async (enabled) => {
    fetcher.mockResolvedValue(
      new Response(
        JSON.stringify([{ ...DEFAULT_WEBSITE_SETTINGS, is_enabled: enabled }]),
      ),
    );
    expect((await readWebsiteState(fetcher)).status).toBe(
      enabled ? "open" : "closed",
    );
    expect(fetcher.mock.calls[0][1].cache).toBe("no-store");
  },
);
it("preserves normal availability before the migration and distinguishes an outage from an official closure", async () => {
  fetcher.mockResolvedValue(
    new Response(JSON.stringify({ code: "PGRST205" }), { status: 404 }),
  );
  expect((await readWebsiteState(fetcher)).status).toBe("open");
  fetcher.mockRejectedValue(new Error("Offline"));
  expect(await readWebsiteState(fetcher)).toEqual({
    status: "unavailable",
    settings: null,
  });
});
it.each([
  [],
  [{ ...DEFAULT_WEBSITE_SETTINGS, is_enabled: "false" }],
  [{ ...DEFAULT_WEBSITE_SETTINGS, title: "" }],
])(
  "rejects malformed or absent state without exposing the ordinary site",
  async (data) => {
    fetcher.mockResolvedValue(new Response(JSON.stringify(data)));
    expect((await readWebsiteState(fetcher)).status).toBe("unavailable");
  },
);
it("keeps only real admin paths and administrator sign-in available for recovery", () => {
  for (const value of [
    "https://example.com/admin",
    "//evil/admin",
    "/administrator",
    "/admin/../teachers",
    "/admin\\../teachers",
    "/admin/%2e%2e/teachers",
  ])
    expect(isAdminPath(value)).toBe(false);
  expect(isWebsiteRecoveryPath("/admin/website", null)).toBe(true);
  expect(isWebsiteRecoveryPath("/auth/login", "/admin/website")).toBe(true);
  expect(isWebsiteRecoveryPath("/auth/login", "/student")).toBe(false);
  expect(isWebsiteRecoveryPath("/auth/signup", "/admin")).toBe(false);
});
