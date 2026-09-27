import type { Metadata } from "next";

import { ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FeedbackQueue } from "@/features/admin/feedback/feedback-queue";
import {
  DEFAULT_FEEDBACK_STATUS,
  isFeedbackStatus,
  isFeedbackType,
  type AdminFeedbackFilters,
} from "@/features/admin/feedback/types";

export const metadata: Metadata = {
  title: "Website feedback · Admin",
  robots: { index: false, follow: false },
};

/*
  Feedback queue live data par chale - status/important badalne ke baad purana
  page ghalat tassali dega.
*/
export const dynamic = "force-dynamic";

function readFilters(searchParams?: {
  status?: string;
  type?: string;
  q?: string;
  important?: string;
  page?: string;
}): AdminFeedbackFilters {
  const page = Number(searchParams?.page);

  return {
    status: isFeedbackStatus(searchParams?.status) ? searchParams.status : DEFAULT_FEEDBACK_STATUS,
    type: isFeedbackType(searchParams?.type) ? searchParams.type : null,
    search: typeof searchParams?.q === "string" ? searchParams.q : "",
    importantOnly: searchParams?.important === "1",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export default function AdminWebsiteFeedbackPage({
  searchParams,
}: {
  searchParams?: { status?: string; type?: string; q?: string; important?: string; page?: string };
}) {
  const filters = readFilters(searchParams);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Website feedback
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Feedback about ProfAura itself: bugs, suggestions and how the site feels to use. This is a
          separate dataset and never affects any teacher rating or ranking.
        </p>
      </header>

      <Alert tone="info" className="mt-6">
        <ShieldCheck aria-hidden="true" />
        <div>
          <AlertTitle>Nothing here identifies the sender</AlertTitle>
          <AlertDescription>
            A message shows only whether it came from a signed-in student or a visitor. A contact
            email appears only if the sender chose to leave one, is used for a reply, and is never
            shown publicly.
          </AlertDescription>
        </div>
      </Alert>

      <FeedbackQueue filters={filters} />
    </div>
  );
}
