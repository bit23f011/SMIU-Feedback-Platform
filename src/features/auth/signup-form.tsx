"use client";

import * as React from "react";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUpAction } from "@/features/auth/actions";
import { EMPTY_AUTH_STATE } from "@/features/auth/form-state";
import { FormError, FormField } from "@/features/auth/form-field";
import { StudentIdInput } from "@/features/auth/student-id-input";
import { Turnstile } from "@/features/auth/turnstile";

/*
  Signup form.

  Next 14 me `useFormState` + `useFormStatus` use kar rahe hain (React 18.3).
  Normal POST par bhi server validation chalti hai. CAPTCHA enabled ho to uski
  real challenge ke liye JavaScript chahiye; checkbox ka fake substitute nahi.

  Student email type nahi karta: wo Student ID deta hai aur neeche live preview
  me dekh leta hai ke account ka email kya hoga. Preview sirf dikhawa
  hai; asli email server par banti hai (schemas.ts -> studentIdToEmail).

  YAAD RAHE: yahan ka koi bhi check security nahi hai. `required`, pattern hint,
  sab sirf user ko jaldi bata dene ke liye. Asli validation server action me
  (Zod) aur asli lock DB trigger me hai.
*/

function SubmitButton({
  captchaReady,
  completingSignIn,
}: {
  captchaReady: boolean;
  completingSignIn: boolean;
}) {
  // useFormStatus hamesha apne parent <form> ka status deta hai.
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full"
      size="lg"
      disabled={pending || !captchaReady}
    >
      {pending
        ? completingSignIn
          ? "Opening your account…"
          : "Creating your account…"
        : completingSignIn
          ? "Open account"
          : "Create account"}
    </Button>
  );
}

export function SignupForm({
  turnstileSiteKey,
  nonce,
}: {
  turnstileSiteKey?: string | null;
  nonce?: string;
}) {
  const [state, formAction] = useFormState(signUpAction, EMPTY_AUTH_STATE);
  const [captchaVerified, setCaptchaVerified] = React.useState(false);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={state.formError} />

      <FormField
        id="signup-student-id"
        label="Student ID"
        errors={state.fieldErrors?.studentId}
      >
        {(field) => (
          <StudentIdInput
            {...field}
            name="studentId"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="e.g. bit21f002"
            maxLength={32}
            required
          />
        )}
      </FormField>

      <FormField
        id="signup-password"
        label="Password"
        errors={state.fieldErrors?.password}
      >
        {(field) => (
          <Input
            {...field}
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            placeholder="At least 12 characters"
            maxLength={72}
            required
          />
        )}
      </FormField>

      <FormField
        id="signup-confirm"
        label="Confirm password"
        errors={state.fieldErrors?.confirmPassword}
      >
        {(field) => (
          <Input
            {...field}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            maxLength={72}
            required
          />
        )}
      </FormField>

      <div className="space-y-1.5">
        <div className="flex items-start gap-2.5">
          <input
            id="signup-terms"
            name="acceptTerms"
            type="checkbox"
            required
            aria-invalid={Boolean(state.fieldErrors?.acceptTerms)}
            aria-describedby={
              state.fieldErrors?.acceptTerms ? "signup-terms-error" : undefined
            }
            className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-sm border border-input text-primary accent-indigo-500 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <label
            htmlFor="signup-terms"
            className="cursor-pointer text-xs leading-relaxed text-ink-700"
          >
            I agree to share honest, respectful, anonymous reviews.
          </label>
        </div>

        {state.fieldErrors?.acceptTerms ? (
          <p
            id="signup-terms-error"
            role="alert"
            className="text-xs font-medium text-state-danger"
          >
            {state.fieldErrors.acceptTerms[0]}
          </p>
        ) : null}
      </div>

      {turnstileSiteKey ? (
        <Turnstile
          siteKey={turnstileSiteKey}
          nonce={nonce}
          resetKey={state}
          action={state.completeSignIn ? "signin" : "signup"}
          onVerifiedChange={setCaptchaVerified}
        />
      ) : null}

      <SubmitButton
        captchaReady={!turnstileSiteKey || captchaVerified}
        completingSignIn={Boolean(state.completeSignIn)}
      />
    </form>
  );
}
