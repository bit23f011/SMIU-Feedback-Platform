import * as React from "react";

import Link from "next/link";

import { RatingStars } from "@/components/common/rating-stars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPersonCourseRatings, getPersonSemesterRatings } from "@/features/discovery/queries";
import { yesPercent, type CriterionAggregate } from "@/features/discovery/types";

/*
  ProfileBreakdowns - README §38, §39: ek teacher ki rating course-wise aur
  semester-wise.

  PRIVACY BRAKE (wahi jo RatingSummary me hai): kisi cheez par 3 se kam jawab
  hon to number nahi dikhate. DB pehle hi breakdown_min_reviews threshold laga
  kar sirf woh course/semester deti hai jinme kaafi data ho; yahan yeh doosri
  parat sirf ehtiyat ke liye hai (defense in depth).

  Dono list khali ho sakti hain. Iska matlab "kuch toot gaya" nahi, balki abhi
  itna data nahi ke alag breakdown dikhaya ja sake. Aisi soorat me hum kuch
  render nahi karte - overall rating upar aside me pehle se maujood hai.
*/

const MIN_RESPONSES_TO_SHOW = 3;

function CriterionChips({ criteria }: { criteria: CriterionAggregate[] }) {
  const visible = criteria.filter((criterion) =>
    criterion.kind === "star"
      ? criterion.starResponses >= MIN_RESPONSES_TO_SHOW
      : criterion.boolResponses >= MIN_RESPONSES_TO_SHOW,
  );

  if (visible.length === 0) return null;

  return (
    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {visible.map((criterion) => {
        const value =
          criterion.kind === "star"
            ? criterion.averageStar === null
              ? null
              : `${criterion.averageStar.toFixed(1)}/5`
            : (() => {
                const percent = yesPercent(criterion);
                return percent === null ? null : `${percent}% yes`;
              })();

        if (value === null) return null;

        return (
          <li key={criterion.key}>
            <span className="text-ink-600">{criterion.label}:</span>{" "}
            <span className="font-medium tabular-nums text-foreground">{value}</span>
          </li>
        );
      })}
    </ul>
  );
}

export async function ProfileBreakdowns({ personId }: { personId: string }) {
  const [courses, semesters] = await Promise.all([
    getPersonCourseRatings(personId),
    getPersonSemesterRatings(personId),
  ]);

  if (courses.length === 0 && semesters.length === 0) return null;

  return (
    <div className="space-y-6">
      {courses.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Ratings by course</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-none divide-y divide-border">
              {courses.map((course) => (
                <li key={course.courseId} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <div className="min-w-0">
                      {course.courseCode ? (
                        <span className="font-mono text-xs font-medium uppercase tracking-wide text-indigo-600">
                          {course.courseCode}
                        </span>
                      ) : null}
                      <Link
                        href={`/courses/${course.courseSlug}`}
                        className="ml-0 block truncate text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
                      >
                        {course.courseTitle}
                      </Link>
                    </div>

                    <div className="shrink-0 text-right">
                      {course.averageRating === null ? (
                        <span className="text-sm text-muted-foreground">Not rated</span>
                      ) : (
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {course.averageRating.toFixed(1)}
                          <span className="font-normal text-muted-foreground"> / 10</span>
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {course.reviewCount} {course.reviewCount === 1 ? "review" : "reviews"}
                      </p>
                    </div>
                  </div>

                  <CriterionChips criteria={course.criteria} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {semesters.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Ratings by semester</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-none divide-y divide-border">
              {semesters.map((semester) => (
                <li
                  key={semester.semesterId}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
                >
                  <span className="text-sm font-medium text-foreground">{semester.label}</span>
                  <div className="flex items-center gap-3">
                    <RatingStars value={semester.averageRating} count={semester.reviewCount} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/** Fallback jab breakdown data stream ho raha ho. */
export function ProfileBreakdownsSkeleton() {
  return (
    <div aria-hidden="true" className="rounded-lg border border-border bg-card p-5">
      <div className="h-4 w-36 rounded bg-ink-200/70" />
      <div className="mt-4 space-y-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="h-3.5 w-48 rounded bg-ink-100" />
            <div className="h-3.5 w-16 rounded bg-ink-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
