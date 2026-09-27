import type { Metadata } from "next";

import { Inbox, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { getAdminDepartments, getAdminPrograms } from "@/features/admin/reference/queries";
import { setProgramActiveAction } from "@/features/admin/reference/actions";
import { ProgramForm } from "@/features/admin/reference/program-form";
import { ActiveToggleForm } from "@/features/admin/reference/reference-controls";
import {
  PROGRAM_LEVEL_LABELS,
  type AdminDepartment,
  type AdminProgram,
} from "@/features/admin/reference/types";

export const metadata: Metadata = {
  title: "Programs · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function ProgramRow({
  program,
  departments,
}: {
  program: AdminProgram;
  departments: AdminDepartment[];
}) {
  return (
    <li className="list-none rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-medium text-foreground">{program.name}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {program.shortName ? <span>{program.shortName}{" · "}</span> : null}
            {PROGRAM_LEVEL_LABELS[program.level]}
            {program.departmentName ? <span>{" · "}{program.departmentName}</span> : null}
          </p>
          <p className="mt-1 text-xs tabular-nums text-muted-foreground">
            {program.courseCount} {program.courseCount === 1 ? "course" : "courses"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge variant={program.isActive ? "brand" : "outline"}>
            {program.isActive ? "Active" : "Archived"}
          </Badge>
          <ActiveToggleForm
            action={setProgramActiveAction}
            id={program.id}
            isActive={program.isActive}
          />
        </div>
      </div>

      <details className="mt-3 border-t border-border pt-3">
        <summary className="cursor-pointer text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
          Edit
        </summary>
        <div className="mt-4">
          <ProgramForm program={program} departments={departments} />
        </div>
      </details>
    </li>
  );
}

export default async function AdminProgramsPage() {
  const [view, departmentsList] = await Promise.all([getAdminPrograms(), getAdminDepartments()]);
  const departments = departmentsList.items;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Programs
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Degree programs within each department. Set the level and the department a program belongs
          to.
        </p>
      </header>

      <Alert tone="info" className="mt-6">
        <ShieldCheck aria-hidden="true" />
        <div>
          <AlertTitle>Programs are archived, never deleted</AlertTitle>
          <AlertDescription>
            Archiving keeps linked courses intact. A program needs a department, so add departments
            first if the list below is empty.
          </AlertDescription>
        </div>
      </Alert>

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          New program
        </h2>
        <Card className="mt-3 p-5">
          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add at least one department before creating a program.
            </p>
          ) : (
            <ProgramForm departments={departments} />
          )}
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          All programs
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
              title="No programs yet"
              description="Add the first program above, or apply the latest database changes if you expected data here."
            />
          </div>
        ) : null}

        {view.items.length > 0 ? (
          <ul className="mt-3 list-none space-y-3">
            {view.items.map((program) => (
              <ProgramRow key={program.id} program={program} departments={departments} />
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
