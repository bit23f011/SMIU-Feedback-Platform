import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getCurrentUser: vi.fn(),
  isFeatureEnabled: vi.fn(),
  getReviewCriteria: vi.fn(),
  log: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server/diagnostics", () => ({ logBackendError: mocks.log }));
vi.mock("@/features/auth/session", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/features/feature-flags/queries", () => ({
  isFeatureEnabled: mocks.isFeatureEnabled,
}));
vi.mock("@/features/reviews/queries", () => ({
  getReviewCriteria: mocks.getReviewCriteria,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => {
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({
        data: { slug: "test-teacher", primary_category: "teacher" },
        error: null,
      }),
    };
    return { from: () => query, rpc: mocks.rpc };
  },
}));

import {
  submitReviewAction,
  updateReviewAction,
} from "@/features/reviews/actions";
import { EMPTY_REVIEW_STATE } from "@/features/reviews/form-state";

function reviewForm() {
  const form = new FormData();
  form.set("personId", "10000000-0000-0000-0000-000000000001");
  form.set("reviewId", "20000000-0000-0000-0000-000000000001");
  form.set("courseId", "30000000-0000-0000-0000-000000000001");
  form.set("semesterId", "40000000-0000-0000-0000-000000000001");
  form.set("overall", "8");
  form.set("c_helpfulness", "4");
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({
    isVerified: true,
    profile: { role: "student", is_active: true },
  });
  mocks.isFeatureEnabled.mockResolvedValue(true);
  mocks.getReviewCriteria.mockResolvedValue([
    { key: "helpfulness", kind: "star" },
  ]);
  mocks.rpc.mockResolvedValue({ error: null });
});

describe("review submission failures", () => {
  it("gives admins a student-account message before calling the write RPC", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      isVerified: true,
      profile: { role: "admin", is_active: true },
    });
    expect(
      (await submitReviewAction(EMPTY_REVIEW_STATE, reviewForm())).formError,
    ).toContain("student account");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("keeps inactive accounts out of the write RPC", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      isVerified: true,
      profile: { role: "student", is_active: false },
    });
    expect(
      (await submitReviewAction(EMPTY_REVIEW_STATE, reviewForm())).formError,
    ).toContain("cannot post reviews");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("reports the actual pause and does not call the write RPC", async () => {
    mocks.isFeatureEnabled.mockResolvedValue(false);
    const state = await submitReviewAction(EMPTY_REVIEW_STATE, reviewForm());
    expect(state.formError).toBe(
      "New reviews are paused right now. Please try again later.",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("still handles a pause introduced after the form was opened", async () => {
    mocks.rpc.mockResolvedValue({
      error: {
        code: "23514",
        message: "New reviews are paused right now. Please try again later.",
      },
    });
    expect(
      (await submitReviewAction(EMPTY_REVIEW_STATE, reviewForm())).formError,
    ).toContain("New reviews are paused");
  });

  it("shows a course mismatch instead of the generic save error", async () => {
    mocks.rpc.mockResolvedValue({
      error: {
        code: "23514",
        message: "That course does not match this profile.",
      },
    });
    expect(
      (await submitReviewAction(EMPTY_REVIEW_STATE, reviewForm())).formError,
    ).toBe("That course does not match this profile.");
  });

  it("logs unexpected backend failures without exposing their raw message", async () => {
    const error = {
      code: "PGRST202",
      message: "Internal schema detail and private value",
    };
    mocks.rpc.mockResolvedValue({ error });
    const state = await submitReviewAction(EMPTY_REVIEW_STATE, reviewForm());
    expect(state.formError).toBe(
      "We could not save your review right now. Please try again.",
    );
    expect(state.formError).not.toContain(error.message);
    expect(mocks.log).toHaveBeenCalledWith("reviews.submit", error);
  });

  it("keeps incomplete review answers from reaching the backend", async () => {
    const form = reviewForm();
    form.delete("c_helpfulness");
    expect(
      (await submitReviewAction(EMPTY_REVIEW_STATE, form)).fieldErrors
        ?.c_helpfulness,
    ).toBeDefined();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("allows a complete review through the final six-argument RPC", async () => {
    expect(
      (await submitReviewAction(EMPTY_REVIEW_STATE, reviewForm())).ok,
    ).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("submit_review", {
      p_person_id: "10000000-0000-0000-0000-000000000001",
      p_overall: 8,
      p_comment: null,
      p_answers: [{ key: "helpfulness", star: 4 }],
      p_course_id: "30000000-0000-0000-0000-000000000001",
      p_semester_id: "40000000-0000-0000-0000-000000000001",
    });
  });

  it("reports paused editing correctly too", async () => {
    mocks.rpc.mockResolvedValue({
      error: {
        code: "23514",
        message: "Review editing is paused right now. Please try again later.",
      },
    });
    expect(
      (await updateReviewAction(EMPTY_REVIEW_STATE, reviewForm())).formError,
    ).toContain("Review editing is paused");
  });
});
