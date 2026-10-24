"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logBackendError } from "@/lib/server/diagnostics";
import { isFeatureEnabled } from "@/features/feature-flags/queries";
import {
  signInSchema,
  signUpSchema,
  studentIdToEmail,
} from "@/features/auth/schemas";
import type { AuthFormState } from "@/features/auth/form-state";
import {
  SIGNUP_PAUSED,
  SIGNUP_UNAVAILABLE,
  signupErrorMessage,
} from "@/features/auth/errors";
import {
  getSignupPolicy,
  getTurnstileSiteKey,
} from "@/features/auth/signup-policy";

/*
  Auth Server Actions.

  YEH server par chalti hain - is liye yahan ki validation asli validation hai.
  Client sirf form bhejta hai; kya allowed hai, wo yahan aur DB me tay hota hai.

  TEEN cheezein jaan boojh kar aise likhi hain:

  1) Signup par email/OTP nahi. Supabase auto-confirm ke baad session de aur
     account seedha khule. Real CAPTCHA sirf configured ho to lazmi hai.

  2) USER ENUMERATION se bachao: errors kabhi yeh nahi batate ke kisi student ID
     ka account pehle se hai ya nahi. Login par bhi credentials ka ek hi message.

  3) SAFE ERRORS: Supabase/Postgres ka asli message kabhi user tak nahi jata
     (DB trigger ka text bhi nahi). Sirf humare likhe hue generic messages.

  NOTE: AuthFormState type aur EMPTY_AUTH_STATE ab ek alag plain module
  (form-state.ts) me hain. Wajah: "use server" file sirf async functions export
  kar sakti hai - type/object yahan se export karna Next.js build par error deta.
*/

/*
  Open-redirect guard. `?next=` se sirf apni site ke andar ka raasta chalega.
  "//evil.com" browser ke liye protocol-relative URL hai, is liye wo bhi block.
  Backslash Windows/browser normalisation tricks ke liye block hai.
*/
function safeNextPath(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;
  return value;
}

function captchaTokenFromForm(formData: FormData): string | undefined {
  const value = formData.get("cf-turnstile-response");
  return typeof value === "string" && value.trim() && value.length <= 2048
    ? value.trim()
    : undefined;
}

// -----------------------------------------------------------------------------
// SIGN UP
// -----------------------------------------------------------------------------
export async function signUpAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    studentId: formData.get("studentId"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptTerms: formData.get("acceptTerms"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  if (!(await isFeatureEnabled("student_signup"))) {
    return { ok: false, formError: SIGNUP_PAUSED };
  }

  const policy = await getSignupPolicy();
  if (!policy.available || policy.emailConfirmationRequired) {
    return { ok: false, formError: SIGNUP_UNAVAILABLE };
  }

  // Email SERVER par banti hai. Client jo bhi bheje, domain hissa hamesha yahan
  // se aata hai - is liye kisi doosre domain se signup mumkin hi nahi.
  const email = studentIdToEmail(parsed.data.studentId);

  let signedIn = false;
  try {
    const captchaToken = captchaTokenFromForm(formData);
    if (policy.captchaRequired && !captchaToken) {
      return {
        ok: false,
        formError:
          "Please complete the security check again and try once more.",
      };
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: parsed.data.password,
      // Role DB trigger tay kare; client metadata ya verification callback nahi.
      ...(captchaToken ? { options: { captchaToken } } : {}),
    });
    if (error) {
      logBackendError("auth.signup", error);
      return { ok: false, formError: signupErrorMessage(error) };
    }
    signedIn = Boolean(data.session && data.user?.email_confirmed_at);
  } catch (error) {
    logBackendError("auth.signup", error);
    return { ok: false, formError: SIGNUP_UNAVAILABLE };
  }

  if (signedIn) {
    revalidatePath("/", "layout");
    redirect("/student");
  }
  logBackendError("auth.signup", { code: "signup_session_missing" });
  return {
    ok: false,
    formError:
      "We could not finish creating your account. Please try signing in or try again later.",
  };
}

// -----------------------------------------------------------------------------
// SIGN IN
// -----------------------------------------------------------------------------
export async function signInAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    studentId: formData.get("studentId"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const nextPath = safeNextPath(formData.get("next")?.toString(), "/student");

  const captchaToken = captchaTokenFromForm(formData);
  if (getTurnstileSiteKey() && !captchaToken) {
    return {
      ok: false,
      formError: "Please complete the security check again and try once more.",
    };
  }

  const supabase = createSupabaseServerClient();

  // Signup ki tarah, login par bhi email server par banti hai.
  const { data, error } = await supabase.auth.signInWithPassword({
    email: studentIdToEmail(parsed.data.studentId),
    password: parsed.data.password,
    ...(captchaToken ? { options: { captchaToken } } : {}),
  });

  if (error) {
    if (error.status === 429) {
      return {
        ok: false,
        formError:
          "Too many sign-in attempts. Please wait a few minutes and try again.",
      };
    }

    // Purane incomplete account ko email/OTP flow me wapas nahi bhejna.
    const code = (error as { code?: string }).code;
    if (code === "captcha_failed") {
      return {
        ok: false,
        formError:
          "Please complete the security check again and try once more.",
      };
    }
    const isUnconfirmed =
      code === "email_not_confirmed" ||
      /email not confirmed/i.test(error.message);

    if (isUnconfirmed) {
      return {
        ok: false,
        formError: "This account is not ready to sign in yet. Please contact the site administrator.",
      };
    }

    if (code !== "invalid_credentials") logBackendError("auth.signin", error);

    // Ek hi message har nakaami ke liye - na batao ke account mojood hai ya nahi.
    return {
      ok: false,
      formError: "That student ID and password do not match.",
    };
  }

  // Auto-confirmed account hi DB ke student gate se guzarta hai.
  if (!data.user?.email_confirmed_at) {
    return { ok: false, formError: "We could not complete sign in. Please try again later." };
  }

  revalidatePath("/", "layout");
  redirect(nextPath);
}

// -----------------------------------------------------------------------------
// SIGN OUT
// -----------------------------------------------------------------------------
export async function signOutAction(): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}
