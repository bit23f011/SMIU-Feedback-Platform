import type { Metadata } from "next";

import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldCheck } from "@/components/ui/icons";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "@/features/auth/signup-form";
import { getCurrentUser } from "@/features/auth/session";
import { SIGNUP_PAUSED, SIGNUP_UNAVAILABLE } from "@/features/auth/errors";
import { getSignupPolicy } from "@/features/auth/signup-policy";
import { isFeatureEnabled } from "@/features/feature-flags/queries";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a new account with your SMIU student ID.",
  robots: { index: false, follow: true },
};

/*
  Student ID aur password do; signup ke baad account foran khule, email/OTP nahi.
*/
export default async function SignupPage() {
  const [session, signupEnabled, policy] = await Promise.all([
    getCurrentUser(),
    isFeatureEnabled("student_signup"),
    getSignupPolicy(),
  ]);
  if (session?.isVerified) redirect("/student");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Enter your student ID and choose a password to create your account.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {!signupEnabled || !policy.available ? (
            <Alert tone="warning">
              <AlertDescription>
                {!signupEnabled ? SIGNUP_PAUSED : SIGNUP_UNAVAILABLE}
              </AlertDescription>
            </Alert>
          ) : (
            <SignupForm
              turnstileSiteKey={policy.turnstileSiteKey}
              nonce={headers().get("x-nonce") ?? undefined}
            />
          )}

          <p className="flex items-start gap-2 rounded-md border border-state-success/25 bg-state-success-soft px-3 py-2 text-xs leading-relaxed text-ink-700">
            <ShieldCheck
              aria-hidden="true"
              className="mt-px size-3.5 shrink-0 text-state-success"
            />
            <span>
              Your account opens as soon as you sign up. Your name and student ID never appear on a public page.
            </span>
          </p>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="link-underline font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
