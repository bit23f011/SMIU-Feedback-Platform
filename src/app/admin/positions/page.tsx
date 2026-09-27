import type { Metadata } from "next";

import { Inbox, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { getAdminPositions } from "@/features/admin/reference/queries";
import { setPositionActiveAction } from "@/features/admin/reference/actions";
import { PositionForm } from "@/features/admin/reference/position-form";
import { ActiveToggleForm } from "@/features/admin/reference/reference-controls";
import { PERSON_CATEGORY_LABELS, type AdminPosition } from "@/features/admin/reference/types";

export const metadata: Metadata = {
  title: "Positions · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function PositionRow({ position }: { position: AdminPosition }) {
  return (
    <li className="list-none rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-medium text-foreground">{position.title}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {position.category ? PERSON_CATEGORY_LABELS[position.category] : "Any category"}
            {" · "}
            <span className="tabular-nums">rank {position.rank}</span>
          </p>
          <p className="mt-1 text-xs tabular-nums text-muted-foreground">
            {position.roleCount} {position.roleCount === 1 ? "person" : "people"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge variant={position.isActive ? "brand" : "outline"}>
            {position.isActive ? "Active" : "Archived"}
          </Badge>
          <ActiveToggleForm
            action={setPositionActiveAction}
            id={position.id}
            isActive={position.isActive}
          />
        </div>
      </div>

      <details className="mt-3 border-t border-border pt-3">
        <summary className="cursor-pointer text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
          Edit
        </summary>
        <div className="mt-4">
          <PositionForm position={position} />
        </div>
      </details>
    </li>
  );
}

export default async function AdminPositionsPage() {
  const view = await getAdminPositions();

  return (
    <div className="mx-auto max-w-4xl">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Positions
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The titles a person can hold, such as HOD or Dean. Only approved titles are accepted.
        </p>
      </header>

      <Alert tone="info" className="mt-6">
        <ShieldCheck aria-hidden="true" />
        <div>
          <AlertTitle>Only approved titles are allowed</AlertTitle>
          <AlertDescription>
            Approved titles are HOD, Coordinator, Dean, Associate Professor, Professor and Other. Any
            other title is rejected. Positions are archived, never deleted.
          </AlertDescription>
        </div>
      </Alert>

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          New position
        </h2>
        <Card className="mt-3 p-5">
          <PositionForm />
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          All positions
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
              title="No positions yet"
              description="Add the first position above, or apply the latest database changes if you expected data here."
            />
          </div>
        ) : null}

        {view.items.length > 0 ? (
          <ul className="mt-3 list-none space-y-3">
            {view.items.map((position) => (
              <PositionRow key={position.id} position={position} />
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
