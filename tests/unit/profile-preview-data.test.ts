// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  criteria: vi.fn(),
  limits: vi.fn(),
  mine: vi.fn(),
  catalog: vi.fn(),
  scopes: vi.fn(),
  enabled: vi.fn(),
  profile: vi.fn(),
}));
vi.mock("@/features/auth/session", () => ({ getCurrentUser: mocks.session }));
vi.mock("@/features/feature-flags/queries", () => ({
  isFeatureEnabled: mocks.enabled,
}));
vi.mock("@/features/reviews/queries", () => ({
  getReviewCriteria: mocks.criteria,
  getReviewLimits: mocks.limits,
  getMyReviewForPerson: mocks.mine,
  getPersonReviewCatalog: mocks.catalog,
  getMyReviewScopes: mocks.scopes,
}));
vi.mock("@/features/people/profile-data", () => ({
  getPersonProfileData: mocks.profile,
}));

import { getReviewPanelData } from "@/features/reviews/review-panel-data";
import { loadPublicProfile } from "@/features/people/profile-preview-action";
import type { PersonSummary } from "@/features/people/types";

const person = { id: "person-1", primaryCategory: "teacher" } as PersonSummary;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.criteria.mockResolvedValue([]);
  mocks.limits.mockResolvedValue({ maxEdits: 2 });
  mocks.mine.mockResolvedValue(null);
  mocks.catalog.mockResolvedValue({
    courses: [],
    semesters: [],
    failed: false,
  });
  mocks.scopes.mockResolvedValue([]);
  mocks.enabled.mockResolvedValue(true);
});

it("returns only a sign-in gate for an anonymous preview, without reading private review data", async () => {
  mocks.session.mockResolvedValue(null);
  expect(await getReviewPanelData(person)).toEqual({ status: "signed-out" });
  expect(mocks.mine).not.toHaveBeenCalled();
  expect(mocks.scopes).not.toHaveBeenCalled();
});

it.each([
  [
    { isVerified: false, profile: { is_active: true, role: "student" } },
    "unverified",
  ],
  [
    { isVerified: true, profile: { is_active: false, role: "student" } },
    "inactive",
  ],
  [{ isVerified: true, profile: { is_active: true, role: "admin" } }, "admin"],
])("preserves the server-side account gate: %s", async (session, status) => {
  mocks.session.mockResolvedValue(session);
  expect(await getReviewPanelData(person)).toEqual({ status });
  expect(mocks.mine).not.toHaveBeenCalled();
});

it("returns the student's current-person scopes without their account identity or other profile scopes", async () => {
  mocks.session.mockResolvedValue({
    isVerified: true,
    user: { id: "private-user", email: "private@example.com" },
    profile: {
      is_active: true,
      role: "student",
      student_id: "private-student",
    },
  });
  const current = {
    personId: "person-1",
    courseId: "course-1",
    semesterId: "semester-1",
  };
  mocks.scopes.mockResolvedValue([
    current,
    { ...current, personId: "other-person" },
  ]);
  const data = await getReviewPanelData(person);
  expect(data.status).toBe("ready");
  if (data.status !== "ready") throw new Error("Expected review capabilities");
  expect(data.scopes).toEqual([current]);
  expect(JSON.stringify(data)).not.toMatch(
    /private-user|private@example|private-student|other-person/,
  );
  expect(mocks.mine).toHaveBeenCalledWith("person-1");
});

it("returns plain profile data rather than route-specific React component references", async () => {
  const data = {
    person: { id: "person-1", name: "Ahmed" },
    reviewPanel: { status: "signed-out" },
  };
  mocks.profile.mockResolvedValue(data);
  const result = await loadPublicProfile("ahmed", { page: "2" });
  expect(result).toEqual(JSON.parse(JSON.stringify(data)));
  expect(mocks.profile).toHaveBeenCalledWith("ahmed", { page: "2" });
});

it("rejects unavailable profiles and invalid slugs without exposing internal errors", async () => {
  await expect(loadPublicProfile("../../admin")).rejects.toThrow(
    "not available",
  );
  expect(mocks.profile).not.toHaveBeenCalled();
  mocks.profile.mockResolvedValue(null);
  await expect(loadPublicProfile("missing-person")).rejects.toThrow(
    "not available",
  );
});
