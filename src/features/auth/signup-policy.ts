import "server-only";

import { cache } from "react";

import { getSupabaseClientEnv, publicEnv } from "@/lib/env";
import { logBackendError } from "@/lib/server/diagnostics";

export interface SignupPolicy {
  emailConfirmationRequired: boolean;
  captchaRequired: boolean;
  turnstileSiteKey: string | null;
  available: boolean;
}

function configured(value: string | undefined): string | null {
  const clean = value?.trim();
  return clean && !/^YOUR_/i.test(clean) ? clean : null;
}

export function getTurnstileSiteKey(): string | null {
  const siteKey = configured(publicEnv.turnstileSiteKey);
  return process.env.NODE_ENV === "production" && /^[123]x/.test(siteKey ?? "")
    ? null
    : siteKey;
}

/* Signup seedha session de: Supabase me Confirm email OFF hona lazmi hai. */
export const getSignupPolicy = cache(async (): Promise<SignupPolicy> => {
  const siteKey = getTurnstileSiteKey();
  const fallback: SignupPolicy = {
    emailConfirmationRequired: true,
    captchaRequired: Boolean(siteKey),
    turnstileSiteKey: siteKey,
    available: false,
  };

  try {
    const { url, anonKey } = getSupabaseClientEnv();
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anonKey },
      // These are public configuration settings. Auth still enforces the current
      // policy on every signup; credentials, tokens and sessions stay uncached.
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      logBackendError("auth.settings", { status: response.status });
      return fallback;
    }

    const settings = (await response.json()) as {
      mailer_autoconfirm?: boolean;
      disable_signup?: boolean;
      external?: { email?: boolean };
    };
    if (typeof settings.mailer_autoconfirm !== "boolean") {
      logBackendError("auth.settings", { code: "invalid_response" });
      return fallback;
    }

    const emailConfirmationRequired = !settings.mailer_autoconfirm;
    const captchaRequired = Boolean(siteKey);
    const invalidCaptcha = Boolean(
      configured(publicEnv.turnstileSiteKey) && !siteKey,
    );
    const available =
      settings.external?.email === true &&
      !settings.disable_signup &&
      !emailConfirmationRequired &&
      !invalidCaptcha;
    if (emailConfirmationRequired) {
      logBackendError("auth.signup.configuration", {
        code: "email_confirmation_enabled",
      });
    }
    if (invalidCaptcha) {
      logBackendError("auth.signup.configuration", {
        code: "turnstile_invalid_configuration",
      });
    }

    return {
      emailConfirmationRequired,
      captchaRequired,
      turnstileSiteKey: siteKey,
      available,
    };
  } catch (error) {
    logBackendError("auth.settings", error);
    return fallback;
  }
});
