import type { Metadata } from "next";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "@/features/auth/signup-form";
import { getCurrentUser } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a ProfAura account with your SMIU student ID.",
  robots: { index: false, follow: true },
};

/*
  Signup page copy.

  Pehle yahan do lambe paragraphs the jo ek hi baat ghuma phira kar keh rahe the
  ("one account per student, verified once, so reviews stay honest..."). Ab copy
  wohi char cheezein batati hai jo student ko sach me jaan-na chahiye: ID se
  email banti hai, verification ek dafa, review ke liye verification zaroori,
  aur naam kabhi public nahi hota. Baqi sab hata diya gaya.
*/
export default async function SignupPage() {
  const session = await getCurrentUser();
  if (session?.isVerified) redirect("/student");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Enter your student ID. We create your university email from it and send one
            verification link to that address.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <SignupForm />

          <p className="flex items-start gap-2 rounded-md border border-state-success/25 bg-state-success-soft px-3 py-2 text-xs leading-relaxed text-ink-700">
            <ShieldCheck aria-hidden="true" className="mt-px size-3.5 shrink-0 text-state-success" />
            <span>
              Verification confirms you study here, and is required before you can post a review.
              Your name and student ID never appear on a public page.
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
