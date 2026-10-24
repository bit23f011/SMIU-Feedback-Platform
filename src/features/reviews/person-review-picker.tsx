"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { reviewCourseLabel } from "@/features/reviews/review-context";
import type { ReviewCatalog } from "@/features/reviews/types";

// Card par selection kar ke wohi context review form me khulta hai.
export function PersonReviewPicker({
  personSlug,
  catalog,
}: {
  personSlug: string;
  catalog: ReviewCatalog;
}) {
  const uid = React.useId();
  const [courseId, setCourseId] = React.useState("");
  const [semesterId, setSemesterId] = React.useState("");
  const params = new URLSearchParams();
  if (courseId) params.set("course", courseId);
  if (semesterId) params.set("semester", semesterId);
  const query = params.toString();
  const href = `/people/${personSlug}${query ? `?${query}` : ""}#write-review`;
  return (
    <div className="relative z-10 mt-4 space-y-3 border-t border-border pt-4">
      <div className="space-y-1.5">
        <label
          htmlFor={`card-course-${uid}`}
          className="text-xs font-medium text-ink-700"
        >
          Course
        </label>
        <SearchableSelect
          id={`card-course-${uid}`}
          label="Course"
          value={courseId}
          onValueChange={setCourseId}
          options={catalog.courses.map((course) => ({
            value: course.id,
            label: reviewCourseLabel(course),
          }))}
          placeholder={
            catalog.failed
              ? "Courses unavailable"
              : catalog.courses.length
                ? "Search courses…"
                : "No courses yet"
          }
          disabled={catalog.failed || !catalog.courses.length}
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={`card-semester-${uid}`}
          className="text-xs font-medium text-ink-700"
        >
          Semester
        </label>
        <SearchableSelect
          id={`card-semester-${uid}`}
          label="Semester"
          value={semesterId}
          onValueChange={setSemesterId}
          options={catalog.semesters.map((semester) => ({
            value: semester.id,
            label: semester.label,
          }))}
          placeholder={
            catalog.failed
              ? "Semesters unavailable"
              : catalog.semesters.length
                ? "Search semesters…"
                : "No semesters yet"
          }
          disabled={catalog.failed || !catalog.semesters.length}
        />
      </div>
      {catalog.failed ? (
        <p
          role="alert"
          className="text-xs leading-relaxed text-muted-foreground"
        >
          Course and semester lists could not load. Refresh the page to try
          again.
        </p>
      ) : null}
      <Button asChild variant="outline" size="sm" className="w-full">
        <Link href={href}>
          Write a review
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}
