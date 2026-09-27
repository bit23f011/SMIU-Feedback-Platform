"use client";

import * as React from "react";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUpAction } from "@/features/auth/actions";
import { EMPTY_AUTH_STATE } from "@/features/auth/form-state";
import { FormError, FormField } from "@/features/auth/form-field";
import { StudentIdInput } from "@/features/auth/student-id-input";
import { STUDENT_EMAIL_DOMAIN } from "@/features/auth/schemas";

/*
  Signup form.

  Next 14 me `useFormState` + `useFormStatus` use kar rahe hain (React 18.3).
  Fayda: form BINA JavaScript ke bhi kaam karta hai - server action normal form
  POST par chal jati hai. JS sirf pending state, inline errors aur email preview
  behtar banata hai.

  Student email type nahi karta: wo Student ID deta hai aur neeche live preview
  me dekh leta hai ke kis address par verification jayegi. Preview sirf dikhawa
  hai; asli email server par banti hai (schemas.ts -> studentIdToEmail).

  YAAD RAHE: yahan ka koi bhi check security nahi hai. `required`, pattern hint,
  sab sirf user ko jaldi bata dene ke liye. Asli validation server action me
  (Zod) aur asli lock DB trigger me hai.
*/

function SubmitButton() {
  // useFormStatus hamesha apne parent <form> ka status deta hai.
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? "Creating your account…" : "Create account"}
    </Button>
  );
}

export function SignupForm() {
  const [state, formAction] = useFormState(signUpAction, EMPTY_AUTH_STATE);
  const [studentId, setStudentId] = React.useState("");

  const cleanId = studentId.trim().toLowerCase();
  const previewEmail = cleanId ? `${cleanId}@${STUDENT_EMAIL_DOMAIN}` : null;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={state.formError} />

      <FormField
        id="signup-student-id"
        label="Student ID"
        hint="Example: bit21f002"
        errors={state.fieldErrors?.studentId}
      >
        {(field) => (
          <StudentIdInput
            {...field}
            name="studentId"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={studentId}
            onValueChange={setStudentId}
            maxLength={32}
            required
          />
        )}
      </FormField>

      {/* Generated email preview - student ko pehle hi pata chal jaye kahan mail jayegi. */}
      <p
        aria-live="polite"
        className="rounded-md border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-muted-foreground"
      >
        {previewEmail ? (
          <>
            Your university email:{" "}
            <span className="font-medium text-foreground">{previewEmail}</span>
          </>
        ) : (
          <>Your university email is created from your student ID. You do not type it yourself.</>
        )}
      </p>

      <FormField
        id="signup-password"
        label="Password"
        hint="At least 12 characters. A short sentence works well."
        errors={state.fieldErrors?.password}
      >
        {(field) => (
          <Input
            {...field}
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
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
            aria-describedby={state.fieldErrors?.acceptTerms ? "signup-terms-error" : undefined}
            className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-sm border border-input text-primary accent-indigo-500 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <label
            htmlFor="signup-terms"
            className="cursor-pointer text-sm leading-relaxed text-ink-700"
          >
            I understand my reviews are published anonymously and must be honest and respectful.
          </label>
        </div>

        {state.fieldErrors?.acceptTerms ? (
          <p id="signup-terms-error" role="alert" className="text-xs font-medium text-state-danger">
            {state.fieldErrors.acceptTerms[0]}
          </p>
        ) : null}
      </div>

      <SubmitButton />
    </form>
  );
}
