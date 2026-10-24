import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ session: vi.fn(), catalog: vi.fn() }));
vi.mock("@/features/auth/session", () => ({ getCurrentUser: mocks.session }));
vi.mock("@/features/feature-flags/queries", () => ({
  isFeatureEnabled: async () => true,
}));
vi.mock("@/features/reviews/queries", () => ({
  getMyReviewForPerson: async () => null,
  getMyReviewScopes: async () => [],
  getPersonReviewCatalog: mocks.catalog,
  getReviewCriteria: async () => [
    {
      id: "criterion",
      key: "helpfulness",
      label: "Helpful?",
      kind: "star",
      sortOrder: 1,
      helpText: null,
    },
  ],
  getReviewLimits: async () => ({ maxPerDay: 10, maxEdits: 2 }),
}));
vi.mock("@/features/reviews/my-review-card", () => ({
  MyReviewCard: () => null,
}));
vi.mock("@/features/reviews/review-form", () => ({
  ReviewForm: () => "Student review form",
}));

import { ReviewPanel } from "@/features/reviews/review-panel";
import type { PersonSummary } from "@/features/people/types";

const person: PersonSummary = {
  id: "person-id",
  slug: "teacher-a",
  name: "Teacher A",
  gender: null,
  photoUrl: null,
  headline: null,
  primaryCategory: "teacher",
  teacherType: "external",
  roles: [],
  rating: null,
  reviewCount: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({
    isVerified: true,
    profile: { role: "student", is_active: true },
  });
  mocks.catalog.mockResolvedValue({
    courses: [{ id: "course-id", title: "AI", code: null }],
    semesters: [{ id: "semester-id", label: "Spring 2024" }],
    failed: false,
  });
});

it("replaces the review form with a clear student-account gate for an admin", async () => {
  mocks.session.mockResolvedValue({
    isVerified: true,
    profile: { role: "admin", is_active: true },
  });
  const html = renderToStaticMarkup(await ReviewPanel({ person }));
  expect(html).toContain("Use a student account to review");
  expect(html).toContain('href="/admin"');
  expect(html).not.toContain("Student review form");
  expect(mocks.catalog).not.toHaveBeenCalled();
});

it("keeps the review form available to an active student", async () => {
  expect(renderToStaticMarkup(await ReviewPanel({ person }))).toContain(
    "Student review form",
  );
  expect(mocks.catalog).toHaveBeenCalledWith(person.id);
});

it("preserves selected course and semester through the sign-in link", async () => {
  mocks.session.mockResolvedValue(null);
  const html = renderToStaticMarkup(
    await ReviewPanel({
      person,
      initialCourseId: "course-id",
      initialSemesterId: "semester-id",
    }),
  );
  expect(html).toContain(
    encodeURIComponent(
      "/people/teacher-a?course=course-id&semester=semester-id#write-review",
    ),
  );
  expect(html).not.toContain("Student review form");
});
