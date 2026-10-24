import { describe, expect, it } from "vitest";
import {
  availableReviewCourses,
  availableReviewSemesters,
  hasAvailableReviewContext,
  reviewProfileHref,
} from "@/features/reviews/review-context";
import type { ReviewCatalog, ReviewScope } from "@/features/reviews/types";

const catalog: ReviewCatalog = {
  courses: [
    { id: "ai", title: "Artificial Intelligence", code: null },
    { id: "ds", title: "Data Structures", code: "CS-201" },
  ],
  semesters: [
    { id: "spring24", label: "Spring 2024" },
    { id: "fall24", label: "Fall 2024" },
  ],
  failed: false,
};

it("keeps the original course and semester when reopening a personal review", () => {
  expect(reviewProfileHref({ personSlug: "teacher-a", courseId: "course a", semesterId: "spring24" }))
    .toBe("/people/teacher-a?course=course+a&semester=spring24");
  expect(reviewProfileHref({ personSlug: "staff-a", courseId: null, semesterId: "fall24" }))
    .toBe("/people/staff-a?semester=fall24");
});
const scope = (
  courseId: string | null,
  semesterId: string | null,
): ReviewScope => ({ personId: "teacher-a", courseId, semesterId });

describe("shared review context", () => {
  it("offers the next semester for an already reviewed course", () => {
    const used = [scope("ai", "spring24")];
    expect(
      availableReviewCourses(catalog, used).map((course) => course.id),
    ).toEqual(["ai", "ds"]);
    expect(
      availableReviewSemesters(catalog, used, true, "ai").map(
        (semester) => semester.id,
      ),
    ).toEqual(["fall24"]);
  });

  it("offers another course in the same semester without allowing a duplicate", () => {
    expect(
      availableReviewCourses(
        catalog,
        [scope("ai", "spring24")],
        "spring24",
      ).map((course) => course.id),
    ).toEqual(["ds"]);
  });

  it("removes an exhausted course but keeps the rest of the catalog reviewable", () => {
    const used = [scope("ai", "spring24"), scope("ai", "fall24")];
    expect(
      availableReviewCourses(catalog, used).map((course) => course.id),
    ).toEqual(["ds"]);
    expect(hasAvailableReviewContext(catalog, used, true)).toBe(true);
    expect(
      hasAvailableReviewContext(
        catalog,
        [...used, scope("ds", "spring24"), scope("ds", "fall24")],
        true,
      ),
    ).toBe(false);
  });

  it("does not let old or duplicate scope rows exhaust new choices", () => {
    expect(
      availableReviewCourses(catalog, [
        scope("ai", "old-period"),
        scope("ai", "spring24"),
        scope("ai", "spring24"),
      ]),
    ).toHaveLength(2);
  });

  it("handles semester-only staff reviews without requiring a course list", () => {
    const staffCatalog = { ...catalog, courses: [] };
    expect(
      availableReviewSemesters(
        staffCatalog,
        [scope(null, "spring24")],
        false,
      ).map((semester) => semester.id),
    ).toEqual(["fall24"]);
    expect(hasAvailableReviewContext(staffCatalog, [], false)).toBe(true);
    expect(hasAvailableReviewContext(staffCatalog, [], true)).toBe(false);
  });

  it("disables creation when the shared list fails to load", () => {
    expect(
      hasAvailableReviewContext({ ...catalog, failed: true }, [], true),
    ).toBe(false);
    expect(
      hasAvailableReviewContext({ ...catalog, semesters: [] }, [], false),
    ).toBe(false);
  });
});
