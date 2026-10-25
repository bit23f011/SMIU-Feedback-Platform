import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { PersonGridSkeleton } from "@/components/common/loading-state";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { Button } from "@/components/ui/button";
import { DirectorySearch } from "@/features/directory/directory-search";
import { PersonGrid } from "@/features/people/person-card";
import { searchAllPeople } from "@/features/people/queries";
import { Pagination, pageHref } from "@/features/discovery/pagination";
import {
  PEOPLE_PER_PAGE,
  readDirectoryFilters,
  totalPages,
  type QueryParams,
} from "@/features/discovery/types";

export const metadata: Metadata = {
  title: "People",
  description:
    "Search teachers, lab instructors, faculty and campus staff by name.",
  alternates: { canonical: "/people" },
};
export const dynamic = "force-dynamic";

async function PeopleResults({
  search,
  page,
}: {
  search: string;
  page: number;
}) {
  const { people, total, failed } = await searchAllPeople({ search, page });
  if (failed)
    return (
      <ErrorState
        title="We could not load these results"
        description="Please refresh or try again shortly."
      />
    );
  const query = search ? { q: search } : {};
  if (!people.length)
    return (
      <EmptyState
        title={
          total > 0
            ? "That page is empty"
            : search
              ? `No people matched “${search}”`
              : "No people listed yet"
        }
        description={
          total > 0
            ? "Return to the first page of these results."
            : "Try a shorter part of the name or check the spelling."
        }
        action={
          <Button asChild variant="outline">
            <Link href={total > 0 ? pageHref("/people", query, 1) : "/people"}>
              {total > 0 ? "First page" : "Clear search"}
            </Link>
          </Button>
        }
      />
    );
  return (
    <div className="space-y-5">
      <p role="status" className="text-sm text-muted-foreground">
        {total} {total === 1 ? "person" : "people"}
        {search ? ` matching “${search}”` : " across all categories"}
      </p>
      <PersonGrid people={people} />
      <Pagination
        page={page}
        totalPages={totalPages(total, PEOPLE_PER_PAGE)}
        pathname="/people"
        query={query}
      />
    </div>
  );
}

export default function PeoplePage({
  searchParams,
}: {
  searchParams?: QueryParams;
}) {
  const { search, page } = readDirectoryFilters(searchParams);
  return (
    <div className="container py-10 md:py-12">
      <PageHeader
        eyebrow="Directory"
        title="People"
        description="Find teachers, lab instructors, faculty, university staff and HR staff in one search."
      />
      <div className="my-8 max-w-2xl">
        <DirectorySearch
          label="Search all people by name"
          placeholder="Search any teacher, faculty or staff name"
        />
      </div>
      <Suspense key={`${search}|${page}`} fallback={<PersonGridSkeleton />}>
        <PeopleResults search={search} page={page} />
      </Suspense>
    </div>
  );
}
