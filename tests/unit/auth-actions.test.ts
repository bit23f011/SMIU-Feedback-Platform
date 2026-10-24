import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  isFeatureEnabled: vi.fn(),
  getSignupPolicy: vi.fn(),
  getTurnstileSiteKey: vi.fn(),
  log: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: { signUp: mocks.signUp, signInWithPassword: mocks.signIn },
  }),
}));
vi.mock("@/lib/server/diagnostics", () => ({ logBackendError: mocks.log }));
vi.mock("@/features/feature-flags/queries", () => ({
  isFeatureEnabled: mocks.isFeatureEnabled,
}));
vi.mock("@/features/auth/signup-policy", () => ({
  getSignupPolicy: mocks.getSignupPolicy,
  getTurnstileSiteKey: mocks.getTurnstileSiteKey,
}));

import { signInAction, signUpAction } from "@/features/auth/actions";
import { EMPTY_AUTH_STATE } from "@/features/auth/form-state";

function signupForm() {
  const form = new FormData();
  form.set("studentId", "bit21f002");
  form.set("password", "a long test passphrase");
  form.set("confirmPassword", "a long test passphrase");
  form.set("acceptTerms", "on");
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isFeatureEnabled.mockResolvedValue(true);
  mocks.getSignupPolicy.mockResolvedValue({
    available: true,
    emailConfirmationRequired: false,
    captchaRequired: false,
    turnstileSiteKey: null,
  });
  mocks.getTurnstileSiteKey.mockReturnValue(null);
  mocks.signUp.mockResolvedValue({
    data: { session: { access_token: "test-session" }, user: { email_confirmed_at: "2026-10-24" } },
    error: null,
  });
  mocks.signIn.mockResolvedValue({
    data: { user: { email_confirmed_at: "2026-10-24" } },
    error: null,
  });
});
describe("signup outcomes", () => {
  it("shows the platform pause before attempting account creation", async () => {
    mocks.isFeatureEnabled.mockResolvedValue(false);
    const state = await signUpAction(EMPTY_AUTH_STATE, signupForm());
    expect(state.formError).toContain("sign ups are closed");
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("does not create an account when backend configuration is unavailable", async () => {
    mocks.getSignupPolicy.mockResolvedValue({
      available: false,
      emailConfirmationRequired: false,
      captchaRequired: true,
    });
    const state = await signUpAction(EMPTY_AUTH_STATE, signupForm());
    expect(state.formError).toContain("temporarily unavailable");
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("does not send a signup request while the backend still requires email confirmation", async () => {
    mocks.getSignupPolicy.mockResolvedValue({
      available: true, emailConfirmationRequired: true, captchaRequired: false,
    });
    expect((await signUpAction(EMPTY_AUTH_STATE, signupForm())).formError).toContain("temporarily unavailable");
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("requires a token before contacting Auth in CAPTCHA-only mode", async () => {
    mocks.getSignupPolicy.mockResolvedValue({
      available: true,
      emailConfirmationRequired: false,
      captchaRequired: true,
    });
    const state = await signUpAction(EMPTY_AUTH_STATE, signupForm());
    expect(state.formError).toContain("security check");
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("passes the real challenge to Auth and opens the new authenticated account immediately", async () => {
    mocks.getSignupPolicy.mockResolvedValue({
      available: true,
      emailConfirmationRequired: false,
      captchaRequired: true,
    });
    mocks.signUp.mockResolvedValue({
      data: {
        session: { access_token: "test-session" },
        user: { email_confirmed_at: "2026-10-24" },
      },
      error: null,
    });
    const form = signupForm();
    form.set("cf-turnstile-response", "challenge-token");
    await expect(signUpAction(EMPTY_AUTH_STATE, form)).rejects.toThrow(
      "redirect:/student",
    );
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "bit21f002@stu.smiu.edu.pk",
      password: "a long test passphrase",
      options: {
        captchaToken: "challenge-token",
      },
    });
  });

  it("opens the authenticated account immediately with only signup details", async () => {
    await expect(signUpAction(EMPTY_AUTH_STATE, signupForm())).rejects.toThrow(
      "redirect:/student",
    );
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "bit21f002@stu.smiu.edu.pk", password: "a long test passphrase",
    });
  });

  it("reports a missing session instead of redirecting to email verification", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null, user: { email_confirmed_at: null } }, error: null });
    expect((await signUpAction(EMPTY_AUTH_STATE, signupForm())).formError).toContain("could not finish creating");
  });

  it("reports backend failures without blaming the student ID or starting email verification", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        code: "unexpected_failure",
        status: 500,
        message: "Error sending confirmation email",
      },
    });
    const state = await signUpAction(EMPTY_AUTH_STATE, signupForm());
    expect(state.ok).toBe(false);
    expect(state.formError).toContain("temporarily unavailable");
    expect(mocks.log).toHaveBeenCalledWith(
      "auth.signup",
      expect.objectContaining({ code: "unexpected_failure" }),
    );
  });

  it("reports Auth's rejection of a fake token", async () => {
    mocks.getSignupPolicy.mockResolvedValue({
      available: true,
      emailConfirmationRequired: false,
      captchaRequired: true,
    });
    mocks.signUp.mockResolvedValue({
      data: {},
      error: { code: "captcha_failed", status: 400 },
    });
    const form = signupForm();
    form.set("cf-turnstile-response", "fake-token");
    expect((await signUpAction(EMPTY_AUTH_STATE, form)).formError).toContain(
      "security check",
    );
  });

  it("turns connection exceptions into a visible form error", async () => {
    mocks.signUp.mockRejectedValue(new Error("connection failed"));
    expect(
      (await signUpAction(EMPTY_AUTH_STATE, signupForm())).formError,
    ).toContain("temporarily unavailable");
  });
});

describe("sign-in with Auth CAPTCHA protection", () => {
  it("keeps legacy incomplete accounts out of the removed email verification flow", async () => {
    mocks.signIn.mockResolvedValue({ data: {}, error: { code: "email_not_confirmed", status: 400 } });
    expect((await signInAction(EMPTY_AUTH_STATE, signupForm())).formError).toContain("site administrator");
  });
  it("supplies the login challenge and preserves the requested destination", async () => {
    mocks.getTurnstileSiteKey.mockReturnValue("configured-site-key");
    const form = signupForm();
    form.set("cf-turnstile-response", "login-token");
    form.set("next", "/people/test-teacher");
    await expect(signInAction(EMPTY_AUTH_STATE, form)).rejects.toThrow(
      "redirect:/people/test-teacher",
    );
    expect(mocks.signIn.mock.calls[0][0].options.captchaToken).toBe(
      "login-token",
    );
  });

  it("shows a challenge error instead of an incorrect-password error", async () => {
    mocks.signIn.mockResolvedValue({
      data: {},
      error: { code: "captcha_failed", status: 400 },
    });
    expect(
      (await signInAction(EMPTY_AUTH_STATE, signupForm())).formError,
    ).toContain("security check");
  });
});
