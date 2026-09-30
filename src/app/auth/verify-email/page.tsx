import type { Metadata } from "next";

import Link from "next/link";
import { MailCheck, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STUDENT_EMAIL_DOMAIN } from "@/features/auth/schemas";

export const metadata: Metadata = {
  title: "Check your email",
  description: "Confirm your university email address to finish creating your ProfAura account.",
  robots: { index: false, follow: false },
};

/*
  "Check your email" screen.

  Yahan JAAN BOOJH KAR koi "Resend email" button NAHI hai. Product ka wada hai:
  signup par sirf EK verification email jata hai. Resend button us wade ko tor
  deta aur email bombing ka aasan raasta ban jata.

  Yeh page kisi ka email address bhi nahi dikhata - URL me email daal kar
  "kis ka account hai" batana enumeration ban jata hai.
*/

type Status = "expired" | "invalid" | "unconfirmed" | undefined;

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const status = searchParams?.status as Status;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <span
            aria-hidden="true"
            className="mb-3 inline-flex size-11 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700"
          >
            <MailCheck className="size-5" />
          </span>
          <CardTitle className="text-xl">Check your email</CardTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We sent a confirmation link to your @{STUDENT_EMAIL_DOMAIN} address. Open it to finish
            setting up your account.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          {status === "unconfirmed" ? (
            <Alert tone="info">
              <TriangleAlert aria-hidden="true" />
              <div>
                <AlertTitle>Your email is not confirmed yet</AlertTitle>
                <AlertDescription>
                  Your student ID and password were correct. You just need to open the confirmation
                  link we emailed when you signed up, then sign in again.
                </AlertDescription>
              </div>
            </Alert>
          ) : null}

          {status === "expired" ? (
            <Alert tone="warning">
              <TriangleAlert aria-hidden="true" />
              <div>
                <AlertTitle>That link has expired</AlertTitle>
                <AlertDescription>
                  Confirmation links can only be used once. Sign in below and we will guide you
                  from there.
                </AlertDescription>
              </div>
            </Alert>
          ) : null}

          {status === "invalid" ? (
            <Alert tone="warning">
              <TriangleAlert aria-hidden="true" />
              <div>
                <AlertTitle>That link was incomplete</AlertTitle>
                <AlertDescription>
                  Try opening the link directly from your email rather than copying it.
                </AlertDescription>
              </div>
            </Alert>
          ) : null}

          <div className="space-y-2.5 text-sm leading-relaxed text-ink-700">
            <p className="font-medium text-foreground">If it has not arrived:</p>
            <p>
              Check your spam or junk folder. Delivery can take a few minutes. If your student ID
              was wrong, start again with the correct one.
            </p>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            We send exactly one verification email per account. We will not email you again.
          </p>

          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/login">Go to sign in</Link>
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Wrong student ID?{" "}
        <Link
          href="/auth/signup"
          className="link-underline font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Start again
        </Link>
      </p>
    </div>
  );
}
