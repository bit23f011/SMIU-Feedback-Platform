import type { Metadata } from "next";

import { ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ReportQueue } from "@/features/admin/reports/report-queue";
import {
  DEFAULT_REPORT_STATUS,
  isReportQueueStatus,
  type ReportStatus,
} from "@/features/admin/reports/types";

export const metadata: Metadata = {
  title: "Reports · Admin",
  robots: { index: false, follow: false },
};

/*
  Reports queue hamesha live data par chale - ek accept/reject ke baad purana
  page admin ko dhoka dega.
*/
export const dynamic = "force-dynamic";

function readStatus(value: string | undefined): ReportStatus {
  return isReportQueueStatus(value) ? value : DEFAULT_REPORT_STATUS;
}

function readPage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default function AdminReportsPage({
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
          Reports
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Reports raised against a profile wait here for a decision. Accepting a report records
          your decision only. Hiding a profile or resetting its reviews is always a separate,
          explicit step.
        </p>
      </header>

      <Alert tone="info" className="mt-6">
        <ShieldCheck aria-hidden="true" />
        <div>
          <AlertTitle>A report never deletes a profile on its own</AlertTitle>
          <AlertDescription>
            Accept and reject only record your decision. To hide a profile or reset its reviews you
            must take that action yourself, with a reason. Every step is authorised on the server
            and written to the audit log.
          </AlertDescription>
        </div>
      </Alert>

      <ReportQueue status={status} page={page} />
    </div>
  );
}
