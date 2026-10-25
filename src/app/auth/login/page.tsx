import type { Metadata } from "next";

import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginForm } from "@/features/auth/login-form";
import { getCurrentUser } from "@/features/auth/session";
import { getTurnstileSiteKey } from "@/features/auth/signup-policy";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the SMIU Feedback Website with your student ID.",
  // Auth pages index nahi honi chahiye.
  robots: { index: false, follow: true },
};

/*
  Sign in - jaan boojh kar compact.

  Pehle card me lamba intro paragraph aur neeche ek aur paragraph tha, jis se
  page scroll karta tha. Ab ek chhoti line upar hai aur privacy wali baat ek
  halke green tag me - wohi jumla, kam jagah me.
*/
export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  // Pehle se logged in hai to yahan rukne ka koi matlab nahi.
  const session = await getCurrentUser();
  if (session?.isVerified) redirect("/student");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Sign in</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {searchParams?.status === "unavailable" ? (
            <Alert tone="warning">
              <AlertDescription>
                This account is not ready to sign in yet. Please contact the
                site administrator.
              </AlertDescription>
            </Alert>
          ) : null}
          <LoginForm
            turnstileSiteKey={getTurnstileSiteKey()}
            nonce={headers().get("x-nonce") ?? undefined}
          />
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        New to SMIU Feedback Platform?{" "}
        <Link
          href="/auth/signup"
          className="link-underline font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
