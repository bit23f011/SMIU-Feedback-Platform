// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ read: vi.fn(), update: vi.fn() }));
vi.mock("@/features/website-availability/read-state", () => ({
  readWebsiteState: mocks.read,
}));
vi.mock("@/lib/supabase/middleware", () => ({ updateSession: mocks.update }));
import { middleware } from "@/middleware";
import { DEFAULT_WEBSITE_SETTINGS } from "@/features/website-availability/types";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockResolvedValue({
    status: "open",
    settings: DEFAULT_WEBSITE_SETTINGS,
  });
  mocks.update.mockImplementation(async (_request, headers) => ({
    response: NextResponse.next({ request: { headers } }),
    user: null,
  }));
});
it.each([
  "/",
  "/people/someone",
  "/rankings",
  "/student/reviews",
  "/auth/signup",
])("rewrites %s to the closure page before loading its data", async (path) => {
  mocks.read.mockResolvedValue({
    status: "closed",
    settings: { ...DEFAULT_WEBSITE_SETTINGS, is_enabled: false },
  });
  const response = await middleware(
    new NextRequest(`https://website.test${path}`),
  );
  expect(response.status).toBe(503);
  expect(response.headers.get("x-middleware-rewrite")).toBe(
    "https://website.test/closed",
  );
  expect(response.headers.get("x-middleware-request-x-website-closed")).toBe(
    "true",
  );
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  expect(mocks.update).not.toHaveBeenCalled();
});
it("keeps admin recovery available while closed and preserves the sign-in return path", async () => {
  mocks.read.mockResolvedValue({
    status: "closed",
    settings: DEFAULT_WEBSITE_SETTINGS,
  });
  const admin = await middleware(
    new NextRequest("https://website.test/admin/website"),
  );
  expect(admin.headers.get("location")).toContain("/auth/login?next=");
  const login = await middleware(
    new NextRequest("https://website.test/auth/login?next=/admin/website"),
  );
  expect(login.headers.get("x-middleware-rewrite")).toBeNull();
  expect(mocks.read).not.toHaveBeenCalled();
});
it("clears a client-spoofed closure header and resumes normal routes when ON", async () => {
  const response = await middleware(
    new NextRequest("https://website.test/teachers", {
      headers: { "x-website-closed": "true" },
    }),
  );
  expect(
    response.headers.get("x-middleware-request-x-website-closed"),
  ).toBeNull();
  expect(response.headers.get("x-middleware-rewrite")).toBeNull();
});
it("shows an unavailable response on read failure and prevents an open-site closure route", async () => {
  mocks.read.mockResolvedValue({ status: "unavailable", settings: null });
  expect(
    (await middleware(new NextRequest("https://website.test/teachers"))).status,
  ).toBe(503);
  mocks.read.mockResolvedValue({
    status: "open",
    settings: DEFAULT_WEBSITE_SETTINGS,
  });
  expect(
    (
      await middleware(new NextRequest("https://website.test/closed"))
    ).headers.get("location"),
  ).toBe("https://website.test/");
});
