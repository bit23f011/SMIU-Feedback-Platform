import { getCurrentUser } from "@/features/auth/session";
import { isFeatureEnabled } from "@/features/feature-flags/queries";
import type { PersonSummary } from "@/features/people/types";
import {
  getMyReviewForPerson,
  getMyReviewScopes,
  getPersonReviewCatalog,
  getReviewCriteria,
  getReviewLimits,
} from "@/features/reviews/queries";
import type {
  MyReviewDetail,
  ReviewCatalog,
  ReviewCriterion,
  ReviewLimits,
  ReviewScope,
} from "@/features/reviews/types";

export type ReviewPanelData =
  | {
      status:
        "signed-out" | "unverified" | "inactive" | "admin" | "no-category";
    }
  | {
      status: "ready";
      criteria: ReviewCriterion[];
      limits: ReviewLimits;
      mine: MyReviewDetail | null;
      catalog: ReviewCatalog;
      scopes: ReviewScope[];
      submissionEnabled: boolean;
    };

/** Only return UI capabilities and this student's own review data, never their identity. */
export async function getReviewPanelData(
  person: PersonSummary,
): Promise<ReviewPanelData> {
  const session = await getCurrentUser();
  if (!session) return { status: "signed-out" };
  if (!session.isVerified) return { status: "unverified" };
  if (!session.profile?.is_active) return { status: "inactive" };
  if (session.profile.role !== "student") return { status: "admin" };
  if (!person.primaryCategory) return { status: "no-category" };

  const [criteria, limits, mine, catalog, scopes, submissionEnabled] =
    await Promise.all([
      getReviewCriteria(person.primaryCategory),
      getReviewLimits(),
      getMyReviewForPerson(person.id),
      getPersonReviewCatalog(person.id),
      getMyReviewScopes(),
      isFeatureEnabled("review_submission"),
    ]);
  return {
    status: "ready",
    criteria,
    limits,
    mine,
    catalog,
    scopes: scopes.filter((scope) => scope.personId === person.id),
    submissionEnabled,
  };
}
