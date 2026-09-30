import type { Metadata } from "next";

import { Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { FeedbackForm } from "@/features/feedback/feedback-form";

/*
  /feedback - website feedback ka PUBLIC page (README §56 - §59).

  Public visitor aur logged-in student, dono yahan se bhej sakte hain (koi auth
  gate nahi - is liye yeh (public) group me hai). Yeh feedback SMIU Feedback ke BAARE
  me hai; kisi teacher ke against report ka darwaza yahan nahi (uske liye profile
  par report option hai). Yeh dataset alag hai aur kisi rating/ranking ko chhoota
  nahi.
*/

export const metadata: Metadata = {
  title: "Send feedback",
  description:
    "Share feedback about the SMIU Feedback website, suggest an update, or report a bug or issue. This is separate from teacher ratings and never affects them.",
  alternates: { canonical: "/feedback" },
};

export default function FeedbackPage() {
  return (
    <div className="container py-8 md:py-10">
      <PageHeader
        eyebrow="SMIU Feedback"
        title="Send feedback"
        description="Feedback about the website itself: what is working, what is not, and what could be better."
      />

      <div className="mx-auto mt-8 max-w-2xl">
        <Alert tone="info">
          <Info aria-hidden="true" />
          <div>
            <AlertTitle>This is about the website, not a teacher</AlertTitle>
            <AlertDescription>
              Use this to tell us about the SMIU Feedback site itself. To flag a specific teacher or
              staff profile, open that profile and use its report option instead. Nothing you send
              here changes any rating or ranking.
            </AlertDescription>
          </div>
        </Alert>

        <Card className="mt-6 p-5 sm:p-6">
          <FeedbackForm />
        </Card>
      </div>
    </div>
  );
}
