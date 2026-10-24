import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  siteKey: undefined as string | undefined,
  log: vi.fn(),
}));
vi.mock("server-only", () => ({}));
// Unit harness me RSC request cache ki jagah seedha function chale.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T>(callback: T) => callback,
}));
vi.mock("@/lib/server/diagnostics", () => ({ logBackendError: mocks.log }));
vi.mock("@/lib/env", () => ({
  getSupabaseClientEnv: () => ({
    url: "https://backend.example",
    anonKey: "test-public-key",
  }),
  publicEnv: {
    get turnstileSiteKey() {
      return mocks.siteKey;
    },
  },
}));

import { getSignupPolicy } from "@/features/auth/signup-policy";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.siteKey = undefined;
  vi.stubEnv("NODE_ENV", "test");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function authSettings(autoConfirm: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          mailer_autoconfirm: autoConfirm,
          disable_signup: false,
          external: { email: true },
        }),
      ),
    ),
  );
}

describe("actual Auth confirmation policy", () => {
  it("stops signup while Auth still requires email confirmation", async () => {
    authSettings(false);
    expect(await getSignupPolicy()).toMatchObject({
      emailConfirmationRequired: true,
      captchaRequired: false,
      available: false,
    });
  });

  it("allows immediate signup without an email or CAPTCHA step", async () => {
    authSettings(true);
    expect(await getSignupPolicy()).toMatchObject({
      emailConfirmationRequired: false,
      captchaRequired: false,
      available: true,
    });
  });

  it("requires a real CAPTCHA only when a widget is configured", async () => {
    authSettings(true);
    mocks.siteKey = "0x4-real-widget-key";
    expect(await getSignupPolicy()).toMatchObject({
      emailConfirmationRequired: false,
      captchaRequired: true,
      available: true,
    });
  });

  it("refuses test CAPTCHA keys in production", async () => {
    authSettings(true);
    vi.stubEnv("NODE_ENV", "production");
    mocks.siteKey = "1x00000000000000000000AA";
    expect(await getSignupPolicy()).toMatchObject({
      captchaRequired: false,
      available: false,
      turnstileSiteKey: null,
    });
  });

  it("keeps signup unavailable when Auth settings cannot be read", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect((await getSignupPolicy()).available).toBe(false);
  });
});
