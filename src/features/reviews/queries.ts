import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PersonCategory } from "@/features/people/types";
import {
  EMPTY_RATING_STATS,
  FALLBACK_REVIEW_LIMITS,
  FEATURED_REVIEWS_LIMIT,
  REVIEWS_PER_PAGE,
  type MyReview,
  type MyReviewDetail,
  type PersonCriterionStat,
  type PersonRatingStats,
  type PublicReview,
  type PublicReviewPage,
  type ReviewAnswer,
  type ReviewCriterion,
  type ReviewCriterionKind,
  type ReviewLimits,
  type ReviewOption,
  type ReviewScope,
} from "@/features/reviews/types";

/*
  Reviews ke server-side reads.

  SECURITY:
  - Sirf anon-key client - har read RLS se guzarti hai.
  - `reviews` me author column hai hi nahi, is liye public list se identity leak
    ho hi nahi sakti.
  - "Meri reviews" ke liye hum `auth.uid()` client se NAHI bhejte; DB function
    khud apne andar auth.uid() parhta hai.
  - Koi error detail UI tak nahi jati aur koi logging nahi hoti.
*/

// -----------------------------------------------------------------------------
// Reference: sawal aur limits
// -----------------------------------------------------------------------------

export const getReviewCriteria = cache(
  async (category: PersonCategory): Promise<ReviewCriterion[]> => {
    try {
      const supabase = createSupabaseServerClient();

      const { data, error } = await supabase
        .from("review_criteria")
        .select("id, key, label, help_text, kind, sort_order")
        .eq("category", category)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error || !data) return [];

      return data.map((row) => ({
        id: row.id,
        key: row.key,
        label: row.label,
        helpText: row.help_text,
        kind: row.kind,
        sortOrder: row.sort_order,
      }));
    } catch {
      return [];
    }
  },
);

export const getReviewLimits = cache(async (): Promise<ReviewLimits> => {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("review_limits");

    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) return FALLBACK_REVIEW_LIMITS;

    return { maxPerDay: row.max_per_day, maxEdits: row.max_edits };
  } catch {
    return FALLBACK_REVIEW_LIMITS;
  }
});

// -----------------------------------------------------------------------------
// Person ke aggregates
// -----------------------------------------------------------------------------

export async function getPersonRatingStats(personId: string): Promise<PersonRatingStats> {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("person_rating_stats")
      .select(
        "review_count, average_rating, count_1, count_2, count_3, count_4, count_5, count_6, count_7, count_8, count_9, count_10",
      )
      .eq("person_id", personId)
      .maybeSingle();

    if (error || !data) return EMPTY_RATING_STATS;

    return {
      reviewCount: data.review_count ?? 0,
      // average_rating numeric hai - PostgREST isay string bhi de sakta hai.
      averageRating: data.average_rating === null ? null : Number(data.average_rating),
      distribution: {
        1: data.count_1 ?? 0,
        2: data.count_2 ?? 0,
        3: data.count_3 ?? 0,
        4: data.count_4 ?? 0,
        5: data.count_5 ?? 0,
        6: data.count_6 ?? 0,
        7: data.count_7 ?? 0,
        8: data.count_8 ?? 0,
        9: data.count_9 ?? 0,
        10: data.count_10 ?? 0,
      },
    };
  } catch {
    return EMPTY_RATING_STATS;
  }
}

/**
 * Directory cards ke liye ek hi query me kai logon ke stats.
 * Jis person ka koi published review nahi, wo map me hota hi nahi - card
 * "Not rated yet" dikhata hai, 0 nahi.
 */
export async function getRatingStatsForPeople(
  personIds: string[],
): Promise<Map<string, PersonRatingStats>> {
  const result = new Map<string, PersonRatingStats>();
  if (personIds.length === 0) return result;

  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("person_rating_stats")
      .select(
        "person_id, review_count, average_rating, count_1, count_2, count_3, count_4, count_5, count_6, count_7, count_8, count_9, count_10",
      )
      .in("person_id", personIds);

    if (error || !data) return result;

    for (const row of data) {
      if (!row.person_id) continue;
      result.set(row.person_id, {
        reviewCount: row.review_count ?? 0,
        averageRating: row.average_rating === null ? null : Number(row.average_rating),
        distribution: {
          1: row.count_1 ?? 0,
          2: row.count_2 ?? 0,
          3: row.count_3 ?? 0,
          4: row.count_4 ?? 0,
          5: row.count_5 ?? 0,
          6: row.count_6 ?? 0,
          7: row.count_7 ?? 0,
          8: row.count_8 ?? 0,
          9: row.count_9 ?? 0,
          10: row.count_10 ?? 0,
        },
      });
    }

    return result;
  } catch {
    return result;
  }
}

