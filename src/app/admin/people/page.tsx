import type { Metadata } from "next";

import Link from "next/link";
import { Inbox, Search, ShieldCheck, UserPlus, Users } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/features/discovery/pagination";
import { getAdminPeople } from "@/features/admin/people/queries";
import {
  PEOPLE_STATUS_OPTIONS,
  PERSON_CATEGORY_LABELS,
  PERSON_CATEGORY_ORDER,
  TEACHER_TYPE_LABELS,
  isPeopleStatus,
  isPersonCategory,
  type AdminPersonListItem,
  type PeopleStatus,
  type PersonCategory,
} from "@/features/admin/people/types";

export const metadata: Metadata = {
  title: "People · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const BASE_HREF = "/admin/people";

function readPage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function PersonRow({ person }: { person: AdminPersonListItem }) {
  return (
    <li className="list-none">
      <Link
        href={`${BASE_HREF}/${person.id}`}
        className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-4 transition-colors duration-150 ease-out hover:border-ink-400 hover:bg-ink-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-foreground">{person.displayName ?? person.fullName}</h3>
            {person.primaryCategory ? (
              <Badge variant="category">{PERSON_CATEGORY_LABELS[person.primaryCategory]}</Badge>
            ) : null}
            {person.teacherType ? (
              <Badge variant="outline">{TEACHER_TYPE_LABELS[person.teacherType]}</Badge>
            ) : null}
          </div>
          {person.headline ? (
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{person.headline}</p>
          ) : null}
          <p className="mt-1 text-xs tabular-nums text-muted-foreground">
            {person.roleCount} {person.roleCount === 1 ? "role" : "roles"}
            {" · "}
            {person.reviewCount} {person.reviewCount === 1 ? "review" : "reviews"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge variant={person.isActive ? "brand" : "outline"}>
            {person.isActive ? "Active" : "Deactivated"}
          </Badge>
          {person.isVerified ? (
            <Badge variant="default">
              <ShieldCheck aria-hidden="true" />
              Verified
            </Badge>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

export default async function AdminPeoplePage({
  searchParams,
}: {
  searchParams?: { category?: string; status?: string; q?: string; page?: string };
}) {
  const category: PersonCategory | undefined = isPersonCategory(searchParams?.category)
    ? searchParams!.category
    : undefined;
  const status: PeopleStatus = isPeopleStatus(searchParams?.status)
    ? searchParams!.status
    : "all";
  const q = (searchParams?.q ?? "").trim();
  const page = readPage(searchParams?.page);

  const view = await getAdminPeople({ category, search: q, status, page });
  const totalPages = Math.max(1, Math.ceil(view.total / view.pageSize));
  const paginationQuery = { category: category ?? "", status, q };

  return (
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            People
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Every profile students can review: teachers, lab instructors, faculty and staff. One
            person is one public profile.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={`${BASE_HREF}/new`}>
            <UserPlus aria-hidden="true" />
            New person
          </Link>
        </Button>
      </header>

      <form method="get" action={BASE_HREF} className="mt-6 grid gap-3 sm:grid-cols-12">
        <div className="space-y-1.5 sm:col-span-5">
          <Label htmlFor="people-search">Search</Label>
          <Input
            id="people-search"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor="people-category">Category</Label>
          <Select id="people-category" name="category" defaultValue={category ?? ""}>
            <option value="">All categories</option>
            {PERSON_CATEGORY_ORDER.map((value) => (
              <option key={value} value={value}>
                {PERSON_CATEGORY_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="people-status">Status</Label>
          <Select id="people-status" name="status" defaultValue={status}>
            {PEOPLE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2">
          <Button type="submit" size="default" className="w-full">
            <Search aria-hidden="true" />
            Apply
          </Button>
        </div>
      </form>

      {(q || category || status !== "all") && (
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
          q || category || status !== "all" ? (
            <EmptyState
              tone="no-results"
              icon={<Search />}
              title="No people match these filters"
              description="Try a different search or clear the filters to see everyone."
            />
          ) : (
            <EmptyState
              icon={<Users />}
              title="No people yet"
              description="Add the first person to build the directory, or apply the latest database changes if you expected data here."
              action={
                <Button asChild size="sm">
                  <Link href={`${BASE_HREF}/new`}>
                    <UserPlus aria-hidden="true" />
                    New person
                  </Link>
                </Button>
              }
            />
          )
        ) : null}

        {view.items.length > 0 ? (
          <>
            <p className="text-sm tabular-nums text-muted-foreground">
              {view.total} {view.total === 1 ? "person" : "people"}
            </p>
            <ul className="mt-3 list-none space-y-3">
              {view.items.map((person) => (
                <PersonRow key={person.id} person={person} />
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
