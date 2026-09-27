import * as React from "react";

import Link from "next/link";
import { SearchX, Users } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { Button } from "@/components/ui/button";
import { PersonGrid } from "@/features/people/person-card";
import { searchPeople } from "@/features/discovery/queries";
import { Pagination, pageHref } from "@/features/discovery/pagination";
import {
  activeFilterCount,
  filtersToQuery,
  PEOPLE_PER_PAGE,
  totalPages,
  type DirectoryFilters,
} from "@/features/discovery/types";
import type { PersonCategory } from "@/features/people/types";
import { getCategoryMeta } from "@/lib/constants";
import { formatCompactNumber } from "@/lib/utils";

/*
  CategoryDirectory - paanchon category pages ka shared result area (server component).

  Chaar alag states jaan boojh kar alag rakhe hain:
    failed          -> ErrorState  (query hi nahi chali)
    filters + 0     -> EmptyState tone="no-results"
    no filters + 0  -> EmptyState tone="empty"  (directory abhi khali hai)
    page out of range -> pehle page ka raasta
  Inko mix karna user ko confuse karta hai: "kuch nahi mila" aur "kuch toot gaya"
  ek jaisi cheez nahi.

  Paging server par hoti hai: ek page par PEOPLE_PER_PAGE se zyada profile browser
  tak nahi jate (README §84).
*/

export interface CategoryDirectoryProps {
  category: PersonCategory;
  filters: DirectoryFilters;
}

export async function CategoryDirectory({ category, filters }: CategoryDirectoryProps) {
  const meta = getCategoryMeta(category);
  const { people, total, failed } = await searchPeople({ category, filters });

  if (failed) {
    return (
      <ErrorState
        title="We could not load this directory"
        description="This list is temporarily unavailable. Please refresh the page or try again shortly."
      />
    );
  }

  const basePath = `/${meta.slug}`;
  const query = filtersToQuery(filters);
  const pages = totalPages(total, PEOPLE_PER_PAGE);
  const hasFilters = Boolean(filters.search) || activeFilterCount(filters) > 0;

  // Total kuch hai magar is page par kuch nahi: page number had se bahar hai.
  if (people.length === 0 && total > 0) {
    return (
      <EmptyState
        tone="no-results"
        icon={<SearchX />}
        title="That page is empty"
        description={`This search has ${pages === 1 ? "one page" : `${pages} pages`} of results.`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={pageHref(basePath, query, 1)}>Go to the first page</Link>
          </Button>
        }
      />
    );
  }

  if (people.length === 0) {
    return hasFilters ? (
      <EmptyState
        tone="no-results"
        icon={<SearchX />}
        title={
          filters.search
            ? `No ${meta.label.toLowerCase()} matched “${filters.search}”`
            : `No ${meta.label.toLowerCase()} matched these filters`
        }
        description="Check the spelling, try a shorter part of the name, or remove a filter."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={basePath}>Clear search and filters</Link>
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={<Users />}
        title={`No ${meta.label.toLowerCase()} listed yet`}
        description="This directory is still being prepared. Profiles appear here once the university records are verified."
      />
    );
  }

  const first = (filters.page - 1) * PEOPLE_PER_PAGE + 1;
  const last = first + people.length - 1;
  const noun = total === 1 ? meta.singular.toLowerCase() : meta.label.toLowerCase();

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        {pages > 1 ? (
          <>
            Showing {first} to {last} of {formatCompactNumber(total)} {noun}
          </>
        ) : (
          <>
            {formatCompactNumber(total)} {noun}
          </>
        )}
        {filters.search ? (
          <>
            {" "}
            matching <span className="font-medium text-foreground">“{filters.search}”</span>
          </>
        ) : null}
      </p>

      <PersonGrid people={people} contextCategory={category} />

      <Pagination
        page={filters.page}
        totalPages={pages}
        pathname={basePath}
        query={query}
        className="pt-1"
      />
    </div>
  );
}
