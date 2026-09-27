import type { Metadata } from "next";

import Link from "next/link";
import { ScrollText, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/features/discovery/pagination";
import { getAdminAudit } from "@/features/admin/audit/queries";
import { AUDIT_ENTITY_QUICK_FILTERS, type AdminAuditEntry } from "@/features/admin/audit/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Audit log · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const BASE_HREF = "/admin/audit";

function readPage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function entityHref(entity: string | null): string {
  return entity ? `${BASE_HREF}?entity=${encodeURIComponent(entity)}` : BASE_HREF;
}

function FilterChips({ active }: { active: string | null }) {
  const chipBase =
    "flex h-9 items-center whitespace-nowrap rounded-md border px-3 text-[0.8125rem] font-medium transition-[background-color,border-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  const chips: { label: string; value: string | null }[] = [
    { label: "All", value: null },
    ...AUDIT_ENTITY_QUICK_FILTERS.map((value) => ({ label: value, value })),
  ];

  return (
    <nav aria-label="Audit filters" className="mt-6">
      <ul className="-mx-1 flex list-none gap-1.5 overflow-x-auto px-1 pb-1">
        {chips.map((chip) => {
          const isActive = chip.value === active;
          return (
            <li key={chip.value ?? "all"}>
              <Link
                href={entityHref(chip.value)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  chipBase,
                  isActive
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-border bg-background text-ink-600 hover:bg-ink-50 hover:text-foreground",
                )}
              >
                {chip.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AuditRow({ entry }: { entry: AdminAuditEntry }) {
  const hasDetails = entry.details !== null && entry.details !== undefined;
  return (
    <li className="list-none rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand">{entry.entityType}</Badge>
            <span className="font-mono text-sm text-foreground">{entry.action}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {entry.actorEmail ?? "System"}
            {entry.entityId ? (
              <>
                {" · "}
                <span className="font-mono">{entry.entityId}</span>
              </>
            ) : null}
          </p>
        </div>
        <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatDateTime(entry.createdAt)}
        </p>
      </div>

      {hasDetails ? (
        <pre className="mt-3 max-h-48 overflow-auto rounded-md border border-border bg-ink-50/60 p-3 text-xs leading-relaxed text-ink-700">
          {JSON.stringify(entry.details, null, 2)}
        </pre>
      ) : null}
    </li>
  );
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams?: { entity?: string; page?: string };
}) {
  const entity = (searchParams?.entity ?? "").trim() || null;
  const page = readPage(searchParams?.page);

  const view = await getAdminAudit({ entityType: entity, page });
  const totalPages = Math.max(1, Math.ceil(view.total / view.pageSize));
  const paginationQuery = { entity: entity ?? "" };

  return (
    <div className="mx-auto max-w-4xl">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Audit log
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          A record of every admin action: who did what, to which item, and when. This view is read
          only.
        </p>
      </header>

      <Alert tone="info" className="mt-6">
        <ShieldCheck aria-hidden="true" />
        <div>
          <AlertTitle>The log is a record, not a control</AlertTitle>
          <AlertDescription>
            Entries are written by the database itself when an admin action runs, so the log cannot be
            edited from here. Secrets are never written to it.
          </AlertDescription>
        </div>
      </Alert>

      <FilterChips active={entity} />

      <section className="mt-6">
        {view.failed ? (
          <Alert tone="danger">
            <div>
              <AlertTitle>This log did not load</AlertTitle>
              <AlertDescription>
                Nothing has changed. Reload the page, and if it keeps failing, check that your
                account still has the admin role.
              </AlertDescription>
            </div>
          </Alert>
        ) : null}

        {!view.failed && view.items.length === 0 ? (
          <EmptyState
            tone={entity ? "no-results" : "empty"}
            icon={<ScrollText />}
            title={entity ? "No entries for this filter" : "No audit entries yet"}
            description={
              entity
                ? "Try a different entity filter or choose All to see everything."
                : "Admin actions will appear here as they happen."
            }
          />
        ) : null}

        {view.items.length > 0 ? (
          <>
            <p className="text-sm tabular-nums text-muted-foreground">
              {view.total} {view.total === 1 ? "entry" : "entries"}
            </p>
            <ul className="mt-3 list-none space-y-3">
              {view.items.map((entry) => (
                <AuditRow key={entry.id} entry={entry} />
              ))}
            </ul>
            <Pagination
              className="mt-6"
              page={view.page}
              totalPages={totalPages}
              pathname={BASE_HREF}
              query={paginationQuery}
            />
          </>
        ) : null}
      </section>
    </div>
  );
}
