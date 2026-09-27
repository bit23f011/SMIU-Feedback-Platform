import type { Metadata } from "next";

import Link from "next/link";
import { GraduationCap, Search, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/features/discovery/pagination";
import { getAdminStudents } from "@/features/admin/students/queries";
import {
  STUDENT_STATUS_OPTIONS,
  isStudentStatus,
  type AdminStudent,
  type StudentStatus,
} from "@/features/admin/students/types";

export const metadata: Metadata = {
  title: "Students · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const BASE_HREF = "/admin/students";

function readPage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StudentRow({ student }: { student: AdminStudent }) {
  return (
    <li className="list-none rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm text-foreground">{student.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">Joined {formatDate(student.createdAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="default">{student.role}</Badge>
          <Badge variant={student.isActive ? "brand" : "outline"}>
            {student.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>
    </li>
  );
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams?: { status?: string; q?: string; page?: string };
}) {
  const status: StudentStatus = isStudentStatus(searchParams?.status)
    ? searchParams!.status
    : "all";
  const q = (searchParams?.q ?? "").trim();
  const page = readPage(searchParams?.page);

  const view = await getAdminStudents({ search: q, status, page });
  const totalPages = Math.max(1, Math.ceil(view.total / view.pageSize));
  const paginationQuery = { status, q };

  return (
    <div className="mx-auto max-w-4xl">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Students
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The signed-up accounts on the platform. This view is read only.
        </p>
      </header>

      <Alert tone="info" className="mt-6">
        <ShieldCheck aria-hidden="true" />
        <div>
          <AlertTitle>Accounts are never linked to reviews</AlertTitle>
          <AlertDescription>
            This list is deliberately kept separate from review data, so no account can be traced to
            the reviews it wrote. That separation is what keeps reviews anonymous.
          </AlertDescription>
        </div>
      </Alert>

      <form method="get" action={BASE_HREF} className="mt-6 grid gap-3 sm:grid-cols-12">
        <div className="space-y-1.5 sm:col-span-7">
          <Label htmlFor="students-search">Search</Label>
          <Input
            id="students-search"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by email"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor="students-status">Status</Label>
          <Select id="students-status" name="status" defaultValue={status}>
            {STUDENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end sm:col-span-2">
          <Button type="submit" size="default" className="w-full">
            <Search aria-hidden="true" />
            Apply
          </Button>
        </div>
      </form>

      {(q || status !== "all") && (
        <div className="mt-3">
          <Button asChild variant="link" size="sm">
            <Link href={BASE_HREF}>Clear filters</Link>
          </Button>
        </div>
      )}

      <section className="mt-6">
        {view.failed ? (
          <Alert tone="danger">
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
          <EmptyState
            tone={q || status !== "all" ? "no-results" : "empty"}
            icon={q || status !== "all" ? <Search /> : <GraduationCap />}
            title={q || status !== "all" ? "No accounts match these filters" : "No accounts yet"}
            description={
              q || status !== "all"
                ? "Try a different search or clear the filters to see everyone."
                : "Accounts appear here once students sign up."
            }
          />
        ) : null}

        {view.items.length > 0 ? (
          <>
            <p className="text-sm tabular-nums text-muted-foreground">
              {view.total} {view.total === 1 ? "account" : "accounts"}
            </p>
            <ul className="mt-3 list-none space-y-3">
              {view.items.map((student) => (
                <StudentRow key={student.id} student={student} />
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
