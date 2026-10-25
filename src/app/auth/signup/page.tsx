import type { Metadata } from "next";

import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

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
