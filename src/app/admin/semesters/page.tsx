import type { Metadata } from "next";

import { CalendarRange, Inbox, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { getAdminSemesters } from "@/features/admin/reference/queries";
import { SemesterForm } from "@/features/admin/reference/semester-form";
import {
  SEMESTER_SEASON_LABELS,
  type AdminSemester,
} from "@/features/admin/reference/types";

export const metadata: Metadata = {
  title: "Semesters · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function SemesterRow({ semester }: { semester: AdminSemester }) {
  return (
    <li className="list-none rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-medium text-foreground">{semester.label}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {SEMESTER_SEASON_LABELS[semester.season]} {semester.year}
            {" · "}
            <span className="font-mono">{semester.slug}</span>
          </p>
          {semester.startsOn || semester.endsOn ? (
            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
              {semester.startsOn ?? "?"} to {semester.endsOn ?? "?"}
            </p>
          ) : null}
          <p className="mt-1 text-xs tabular-nums text-muted-foreground">
            {semester.offeringCount} {semester.offeringCount === 1 ? "offering" : "offerings"}
          </p>
        </div>
        {semester.isCurrent ? (
          <Badge variant="accent">
            <CalendarRange aria-hidden="true" />
            Current
          </Badge>
        ) : null}
      </div>

      <details className="mt-3 border-t border-border pt-3">
        <summary className="cursor-pointer text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
          Edit
        </summary>
        <div className="mt-4">
          <SemesterForm semester={semester} />
        </div>
      </details>
    </li>
  );
}

export default async function AdminSemestersPage() {
  const view = await getAdminSemesters();

  return (
    <div className="mx-auto max-w-4xl">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Semesters
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The terms students pick when they leave a review. Mark exactly one as current.
        </p>
      </header>

      <Alert tone="info" className="mt-6">
        <ShieldCheck aria-hidden="true" />
        <div>
          <AlertTitle>One current semester at a time</AlertTitle>
          <AlertDescription>
            Setting a semester to current clears the flag on any other. Each season and year pair can
            exist only once.
          </AlertDescription>
        </div>
      </Alert>

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          New semester
        </h2>
        <Card className="mt-3 p-5">
          <SemesterForm />
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          All semesters
        </h2>

        {view.failed ? (
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

        {!view.failed && view.items.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={<Inbox />}
              title="No semesters yet"
              description="Add the first semester above, or apply the latest database changes if you expected data here."
            />
          </div>
        ) : null}

        {view.items.length > 0 ? (
          <ul className="mt-3 list-none space-y-3">
            {view.items.map((semester) => (
              <SemesterRow key={semester.id} semester={semester} />
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
