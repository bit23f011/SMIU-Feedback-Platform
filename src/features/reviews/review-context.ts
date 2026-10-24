import type {
  ReviewCatalog,
  ReviewCourseOption,
  ReviewScope,
  ReviewSemesterOption,
} from "@/features/reviews/types";

export function reviewScopeKey(
  courseId: string | null,
  semesterId: string | null,
): string {
  return `${courseId ?? ""}|${semesterId ?? ""}`;
}

// Sirf mojooda semesters gino; purani review kisi naye option ko nahi rokti.
function usedSemesters(catalog: ReviewCatalog, scopes: ReviewScope[]) {
  const listed = new Set(catalog.semesters.map((semester) => semester.id));
  const used = new Map<string, Set<string>>();
  for (const scope of scopes) {
    if (!scope.semesterId || !listed.has(scope.semesterId)) continue;
    const key = scope.courseId ?? "";
    const semesters = used.get(key) ?? new Set<string>();
    semesters.add(scope.semesterId);
    used.set(key, semesters);
  }
  return used;
}

export function availableReviewCourses(
  catalog: ReviewCatalog,
  scopes: ReviewScope[],
  semesterId = "",
): ReviewCourseOption[] {
  if (!catalog.semesters.length) return [];
  const used = usedSemesters(catalog, scopes);
  return catalog.courses.filter((course) =>
    semesterId
      ? !used.get(course.id)?.has(semesterId)
      : (used.get(course.id)?.size ?? 0) < catalog.semesters.length,
  );
}

export function availableReviewSemesters(
  catalog: ReviewCatalog,
  scopes: ReviewScope[],
  needsCourse: boolean,
  courseId = "",
): ReviewSemesterOption[] {
  if (needsCourse && !courseId) return catalog.semesters;
  const used = usedSemesters(catalog, scopes).get(needsCourse ? courseId : "");
  return catalog.semesters.filter((semester) => !used?.has(semester.id));
}

export function hasAvailableReviewContext(
  catalog: ReviewCatalog,
  scopes: ReviewScope[],
  needsCourse: boolean,
): boolean {
  if (catalog.failed) return false;
  return needsCourse
    ? availableReviewCourses(catalog, scopes).length > 0
    : availableReviewSemesters(catalog, scopes, false).length > 0;
}

export function reviewCourseLabel(course: ReviewCourseOption): string {
  return course.code ? `${course.code} · ${course.title}` : course.title;
}

export function reviewProfileHref(review: { personSlug: string; courseId: string | null; semesterId: string | null }) {
  const params = new URLSearchParams();
  if (review.courseId) params.set("course", review.courseId);
  if (review.semesterId) params.set("semester", review.semesterId);
  return `/people/${review.personSlug}${params.size ? `?${params.toString()}` : ""}`;
}
