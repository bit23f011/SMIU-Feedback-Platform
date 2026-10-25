import { getCurrentUser } from "@/features/auth/session";
import {
  getMyFavoriteIds,
  getPersonCourseRatings,
  getPersonSemesterRatings,
} from "@/features/discovery/queries";
import {
  parseId,
  parsePage,
  type CourseRating,
  type SemesterRating,
} from "@/features/discovery/types";
import { getPersonBySlug } from "@/features/people/queries";
import type { PersonSummary } from "@/features/people/types";
import {
  getReviewPanelData,
  type ReviewPanelData,
} from "@/features/reviews/review-panel-data";
import {
  getFeaturedPersonReviews,
  getPersonCriteriaStats,
  getPersonRatingStats,
  getPersonReviews,
} from "@/features/reviews/queries";
import type {
  PersonCriterionStat,
  PersonRatingStats,
  PublicReview,
  PublicReviewPage,
} from "@/features/reviews/types";

export type ProfileContext = {
  page?: string;
  course?: string;
  semester?: string;
};
export interface PersonProfileData {
  person: PersonSummary;
  page: number;
  context: ProfileContext;
  stats: PersonRatingStats;
  criteriaStats: PersonCriterionStat[];
  featured: PublicReview[];
  reviewPage: PublicReviewPage;
  courses: CourseRating[];
  semesters: SemesterRating[];
  canSave: boolean;
  saved: boolean;
  reviewPanel: ReviewPanelData;
}

/** Shared reads for the public page and popup. All authorization remains server-side. */
export async function getPersonProfileData(
  slug: string,
  context: ProfileContext = {},
): Promise<PersonProfileData | null> {
  const person = await getPersonBySlug(slug, false);
  if (!person) return null;
  const page = parsePage(context.page);
  const [
    stats,
    criteriaStats,
    featured,
    reviewPage,
    courses,
    semesters,
    reviewPanel,
    session,
  ] = await Promise.all([
    getPersonRatingStats(person.id),
    getPersonCriteriaStats(person.id),
    getFeaturedPersonReviews(person.id),
    getPersonReviews(person.id, { page }),
    getPersonCourseRatings(person.id),
    getPersonSemesterRatings(person.id),
    getReviewPanelData(person),
    getCurrentUser(),
  ]);
  const canSave = Boolean(session?.isVerified && session.profile?.is_active);
  const savedIds = canSave ? await getMyFavoriteIds() : new Set<string>();
  return {
    person: {
      ...person,
      rating: stats.reviewCount > 0 ? stats.averageRating : null,
      reviewCount: stats.reviewCount > 0 ? stats.reviewCount : null,
    },
    page,
    context: {
      course: parseId(context.course) ?? undefined,
      semester: parseId(context.semester) ?? undefined,
    },
    stats,
    criteriaStats,
    featured,
    reviewPage,
    courses,
    semesters,
    reviewPanel,
    canSave,
    saved: savedIds.has(person.id),
  };
}
