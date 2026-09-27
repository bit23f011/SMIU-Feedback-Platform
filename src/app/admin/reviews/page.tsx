import type { Metadata } from "next";

import { ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ModerationQueue } from "@/features/admin/reviews/moderation-queue";
import {
  DEFAULT_QUEUE_STATUS,
  isModerationQueueStatus,
  type ModerationQueueStatus,
} from "@/features/admin/reviews/types";

export const metadata: Metadata = {
  title: "Reviews · Admin",
  robots: { index: false, follow: false },
};

/*
  Moderation queue hamesha live data par chalta hai - ek approve ke baad stale
  page dikhana admin ko dhoka dega.
*/
export const dynamic = "force-dynamic";

function readStatus(value: string | undefined): ModerationQueueStatus {
  return isModerationQueueStatus(value) ? value : DEFAULT_QUEUE_STATUS;
}

function readPage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default function AdminReviewsPage({
  searchParams,
}: {
  searchParams?: { status?: string; page?: string };
}) {
  const status = readStatus(searchParams?.status);
  const page = readPage(searchParams?.page);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Reviews
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Written review text waits here until it is approved. Star ratings are never held back,
          so a profile score is unaffected by anything on this page.
        </p>
      </header>

      <Alert tone="info" className="mt-6">
        <ShieldCheck aria-hidden="true" />
        <div>
          <AlertTitle>Moderation stays anonymous</AlertTitle>
          <AlertDescription>
            This screen shows the review, not the student who wrote it. Every action is authorised
            on the server with a role check and recorded in the audit log.
          </AlertDescription>
        </div>
      </Alert>

      <ModerationQueue status={status} page={page} />
    </div>
  );
}