export async function getPersonCriteriaStats(personId: string): Promise<PersonCriterionStat[]> {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("person_criteria_stats")
      .select(
        "criterion_id, key, label, kind, sort_order, average_star, star_responses, yes_count, bool_responses",
      )
      .eq("person_id", personId)
      .order("sort_order", { ascending: true });

    if (error || !data) return [];

    return data
      .filter((row) => row.criterion_id && row.key && row.label && row.kind)
      .map((row) => ({
        criterionId: row.criterion_id as string,
        key: row.key as string,
        label: row.label as string,
        kind: row.kind as PersonCriterionStat["kind"],
        sortOrder: row.sort_order ?? 0,
        averageStar: row.average_star === null ? null : Number(row.average_star),
        starResponses: row.star_responses ?? 0,
        yesCount: row.yes_count ?? 0,
        boolResponses: row.bool_responses ?? 0,
      }));
  } catch {
    return [];
  }
}

// -----------------------------------------------------------------------------
// Public review list
// -----------------------------------------------------------------------------

/*
  YEH AB SEEDHA TABLE SE NAHI PARHTA.

  `reviews.comment` par anon/authenticated ka column-level select hai hi nahi,
  is liye PostgREST se text mil hi nahi sakta. Text ka waahid raasta
  `person_reviews()` function hai, jo comment sirf approved hone par deta hai
  (README §22) aur ek page ki had khud lagata hai (README §23).
*/

type RawAnswer = {
  key?: unknown;
  label?: unknown;
  kind?: unknown;
  star?: unknown;
  yes?: unknown;
};

/** Function se aaya jsonb - usay bharosay ke qabil shape me badlo. */
function toAnswers(value: unknown): ReviewAnswer[] {
  if (!Array.isArray(value)) return [];

  return (value as RawAnswer[])
    .filter(
      (answer): answer is RawAnswer & { key: string; label: string; kind: ReviewCriterionKind } =>
        typeof answer?.key === "string" &&
        typeof answer?.label === "string" &&
        (answer?.kind === "star" || answer?.kind === "yes_no"),
    )
    .map((answer) => ({
      key: answer.key,
      label: answer.label,
      kind: answer.kind,
      star: typeof answer.star === "number" ? answer.star : null,
      yes: typeof answer.yes === "boolean" ? answer.yes : null,
    }));
}

export async function getPersonReviews(
  personId: string,
  options: {
    page?: number;
    perPage?: number;
    featuredOnly?: boolean;
    oldestFirst?: boolean;
    courseId?: string | null;
    semesterId?: string | null;
  } = {},
): Promise<PublicReviewPage> {
  const empty: PublicReviewPage = { reviews: [], total: 0 };

  try {
    const supabase = createSupabaseServerClient();

    const perPage = options.perPage ?? REVIEWS_PER_PAGE;
    // Page number kabhi bhi URL se aata hai, is liye yahan sanitise karna zaroori
    // hai. DB bhi apni taraf se limit clamp karti hai.
    const page = Number.isFinite(options.page) && (options.page ?? 1) > 0 ? Math.floor(options.page!) : 1;

    const { data, error } = await supabase.rpc("person_reviews", {
      p_person_id: personId,
      p_limit: perPage,
      p_offset: (page - 1) * perPage,
      p_featured_only: options.featuredOnly ?? false,
      p_oldest_first: options.oldestFirst ?? false,
      p_course_id: options.courseId ?? null,
      p_semester_id: options.semesterId ?? null,
    });

    if (error || !data || data.length === 0) return empty;

    return {
      total: Number(data[0].total_count ?? 0),
      reviews: data.map((row) => ({
        id: row.review_id,
        overallRating: row.overall_rating,
        comment: row.comment,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        wasEdited: row.was_edited,
        isFeatured: row.is_featured,
        courseCode: row.course_code,
        courseTitle: row.course_title,
        semesterLabel: row.semester_label,
        answers: toAnswers(row.answers),
      })),
    };
  } catch {
    return empty;
  }
}

/** Profile page ke upar wali chuni hui reviews (README §24). */
export async function getFeaturedPersonReviews(personId: string): Promise<PublicReview[]> {
  const page = await getPersonReviews(personId, {
    perPage: FEATURED_REVIEWS_LIMIT,
    featuredOnly: true,
  });
  return page.reviews;
}

// -----------------------------------------------------------------------------
// "Meri" reviews - sirf signed-in student ke liye
// -----------------------------------------------------------------------------

export const getMyReviews = cache(async (): Promise<MyReview[]> => {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("my_reviews");

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.review_id,
      personId: row.person_id,
      personSlug: row.person_slug,
      personName: row.person_name,
      category: row.category,
      overallRating: row.overall_rating,
      comment: row.comment,
      status: row.status,
      moderationStatus: row.moderation_status,
      editCount: row.edit_count,
      editsLeft: row.edits_left,
      courseId: row.course_id,
      courseCode: row.course_code,
      courseTitle: row.course_title,
      semesterId: row.semester_id,
      semesterLabel: row.semester_label,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    return [];
  }
});

