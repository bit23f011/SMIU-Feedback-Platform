// @vitest-environment node
import { afterAll, expect, it, vi } from "vitest";

// React's Server Component cache is unavailable in the Node test renderer.
vi.mock("react", () => ({ cache: (fn: () => unknown) => fn }));

vi.mock("@/lib/env", () => ({
  getSupabaseClientEnv: () => ({
    url: "https://example.supabase.co",
    anonKey: "runtime-test-key",
  }),
}));
vi.mock("next/headers", () => ({
  cookies: () => ({ getAll: () => [], set: vi.fn() }),
}));

import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const originalWebSocket = globalThis.WebSocket;
afterAll(() => {
  globalThis.WebSocket = originalWebSocket;
});

it("initialises real public and authenticated clients without a native WebSocket or network request", () => {
  // Node 20 has no native WebSocket. The real SDK must still initialise.
  globalThis.WebSocket = undefined as unknown as typeof WebSocket;
  expect(() => createSupabasePublicClient()).not.toThrow();
  expect(() => createSupabaseServerClient()).not.toThrow();
});
