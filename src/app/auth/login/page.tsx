import type { Metadata } from "next";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/login-form";
import { getCurrentUser } from "@/features/auth/session";

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
export default async function LoginPage() {
  // Pehle se logged in hai to yahan rukne ka koi matlab nahi.
  const session = await getCurrentUser();
  if (session?.isVerified) redirect("/student");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Sign in</CardTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Use your student ID and password.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <LoginForm />

          {/* Privacy tag - bohat halka green, dono themes me readable. */}
          <p className="flex items-start gap-2 rounded-md border border-state-success/25 bg-state-success-soft px-3 py-2 text-xs leading-relaxed text-ink-700">
            <ShieldCheck aria-hidden="true" className="mt-px size-3.5 shrink-0 text-state-success" />
            <span>Your identity is never attached to a review on any public page.</span>
          </p>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        New to ProfAura?{" "}
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