/*
  Review form ke liye jaiz course + semester jorey (README §25).

  Yeh sirf UI ko sahi options dikhane ke liye hai. Asli faisla `submit_review`
  karta hai: wo dobara check karta hai ke jorha is banday se mel khata hai.
  Is liye koi DevTools se `<option>` badal de to bhi kuch nahi milta.
*/
export async function getPersonReviewOptions(personId: string): Promise<ReviewOption[]> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("person_review_options", {
      p_person_id: personId,
    });

    if (error || !data) return [];

    return data
      .filter((row) => Boolean(row.semester_id))
      .map((row) => ({
        courseId: row.course_id,
        courseCode: row.course_code,
        courseTitle: row.course_title,
        semesterId: row.semester_id,
        semesterLabel: row.semester_label,
        isAssigned: row.is_assigned,
      }));
  } catch {
    return [];
  }
}

/*
  Kis person + course + semester par meri review pehle se hai.

  my_reviewed_person_ids ab kaafi nahi: ek hi teacher par alag courses me kai
  reviews ho sakti hain, is liye sirf person id dekh kar "already reviewed"
  kehna ghalat hoga.
*/
export const getMyReviewScopes = cache(async (): Promise<ReviewScope[]> => {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("my_review_scopes");

    if (error || !data) return [];

    return data.map((row) => ({
      personId: row.person_id,
      courseId: row.course_id,
      semesterId: row.semester_id,
    }));
  } catch {
    return [];
  }
});

/*
  NOTE: yahan pehle `getMyReviewedPersonIds` thi (sirf person id ki list).
  README §25 ke baad wo galat jawab deti hai - ek hi banday par alag course ya
  semester me dobara review ho sakti hai, is liye sirf person id dekh kar
  "already reviewed" kehna ghalat hoga. Uski jagah upar wali
  `getMyReviewScopes()` hai. DB ka purana function abhi mojood hai magar app
  usay istemal nahi karti.
*/

/**
 * Ek person par MERI review + uske jawab (edit form pre-fill ke liye).
 *
 * Yeh bhi ab function se aati hai. `reviews.comment` par table-level select
 * grant nahi bacha, is liye apna likha hua text bhi PostgREST se nahi milta.
 * `my_review_for_person()` andar `auth.uid()` parhta hai, is liye kisi doosre
 * ki review mangna mumkin hi nahi - person id badalne se bhi kuch nahi hota.
 *
 * NOTE: apna text hamesha dikhta hai, moderation ki halat chahe koi bhi ho.
 * Rukta sirf public par hai.
 *
 * scope diya jaye to us course+semester wali review milti hai, warna is banday
 * par meri SAB SE NAI review. Profile page khulte waqt course chuna hi nahi
 * gaya hota, is liye default "sab se nai" hai.
 */
export async function getMyReviewForPerson(
  personId: string,
  scope: { courseId?: string | null; semesterId?: string | null } = {},
): Promise<MyReviewDetail | null> {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.rpc("my_review_for_person", {
      p_person_id: personId,
      p_course_id: scope.courseId ?? null,
      p_semester_id: scope.semesterId ?? null,
    });

    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) return null;

    /*
      answers ek jsonb OBJECT hai: { "course_knowledge": { star: 4, yes: null } }.
      Form isay key se parhta hai, is liye shape yahin per verify kar lete hain -
      jo cheez pehchani na jaye, chhor do (form us sawal ko khaali dikha dega).
    */
    const answers: MyReviewDetail["answers"] = {};
    if (row.answers && typeof row.answers === "object" && !Array.isArray(row.answers)) {
      for (const [key, value] of Object.entries(row.answers as Record<string, unknown>)) {
        if (!value || typeof value !== "object") continue;
        const entry = value as { star?: unknown; yes?: unknown };
        answers[key] = {
          star: typeof entry.star === "number" ? entry.star : null,
          yes: typeof entry.yes === "boolean" ? entry.yes : null,
        };
      }
    }

    return {
      id: row.review_id,
      personId: row.person_id,
      personSlug: row.person_slug,
      personName: row.person_name,
      category: row.category,
      overallRating: row.overall_rating,
      comment: row.comment,
      status: row.status,
      moderationStatus: row.moderation_status,
      editCount: row.edit_count,
      editsLeft: row.edits_left,
      courseId: row.course_id,
      courseCode: row.course_code,
      courseTitle: row.course_title,
      semesterId: row.semester_id,
      semesterLabel: row.semester_label,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      answers,
    };
  } catch {
    return null;
  }
}
