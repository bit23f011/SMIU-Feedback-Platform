import * as React from "react";

import type { Metadata } from "next";

import { ListSkeleton } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { CourseList } from "@/features/courses/course-list";
import { DirectorySearch } from "@/features/directory/directory-search";
import {
  COURSE_FILTER_FIELDS,
  DirectoryFilterBar,
  FilterControlsSkeleton,
} from "@/features/discovery/filter-bar";
import {
  FILTER_PARAMS,
  firstParam,
  parseId,
  parsePage,
  parseSearch,
  type QueryParams,
} from "@/features/discovery/types";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Browse the course catalogue at Sindh Madressatul Islam University, Karachi, and see which teachers are on record for each course.",
  alternates: { canonical: "/courses" },
};

export default function CoursesPage({ searchParams }: { searchParams?: QueryParams }) {
  const search = parseSearch(firstParam(searchParams, FILTER_PARAMS.search));
  const departmentId = parseId(firstParam(searchParams, FILTER_PARAMS.department));
  const semesterId = parseId(firstParam(searchParams, FILTER_PARAMS.semester));
  const page = parsePage(firstParam(searchParams, FILTER_PARAMS.page));

  const resultKey = `${search}|${departmentId}|${semesterId}|${page}`;

  return (
    <div className="container py-10 md:py-12">
      <PageHeader
        eyebrow="Catalogue"
        title="Courses"
        description="Find a course by its title or code, then open it to see who teaches it and how students rated them for that course."
      />

      <div className="mt-8 max-w-xl">
        <DirectorySearch
          label="Search courses by title or code"
          placeholder="Search by title or code"
        />
      </div>

      <React.Suspense fallback={<FilterControlsSkeleton count={2} className="mt-6" />}>
        <DirectoryFilterBar className="mt-6" fields={COURSE_FILTER_FIELDS} />
      </React.Suspense>

      <div className="mt-8">
        <React.Suspense key={resultKey} fallback={<ListSkeleton rows={6} />}>
          <CourseList
            search={search || undefined}
            departmentId={departmentId}
            semesterId={semesterId}
            page={page}
          />
        </React.Suspense>
      </div>
    </div>
  );
}
