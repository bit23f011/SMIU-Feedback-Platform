import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/common/empty-state";
import { ReportCard } from "@/features/admin/reports/report-card";
import { getAdminReportQueue } from "@/features/admin/reports/queries";
import {
  ADMIN_REPORTS_PER_PAGE,
  REPORT_TABS,
  type ReportStatus,
} from "@/features/admin/reports/types";
import { cn } from "@/lib/utils";

/*
  Reports queue (README §51).

  Moderation queue jaisa hi: server-side pagination, tabs asli links (JavaScript
  band ho to bhi chalti hain), har status ka apna URL. Ek waqt me sirf ek page.
*/

const BASE_HREF = "/admin/reports";

function hrefFor(status: ReportStatus, page?: number): string {
  const query = new URLSearchParams({ status });
  if (page && page > 1) query.set("page", String(page));
  return `${BASE_HREF}?${query.toString()}`;
}

function QueueTabs({ active }: { active: ReportStatus }) {
  return (
    <nav aria-label="Report status" className="mt-6">
      <ul className="-mx-1 flex list-none gap-1.5 overflow-x-auto px-1 pb-1">
        {REPORT_TABS.map((tab) => {
          const isActive = tab.status === active;

          return (
            <li key={tab.status}>
              <Link
                href={hrefFor(tab.status)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center whitespace-nowrap rounded-md border px-3 text-[0.8125rem] font-medium",
                  "transition-[background-color,border-color,color] duration-150 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-border bg-background text-ink-600 hover:bg-ink-50 hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function QueuePagination({
  status,
  page,
  pageCount,
}: {
  status: ReportStatus;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;

  const linkClass =
    "inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-ink-700 transition-colors duration-150 ease-out hover:border-indigo-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  const disabledClass =
    "inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-border/60 px-3 py-1.5 text-sm font-medium text-muted-foreground/60";

  return (
    <nav aria-label="Queue pages" className="flex items-center justify-between gap-3 pt-2">
      {page > 1 ? (
        <Link href={hrefFor(status, page - 1)} className={linkClass} rel="prev">
          <ChevronLeft aria-hidden="true" className="size-4" />
          Previous
        </Link>
      ) : (
        <span className={disabledClass} aria-hidden="true">
          <ChevronLeft className="size-4" />
          Previous
        </span>
      )}

      <p className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
        Page {page} of {pageCount}
      </p>

      {page < pageCount ? (
        <Link href={hrefFor(status, page + 1)} className={linkClass} rel="next">
          Next
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <span className={disabledClass} aria-hidden="true">
          Next
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}

export async function ReportQueue({
  status,
  page,
}: {
  status: ReportStatus;
  page: number;
}) {
  const queue = await getAdminReportQueue(status, page);
  const tab = REPORT_TABS.find((entry) => entry.status === status) ?? REPORT_TABS[0]!;
  const pageCount = Math.max(1, Math.ceil(queue.total / ADMIN_REPORTS_PER_PAGE));

  return (
    <>
      <QueueTabs active={status} />

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{tab.help}</p>

      {queue.failed ? (
        <Alert tone="danger" className="mt-4">
          <TriangleAlert aria-hidden="true" />
          <div>
            <AlertTitle>This list did not load</AlertTitle>
            <AlertDescription>
              Nothing has changed. Reload the page, and if it keeps failing, check that your
              account still has the admin role.
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      {!queue.failed && queue.reports.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<Inbox />}
            title={`Nothing ${tab.label.toLowerCase()} right now`}
            description="Reports raised against a profile appear here. Accepting a report records your decision only. Changing a profile is always a separate, explicit step."
          />
        </div>
      ) : null}

      {queue.reports.length > 0 ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm tabular-nums text-muted-foreground">
            {queue.total} {queue.total === 1 ? "report" : "reports"} in this list
          </p>

          <ul className="list-none space-y-4">
            {queue.reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </ul>

          <QueuePagination status={status} page={page} pageCount={pageCount} />
        </div>
      ) : null}
    </>
  );
}
