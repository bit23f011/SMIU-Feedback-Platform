import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox, Search, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/common/empty-state";
import { FeedbackCard } from "@/features/admin/feedback/feedback-card";
import { getAdminFeedbackQueue } from "@/features/admin/feedback/queries";
import {
  ADMIN_FEEDBACK_PER_PAGE,
  FEEDBACK_TABS,
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_TYPE_ORDER,
  type AdminFeedbackFilters,
  type FeedbackStatus,
} from "@/features/admin/feedback/types";
import { cn } from "@/lib/utils";

/*
  Website feedback queue (README §56 - §59).

  Reports queue jaisa hi dhaancha: status tabs asli links, server-side
  pagination. Iske ilawa type filter, search aur "important only" bhi hain -
  ek GET form se, taake JavaScript ke baghair bhi chalein aur har filter ka
  apna URL ho.
*/

const BASE_HREF = "/admin/website-feedback";

/* Mojooda filters ko base bana kar, kuch override ke saath query string. */
function buildQuery(filters: AdminFeedbackFilters, overrides: Record<string, string | null>): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.importantOnly) params.set("important", "1");
  if (filters.page > 1) params.set("page", String(filters.page));

  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }

  const query = params.toString();
  return query ? `${BASE_HREF}?${query}` : BASE_HREF;
}

function StatusTabs({ filters }: { filters: AdminFeedbackFilters }) {
  return (
    <nav aria-label="Feedback status" className="mt-6">
      <ul className="-mx-1 flex list-none gap-1.5 overflow-x-auto px-1 pb-1">
        {FEEDBACK_TABS.map((tab) => {
          const isActive = tab.status === filters.status;

          return (
            <li key={tab.status}>
              <Link
                // Tab badalne par type/search/important rehte hain, page reset.
                href={buildQuery(filters, { status: tab.status, page: null })}
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

/*
  Filter row. GET form: submit karte hi query string ban jati hai (koi
  client state nahi). status hidden hai taake mojooda tab qaim rahe; page
  jaan-boojh kar shaamil nahi taake filter badalte hi pehle page par aa jaye.
*/
function FilterBar({ filters }: { filters: AdminFeedbackFilters }) {
  return (
    <form method="get" action={BASE_HREF} className="mt-4 flex flex-wrap items-end gap-3">
      <input type="hidden" name="status" value={filters.status ?? ""} />

      <div className="space-y-1.5">
        <Label htmlFor="feedback-type" className="text-xs">
          Type
        </Label>
        <Select id="feedback-type" name="type" defaultValue={filters.type ?? ""} className="h-9 w-44">
          <option value="">All types</option>
          {FEEDBACK_TYPE_ORDER.map((value) => (
            <option key={value} value={value}>
              {FEEDBACK_TYPE_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      <div className="min-w-48 flex-1 space-y-1.5">
        <Label htmlFor="feedback-search" className="text-xs">
          Search text
        </Label>
        <Input
          id="feedback-search"
          name="q"
          type="search"
          defaultValue={filters.search}
          placeholder="Find words in the message"
          className="h-9"
        />
      </div>

      <label className="inline-flex h-9 items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          name="important"
          value="1"
          defaultChecked={filters.importantOnly}
          className="size-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        Important only
      </label>

      <Button type="submit" size="sm" variant="outline">
        <Search aria-hidden="true" />
        Apply
      </Button>

      {filters.type || filters.search.trim() || filters.importantOnly ? (
        <Link
          href={buildQuery(filters, { type: null, q: null, important: null, page: null })}
          className="inline-flex h-9 items-center text-sm font-medium text-primary hover:underline"
        >
          Clear filters
        </Link>
      ) : null}
    </form>
  );
}

function QueuePagination({
  filters,
  pageCount,
}: {
  filters: AdminFeedbackFilters;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;

  const linkClass =
    "inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-ink-700 transition-colors duration-150 ease-out hover:border-indigo-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  const disabledClass =
    "inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-border/60 px-3 py-1.5 text-sm font-medium text-muted-foreground/60";

  return (
    <nav aria-label="Queue pages" className="flex items-center justify-between gap-3 pt-2">
      {filters.page > 1 ? (
        <Link
          href={buildQuery(filters, { page: String(filters.page - 1) })}
          className={linkClass}
          rel="prev"
        >
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
        Page {filters.page} of {pageCount}
      </p>

      {filters.page < pageCount ? (
        <Link
          href={buildQuery(filters, { page: String(filters.page + 1) })}
          className={linkClass}
          rel="next"
        >
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

export async function FeedbackQueue({ filters }: { filters: AdminFeedbackFilters }) {
  const queue = await getAdminFeedbackQueue(filters);
  const activeStatus: FeedbackStatus | null = filters.status;
  const tab = FEEDBACK_TABS.find((entry) => entry.status === activeStatus) ?? null;
  const pageCount = Math.max(1, Math.ceil(queue.total / ADMIN_FEEDBACK_PER_PAGE));

  return (
    <>
      <StatusTabs filters={filters} />
      <FilterBar filters={filters} />

      {tab ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{tab.help}</p>
      ) : null}

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

      {!queue.failed && queue.feedback.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<Inbox />}
            title="Nothing here right now"
            description="Feedback about SMIU Feedback Website from students and visitors collects here. It is a separate dataset and never affects any rating or ranking."
          />
        </div>
      ) : null}

      {queue.feedback.length > 0 ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm tabular-nums text-muted-foreground">
            {queue.total} {queue.total === 1 ? "message" : "messages"} in this list
          </p>

          <ul className="list-none space-y-4">
            {queue.feedback.map((item) => (
              <FeedbackCard key={item.id} feedback={item} />
            ))}
          </ul>

          <QueuePagination filters={filters} pageCount={pageCount} />
        </div>
      ) : null}
    </>
  );
}
