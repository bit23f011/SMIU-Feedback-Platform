"use client";

import * as React from "react";

import { useSearchParams } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInAction } from "@/features/auth/actions";
import { EMPTY_AUTH_STATE } from "@/features/auth/form-state";
import { FormError, FormField } from "@/features/auth/form-field";
import { StudentIdInput } from "@/features/auth/student-id-input";

/*
  Login form.

  Student ID + password (README §13). Email yahan se bhejti hi nahi - server
  action khud Student ID se official address banati hai, bilkul signup ki tarah.

  `next` ek hidden field me jata hai taake sign-in ke baad user wahin wapas
  pahunche jahan se aaya tha. Us value ko server action `safeNextPath()` se
  saaf karti hai - open redirect se bachne ke liye. Client par bhejna theek hai
  kyunki us par bharosa server nahi karta.
*/

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? "Signing you in…" : "Sign in"}
    </Button>
  );
}

function LoginFormInner() {
  const [state, formAction] = useFormState(signInAction, EMPTY_AUTH_STATE);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={state.formError} />

      <input type="hidden" name="next" value={next} />

      <FormField id="login-student-id" label="Student ID" errors={state.fieldErrors?.studentId}>
        {(field) => (
          <StudentIdInput
            {...field}
            name="studentId"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={32}
            required
          />
        )}
      </FormField>

      <FormField id="login-password" label="Password" errors={state.fieldErrors?.password}>
        {(field) => (
          <Input
            {...field}
            name="password"
            type="password"
            autoComplete="current-password"
            maxLength={72}
            required
          />
        )}
      </FormField>

      <SubmitButton />
    </form>
  );
}

/*
  useSearchParams() Suspense boundary maangta hai warna static prerender par
  CSR-bailout build error aata hai. Component khud apni boundary le kar chalta
  hai taake caller ko yaad rakhna na pare.
*/
export function LoginForm() {
  return (
    <React.Suspense fallback={<LoginFormSkeleton />}>
      <LoginFormInner />
    </React.Suspense>
  );
}

function LoginFormSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      {["Student ID", "Password"].map((label) => (
        <div key={label} className="space-y-1.5">
          <div className="text-sm font-medium leading-none text-ink-800">{label}</div>
          <div className="h-10 w-full rounded-md border border-input bg-background shadow-xs" />
        </div>
      ))}
      <div className="h-11 w-full rounded-md bg-primary opacity-70" />
    </div>
  );
}
