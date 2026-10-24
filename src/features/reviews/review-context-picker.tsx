"use client";

import * as React from "react";

import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  availableReviewCourses,
  availableReviewSemesters,
  reviewCourseLabel,
  reviewScopeKey,
} from "@/features/reviews/review-context";
import type { ReviewCatalog, ReviewScope } from "@/features/reviews/types";

// Shared lists se chunna hai; har teacher ke liye assignments zaroori nahi.
export function ReviewContextPicker({
  catalog,
  needsCourse,
  usedScopes = [],
  fieldErrors,
  initialCourseId = "",
  initialSemesterId = "",
}: {
  catalog: ReviewCatalog;
  needsCourse: boolean;
  usedScopes?: ReviewScope[];
  fieldErrors?: Record<string, string[]>;
  initialCourseId?: string;
  initialSemesterId?: string;
}) {
  const uid = React.useId();
  const [courseId, setCourseId] = React.useState(() =>
    availableReviewCourses(catalog, usedScopes).some(
      (course) => course.id === initialCourseId,
    )
      ? initialCourseId
      : "",
  );
  const [semesterId, setSemesterId] = React.useState(() => {
    const listed = catalog.semesters.some(
      (semester) => semester.id === initialSemesterId,
    );
    const used = usedScopes.some(
      (scope) =>
        reviewScopeKey(scope.courseId, scope.semesterId) ===
        reviewScopeKey(needsCourse ? courseId : null, initialSemesterId),
    );
    return listed && !used ? initialSemesterId : "";
  });
  const courses = availableReviewCourses(catalog, usedScopes, semesterId);
  const semesters = availableReviewSemesters(
    catalog,
    usedScopes,
    needsCourse,
    courseId,
  );

  if (
    catalog.failed ||
    !catalog.semesters.length ||
    (needsCourse && !catalog.courses.length)
  ) {
    return (
      <p
        role={catalog.failed ? "alert" : undefined}
        className="rounded-lg border border-dashed border-border bg-surface p-4 text-sm leading-relaxed text-muted-foreground"
      >
        {catalog.failed
          ? "The course and semester lists could not load. Please try again later."
          : "Courses and semesters have not been added yet. Please check back soon."}
      </p>
    );
  }

  const courseInputId = `review-course-${uid}`;
  const semesterInputId = `review-semester-${uid}`;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {needsCourse ? (
        <div className="space-y-2">
          <label
            htmlFor={courseInputId}
            className="text-sm font-medium text-ink-800"
          >
            Course
          </label>
          <p
            id={`${courseInputId}-hint`}
            className="text-xs leading-relaxed text-muted-foreground"
          >
            The course you studied with this person.
          </p>
          <SearchableSelect
            id={courseInputId}
            name="courseId"
            label="Course"
            value={courseId}
            placeholder="Search courses…"
            options={courses.map((course) => ({
              value: course.id,
              label: reviewCourseLabel(course),
            }))}
            invalid={Boolean(fieldErrors?.courseId?.length)}
            describedBy={`${courseInputId}-hint${fieldErrors?.courseId?.length ? ` ${courseInputId}-error` : ""}`}
            onValueChange={(next) => {
              setCourseId(next);
              if (
                usedScopes.some(
                  (scope) =>
                    reviewScopeKey(scope.courseId, scope.semesterId) ===
                    reviewScopeKey(next, semesterId),
                )
              )
                setSemesterId("");
            }}
          />
          {fieldErrors?.courseId?.[0] ? (
            <p
              id={`${courseInputId}-error`}
              role="alert"
              className="text-xs font-medium text-state-danger"
            >
              {fieldErrors.courseId[0]}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-2">
        <label
          htmlFor={semesterInputId}
          className="text-sm font-medium text-ink-800"
        >
          Semester
        </label>
        <p
          id={`${semesterInputId}-hint`}
          className="text-xs leading-relaxed text-muted-foreground"
        >
          The semester this experience is about.
        </p>
        <SearchableSelect
          id={semesterInputId}
          name="semesterId"
          label="Semester"
          value={semesterId}
          placeholder="Search semesters…"
          options={semesters.map((semester) => ({
            value: semester.id,
            label: semester.label,
          }))}
          invalid={Boolean(fieldErrors?.semesterId?.length)}
          describedBy={`${semesterInputId}-hint${fieldErrors?.semesterId?.length ? ` ${semesterInputId}-error` : ""}`}
          onValueChange={setSemesterId}
        />
        {fieldErrors?.semesterId?.[0] ? (
          <p
            id={`${semesterInputId}-error`}
            role="alert"
            className="text-xs font-medium text-state-danger"
          >
            {fieldErrors.semesterId[0]}
          </p>
        ) : null}
      </div>
    </div>
  );
}
