import * as React from "react";

import Link from "next/link";
import { BookOpen, SearchX, Users } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { searchCourses } from "@/features/discovery/queries";
import { Pagination, pageHref } from "@/features/discovery/pagination";
import { COURSES_PER_PAGE, totalPages } from "@/features/discovery/types";
import { formatCompactNumber } from "@/lib/utils";

/*
  CourseList - /courses ka result area (server component).

  Phase 4 se course card ek asli page par le jata hai: /courses/[slug] par us
  course ko parhane wale log aur unki course-wise rating milti hai (README §34).

  Paging server par hoti hai. Poora catalogue browser me bhejne ka koi faida
  nahi (README §84).
*/

export interface CourseListProps {
  search?: string;
  departmentId?: string | null;
  semesterId?: string | null;
  page?: number;
}

export async function CourseList({ search, departmentId, semesterId, page = 1 }: CourseListProps) {
  const { courses, total, failed } = await searchCourses({
    search,
    departmentId,
    semesterId,
    page,
  });

  if (failed) {
    return (
      <ErrorState
        title="We could not load the course list"
        description="This list is temporarily unavailable. Please refresh the page or try again shortly."
      />
    );
  }

  const query: Record<string, string> = {};
  if (search) query.q = search;
  if (departmentId) query.dept = departmentId;
  if (semesterId) query.semester = semesterId;

  const pages = totalPages(total, COURSES_PER_PAGE);
  const hasFilters = Boolean(search || departmentId || semesterId);

  if (courses.length === 0 && total > 0) {
    return (
      <EmptyState
        tone="no-results"
        icon={<SearchX />}
        title="That page is empty"
        description={`This search has ${pages === 1 ? "one page" : `${pages} pages`} of results.`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={pageHref("/courses", query, 1)}>Go to the first page</Link>
          </Button>
        }
      />
    );
  }

  if (courses.length === 0) {
    return hasFilters ? (
      <EmptyState
        tone="no-results"
        icon={<SearchX />}
        title={search ? `No courses matched “${search}”` : "No courses matched these filters"}
        description="Try the course code (for example “CS-201”), a shorter part of the title, or remove a filter."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/courses">Clear search and filters</Link>
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={<BookOpen />}
        title="No courses listed yet"
        description="Courses appear here once the university catalogue for the current semester is verified."
      />
    );
  }

  const first = (page - 1) * COURSES_PER_PAGE + 1;
  const last = first + courses.length - 1;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        {pages > 1 ? (
          <>
            Showing {first} to {last} of {formatCompactNumber(total)}{" "}
            {total === 1 ? "course" : "courses"}
          </>
        ) : (
          <>
            {formatCompactNumber(total)} {total === 1 ? "course" : "courses"}
          </>
        )}
        {search ? (
          <>
            {" "}
            matching <span className="font-medium text-foreground">“{search}”</span>
          </>
        ) : null}
      </p>

      <ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <li key={course.id} className="flex">
            <Card className="group relative flex w-full flex-col p-5 transition-[border-color,box-shadow] duration-150 ease-out hover:border-ink-300 hover:shadow-sm focus-within:border-primary">
              {course.code ? (
                <p className="font-mono text-xs font-medium uppercase tracking-wide text-indigo-600">
                  {course.code}
                </p>
              ) : null}

              <h3 className="mt-1 font-display text-base font-semibold leading-snug tracking-tight text-foreground">
                {/*
                  Stretched link: poora card clickable hai magar markup me sirf
                  ek hi link hai, is liye keyboard aur screen reader par shor
                  nahi hota.
                */}
                <Link href={`/courses/${course.slug}`} className="outline-none">
                  <span aria-hidden="true" className="absolute inset-0 rounded-lg" />
                  {course.title}
                </Link>
              </h3>

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {course.departmentShort ?? course.departmentName ? (
                  <Badge variant="brand">{course.departmentShort ?? course.departmentName}</Badge>
                ) : null}
                {typeof course.creditHours === "number" ? (
                  <Badge>
                    {course.creditHours} credit {course.creditHours === 1 ? "hour" : "hours"}
                  </Badge>
                ) : null}
              </div>

              <p className="mt-4 flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
                <Users aria-hidden="true" className="size-3.5 text-ink-400" />
                {course.teacherCount > 0
                  ? `${course.teacherCount} ${course.teacherCount === 1 ? "teacher" : "teachers"} on record`
                  : "No teachers on record yet"}
              </p>
            </Card>
          </li>
        ))}
      </ul>

      <Pagination
        page={page}
        totalPages={pages}
        pathname="/courses"
        query={query}
        className="pt-1"
      />
    </div>
  );
}
