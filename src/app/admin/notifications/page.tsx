import type { Metadata } from "next";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { NotificationForm } from "@/features/admin/notifications/notification-form";
import { NotificationItem } from "@/features/admin/notifications/notification-item";
import { getAdminNotifications } from "@/features/admin/notifications/queries";
import { ADMIN_NOTIFICATIONS_PER_PAGE } from "@/features/admin/notifications/types";

export const metadata: Metadata = {
  title: "Notifications · Admin",
  robots: { index: false, follow: false },
};

/* Live data: activate/deactivate ke baad purana page ghalat halat dikhaega. */
export const dynamic = "force-dynamic";

function readPage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const page = readPage(searchParams?.page);
  const data = await getAdminNotifications(page);
  const pageCount = Math.max(1, Math.ceil(data.total / ADMIN_NOTIFICATIONS_PER_PAGE));

  return (
    <div className="mx-auto max-w-4xl">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Notifications
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The announcement banner shown across the public site. Give a notice a start and end time
          and the site turns it on and off by itself, with no code change.
        </p>
      </header>

      <Alert tone="info" className="mt-6">
        <ShieldCheck aria-hidden="true" />
        <div>
          <AlertTitle>The schedule is decided on the server</AlertTitle>
          <AlertDescription>
            Whether a notice is live is worked out from the server clock and its active switch, not
            from anything in the browser. The public site shows only what is genuinely live.
          </AlertDescription>
        </div>
      </Alert>

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          New notification
        </h2>
        <Card className="mt-3 p-5">
          <NotificationForm />
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          All notifications
        </h2>

        {data.failed ? (
          <Alert tone="danger" className="mt-3">
            <div>
              <AlertTitle>This list did not load</AlertTitle>
              <AlertDescription>
                Nothing has changed. Reload the page, and if it keeps failing, check that your
                account still has the admin role.
              </AlertDescription>
            </div>
          </Alert>
        ) : null}

        {!data.failed && data.notifications.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={<Inbox />}
              title="No notifications yet"
              description="Anything you create above appears here, including notices that are off or waiting for their start time."
            />
          </div>
        ) : null}

        {data.notifications.length > 0 ? (
          <>
            <p className="mt-3 text-sm tabular-nums text-muted-foreground">
              {data.total} {data.total === 1 ? "notification" : "notifications"} in total
            </p>
            <ul className="mt-3 list-none space-y-4">
              {data.notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
            </ul>

            {pageCount > 1 ? (
              <nav aria-label="Notification pages" className="mt-6 flex items-center justify-between gap-3">
                {page > 1 ? (
                  <Link
                    href={`/admin/notifications?page=${page - 1}`}
                    rel="prev"
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-ink-700 hover:border-indigo-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <ChevronLeft aria-hidden="true" className="size-4" />
                    Previous
                  </Link>
                ) : (
                  <span aria-hidden="true" className="inline-flex items-center gap-1 rounded-md border border-border/60 px-3 py-1.5 text-sm font-medium text-muted-foreground/60">
                    <ChevronLeft className="size-4" />
                    Previous
                  </span>
                )}

                <p className="text-sm tabular-nums text-muted-foreground">
                  Page {page} of {pageCount}
                </p>

                {page < pageCount ? (
                  <Link
                    href={`/admin/notifications?page=${page + 1}`}
                    rel="next"
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-ink-700 hover:border-indigo-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Next
                    <ChevronRight aria-hidden="true" className="size-4" />
                  </Link>
                ) : (
                  <span aria-hidden="true" className="inline-flex items-center gap-1 rounded-md border border-border/60 px-3 py-1.5 text-sm font-medium text-muted-foreground/60">
                    Next
                    <ChevronRight className="size-4" />
                  </span>
                )}
              </nav>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
