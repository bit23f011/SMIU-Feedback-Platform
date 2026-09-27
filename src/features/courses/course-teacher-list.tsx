import * as React from "react";

import Link from "next/link";
import { SearchX, Users } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { RatingStars } from "@/components/common/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PersonAvatar } from "@/features/people/person-avatar";
import { getCourseTeachers } from "@/features/discovery/queries";
import { Pagination, pageHref } from "@/features/discovery/pagination";
import { COURSE_TEACHERS_PER_PAGE, totalPages } from "@/features/discovery/types";
import { getCategoryMeta } from "@/lib/constants";
import { formatCompactNumber } from "@/lib/utils";

/*
  CourseTeacherList - "is course ko kaun parhata hai" (README §34).

  Do rating alag alag dikhti hain, jaan boojh kar:
    overall      -> is shakhs ki poori rating (har course milakar)
    this course  -> sirf is course ki rating
  Course wali rating tab aati hai jab is course par itne review hon ke average
  ka matlab bane. Threshold DB me hai (platform_settings.breakdown_min_reviews),
  UI me nahi. Kam data ho to hum khali jagah chhor dete hain, 0 nahi likhte.
*/

export async function CourseTeacherList({
  courseId,
  courseSlug,
  page = 1,
}: {
  courseId: string;
  courseSlug: string;
  page?: number;
}) {
  const { teachers, total, failed } = await getCourseTeachers(courseId, { page });

  if (failed) {
    return (
      <ErrorState
        title="We could not load the teachers for this course"
        description="This list is temporarily unavailable. Please refresh the page or try again shortly."
      />
    );
  }

  const basePath = `/courses/${courseSlug}`;
  const pages = totalPages(total, COURSE_TEACHERS_PER_PAGE);

  if (teachers.length === 0 && total > 0) {
    return (
      <EmptyState
        tone="no-results"
        icon={<SearchX />}
        title="That page is empty"
        description={`This course has ${pages === 1 ? "one page" : `${pages} pages`} of teachers.`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={pageHref(basePath, undefined, 1)}>Go to the first page</Link>
          </Button>
        }
      />
    );
  }

  if (teachers.length === 0) {
    return (
      <EmptyState
        icon={<Users />}
        title="No teachers on record for this course yet"
        description="Teachers appear here once the university records a teaching assignment for this course."
      />
    );
  }

  const first = (page - 1) * COURSE_TEACHERS_PER_PAGE + 1;
  const last = first + teachers.length - 1;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        {pages > 1 ? (
          <>
            Showing {first} to {last} of {formatCompactNumber(total)}{" "}
            {total === 1 ? "teacher" : "teachers"}
          </>
        ) : (
          <>
            {formatCompactNumber(total)} {total === 1 ? "teacher" : "teachers"} on record
          </>
        )}
      </p>

      <ul className="grid list-none gap-4 sm:grid-cols-2">
        {teachers.map((teacher) => {
          const role = teacher.roles[0];
          const meta = role ? getCategoryMeta(role.category) : null;

          return (
            <li key={teacher.id} className="flex">
              <Card className="group relative flex w-full gap-4 p-5 transition-[border-color,box-shadow] duration-150 ease-out hover:border-ink-300 hover:shadow-sm focus-within:border-primary">
                <PersonAvatar
                  name={teacher.name}
                  gender={teacher.gender}
                  photoUrl={teacher.photoUrl}
                  className="h-12 w-12 shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[0.9375rem] font-semibold leading-snug tracking-tight text-foreground">
                    <Link href={`/people/${teacher.slug}`} className="outline-none">
                      <span aria-hidden="true" className="absolute inset-0 rounded-lg" />
                      {teacher.name}
                    </Link>
                  </h3>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {role ? (
                      <Badge variant="category">{role.title ?? meta?.singular ?? "Teacher"}</Badge>
                    ) : null}
                    {role?.department ? <Badge variant="brand">{role.department}</Badge> : null}
                  </div>

                  <dl className="mt-3 space-y-1.5 text-[0.8125rem]">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <dt className="text-muted-foreground">Overall</dt>
                      <dd>
                        <RatingStars
                          value={teacher.rating}
                          count={teacher.reviewCount}
                          className="gap-1.5"
                        />
                      </dd>
                    </div>

                    {teacher.courseAverage !== null ? (
                      <div className="flex flex-wrap items-center gap-x-2">
                        <dt className="text-muted-foreground">This course</dt>
                        <dd className="font-medium text-foreground">
                          {teacher.courseAverage.toFixed(1)} out of 10
                          {teacher.courseReviewCount ? (
                            <span className="ml-1 font-normal text-muted-foreground">
                              ({teacher.courseReviewCount}{" "}
                              {teacher.courseReviewCount === 1 ? "review" : "reviews"})
                            </span>
                          ) : null}
                        </dd>
                      </div>
                    ) : null}

                    {teacher.semestersTaught > 0 ? (
                      <div className="flex flex-wrap items-center gap-x-2">
                        <dt className="text-muted-foreground">Semesters taught</dt>
                        <dd className="font-medium text-foreground">{teacher.semestersTaught}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <Pagination page={page} totalPages={pages} pathname={basePath} className="pt-1" />
    </div>
  );
}
