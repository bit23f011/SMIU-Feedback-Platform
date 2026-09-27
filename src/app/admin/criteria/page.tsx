import type { Metadata } from "next";

import { Inbox, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { CriterionForm } from "@/features/admin/criteria/criterion-form";
import { getAdminCriteria } from "@/features/admin/criteria/queries";
import {
  CRITERION_KIND_LABELS,
  PERSON_CATEGORY_LABELS,
  PERSON_CATEGORY_ORDER,
  type AdminCriterion,
} from "@/features/admin/criteria/types";

export const metadata: Metadata = {
  title: "Criteria · Admin",
  robots: { index: false, follow: false },
};

/* Live data: add/retire ke baad purani list ghalat halat dikhaegi. */
export const dynamic = "force-dynamic";

function CriterionRow({ criterion }: { criterion: AdminCriterion }) {
  return (
    <li className="list-none rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-medium text-foreground">{criterion.label}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-mono">{criterion.key}</span>
            {" · "}
            {CRITERION_KIND_LABELS[criterion.kind]}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge variant={criterion.isActive ? "accent" : "outline"}>
            {criterion.isActive ? "Active" : "Retired"}
          </Badge>
          <span className="text-xs tabular-nums text-muted-foreground">
            {criterion.answerCount} {criterion.answerCount === 1 ? "answer" : "answers"}
          </span>
        </div>
      </div>

      {criterion.helpText ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-700">{criterion.helpText}</p>
      ) : null}

      <details className="mt-3 border-t border-border pt-3">
        <summary className="cursor-pointer text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
          Edit
        </summary>
        <div className="mt-4">
          <CriterionForm criterion={criterion} />
        </div>
      </details>
    </li>
  );
}

export default async function AdminCriteriaPage() {
  const view = await getAdminCriteria();

  const grouped = PERSON_CATEGORY_ORDER.map((category) => ({
    category,
    items: view.criteria.filter((criterion) => criterion.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Criteria
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The questions students rate for each kind of person. Add new criteria or retire old ones
          here, with no code change.
        </p>
      </header>

      <Alert tone="info" className="mt-6">
        <ShieldCheck aria-hidden="true" />
        <div>
          <AlertTitle>Criteria are never hard-deleted</AlertTitle>
          <AlertDescription>
            A criterion that already has answers cannot be removed, so past reviews keep their
            meaning. Retire it instead by setting it to Inactive. Its category, key and answer type
            are fixed once it exists.
          </AlertDescription>
        </div>
      </Alert>

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          New criterion
        </h2>
        <Card className="mt-3 p-5">
          <CriterionForm />
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          All criteria
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

        {!view.failed && view.criteria.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={<Inbox />}
              title="No criteria found"
              description="No rating criteria were returned. This usually means the latest database changes have not been applied yet."
            />
          </div>
        ) : null}

        {grouped.length > 0 ? (
          <div className="mt-3 space-y-8">
            {grouped.map((group) => (
              <div key={group.category}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {PERSON_CATEGORY_LABELS[group.category]}
                </h3>
                <ul className="mt-3 list-none space-y-3">
                  {group.items.map((criterion) => (
                    <CriterionRow key={criterion.id} criterion={criterion} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
