import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RANKING } from "@/lib/constants";
import type {
  PersonCategory,
  PersonGender,
  PersonRoleSummary,
  PersonSummary,
  TeacherType,
} from "@/features/people/types";
import type { ReviewCriterionKind } from "@/features/reviews/types";
import {
  COURSE_TEACHERS_PER_PAGE,
  COURSES_PER_PAGE,
  EMPTY_FILTER_OPTIONS,
  FAVORITES_PER_PAGE,
  PEOPLE_PER_PAGE,
  RECENTLY_VIEWED_LIMIT,
  type ComparisonPerson,
  type CoursePage,
  type CourseRating,
  type CourseSummary,
  type CourseTeacher,
  type CourseTeacherPage,
  type CriterionAggregate,
  type DirectoryFilters,
  type FilterOptions,
  type PeoplePage,
  type RankedPerson,
  type RankingScope,
  type Recommendation,
  type RecommendationInput,
  type RecommendationStrength,
  type SavedPerson,
  type SemesterRating,
  type TrendingPerson,
  type ViewedPerson,
} from "@/features/discovery/types";

/*
  Phase 4 ke server-side reads.

  SECURITY:
  - Sirf anon-key server client. Service role yahan kabhi nahi aata.
  - Har list ek DB function se aati hai jo SECURITY INVOKER hai, yani RLS wahi
    rehti hai jo caller ki hai. Hum ne policy dobara nahi likhi.
  - Filter aur sort values client se aati hain magar DB me allow-list se guzarti
    hain. Yahan bhi pehle parse hoti hain, magar wo sirf soolat ke liye hai.
  - "Meri saved list" ke liye hum auth.uid() kabhi client se nahi bhejte: RLS
    khud faisla karti hai ke kis ki rows hain.
  - Error detail kabhi UI tak nahi jati. Fail hone par khali natija aur
    `failed: true`, taake UI sach bole aur koi SQL/table naam leak na ho.
*/

// -----------------------------------------------------------------------------
// Row -> PersonSummary
// -----------------------------------------------------------------------------

/*
  Saari Phase 4 functions ek jaisa person block deti hain. Ek hi mapper rakha hai
  taake har jagah "0 reviews" aur "rating null" ka matlab ek jaisa rahe:
  rating null = abhi koi review nahi, 0 kabhi placeholder nahi.
*/
interface PersonRowLike {
  person_id: string;
  slug: string;
  full_name: string;
  display_name: string | null;
  gender: PersonGender | null;
  photo_url: string | null;
  headline: string | null;
  role_title: string | null;
  department_short: string | null;
  average_rating: number | null;
  review_count: number | null;
  primary_category?: PersonCategory | null;
  category?: PersonCategory | null;
  teacher_type?: TeacherType | null;
  department_name?: string | null;
}

function toPerson(row: PersonRowLike, fallbackCategory: PersonCategory | null): PersonSummary {
  const category = row.category ?? fallbackCategory ?? row.primary_category ?? null;

  const roles: PersonRoleSummary[] = category
    ? [
        {
          category,
          title: row.role_title,
          department: row.department_short ?? row.department_name ?? null,
          isPrimary: true,
        },
      ]
    : [];

  const reviewCount = row.review_count ?? 0;
  const average = row.average_rating === null ? null : Number(row.average_rating);

  return {
    id: row.person_id,
    slug: row.slug,
    name: row.display_name ?? row.full_name,
    gender: row.gender,
    photoUrl: row.photo_url,
    headline: row.headline,
    primaryCategory: row.primary_category ?? category,
    teacherType: row.teacher_type ?? null,
    roles,
    rating: reviewCount > 0 ? average : null,
    reviewCount: reviewCount > 0 ? reviewCount : null,
  };
}

/** Function se aaya criteria jsonb. Jo entry pehchani na jaye, chhor do. */
function toCriteria(value: unknown): CriterionAggregate[] {
  if (!Array.isArray(value)) return [];

  return (value as Record<string, unknown>[])
    .filter(
      (item) =>
        typeof item?.key === "string" &&
        typeof item?.label === "string" &&
        (item?.kind === "star" || item?.kind === "yes_no"),
    )
    .map((item) => ({
      key: item.key as string,
      label: item.label as string,
      kind: item.kind as ReviewCriterionKind,
      averageStar: item.averageStar === null || item.averageStar === undefined
        ? null
        : Number(item.averageStar),
      starResponses: typeof item.starResponses === "number" ? item.starResponses : 0,
      yesCount: typeof item.yesCount === "number" ? item.yesCount : 0,
      boolResponses: typeof item.boolResponses === "number" ? item.boolResponses : 0,
    }));
}

function toStrengths(value: unknown): RecommendationStrength[] {
  if (!Array.isArray(value)) return [];

  return (value as Record<string, unknown>[])
    .filter((item) => typeof item?.key === "string" && typeof item?.label === "string")
    .map((item) => ({
      key: item.key as string,
      label: item.label as string,
      averageStar: item.averageStar === null || item.averageStar === undefined
        ? null
        : Number(item.averageStar),
    }));
}

// -----------------------------------------------------------------------------
// Search + filters (README §34, §35)
// -----------------------------------------------------------------------------

export async function searchPeople(options: {
  category: PersonCategory;
  filters: DirectoryFilters;
  perPage?: number;
}): Promise<PeoplePage> {
  const { category, filters } = options;
  const perPage = options.perPage ?? PEOPLE_PER_PAGE;
  const empty: PeoplePage = { people: [], total: 0, failed: false };

  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.rpc("directory_people", {
      p_category: category,
      p_search: filters.search || null,
      p_department_id: filters.departmentId,
      p_course_id: filters.courseId,
      p_semester_id: filters.semesterId,
      p_min_rating: filters.minRating,
      p_teacher_type: filters.teacherType,
      p_sort: filters.sort,
      p_limit: perPage,
      p_offset: (filters.page - 1) * perPage,
    });

    if (error) return { people: [], total: 0, failed: true };
    if (!data || data.length === 0) return empty;

    return {
      total: Number(data[0].total_count ?? 0),
      people: data.map((row) => toPerson(row, category)),
      failed: false,
    };
  } catch {
    return { people: [], total: 0, failed: true };
  }
}

export async function searchCourses(options: {
  search?: string;
  departmentId?: string | null;
  semesterId?: string | null;
  page?: number;
  perPage?: number;
}): Promise<CoursePage> {
  const perPage = options.perPage ?? COURSES_PER_PAGE;
  const page = options.page && options.page > 0 ? options.page : 1;

  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.rpc("directory_courses", {
      p_search: options.search?.trim() || null,
      p_department_id: options.departmentId ?? null,
      p_semester_id: options.semesterId ?? null,
      p_limit: perPage,
      p_offset: (page - 1) * perPage,
    });

    if (error) return { courses: [], total: 0, failed: true };
    if (!data || data.length === 0) return { courses: [], total: 0, failed: false };

    return {
      total: Number(data[0].total_count ?? 0),
      courses: data.map((row) => ({
        id: row.course_id,
        slug: row.slug,
        code: row.code,
        title: row.title,
        creditHours: row.credit_hours === null ? null : Number(row.credit_hours),
        departmentName: row.department_name,
        departmentShort: row.department_short,
        teacherCount: row.teacher_count ?? 0,
      })),
      failed: false,
    };
  } catch {
    return { courses: [], total: 0, failed: true };
  }
}

export async function getCourseBySlug(slug: string): Promise<CourseSummary | null> {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("courses")
      .select("id, slug, code, title, credit_hours, departments ( name, short_name )")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) return null;

    const department = data.departments as unknown as
      | { name: string; short_name: string | null }
      | null;

    return {
      id: data.id,
      slug: data.slug,
      code: data.code,
      title: data.title,
      creditHours: data.credit_hours === null ? null : Number(data.credit_hours),
      departmentName: department?.name ?? null,
      departmentShort: department?.short_name ?? null,
      teacherCount: 0,
    };
  } catch {
    return null;
  }
}

/** Ek course ko parhane wale log (README §34 ka "Database Systems" wala case). */
export async function getCourseTeachers(
  courseId: string,
  options: { page?: number; perPage?: number } = {},
): Promise<CourseTeacherPage> {
  const perPage = options.perPage ?? COURSE_TEACHERS_PER_PAGE;
  const page = options.page && options.page > 0 ? options.page : 1;

  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.rpc("course_teachers", {
      p_course_id: courseId,
      p_limit: perPage,
      p_offset: (page - 1) * perPage,
    });

    if (error) return { teachers: [], total: 0, failed: true };
    if (!data || data.length === 0) return { teachers: [], total: 0, failed: false };

    const teachers: CourseTeacher[] = data.map((row) => ({
      ...toPerson(row, null),
      courseAverage: row.course_average === null ? null : Number(row.course_average),
      courseReviewCount: row.course_review_count ?? null,
      semestersTaught: row.semesters_taught ?? 0,
    }));

    return { teachers, total: Number(data[0].total_count ?? 0), failed: false };
  } catch {
    return { teachers: [], total: 0, failed: true };
  }
}

// -----------------------------------------------------------------------------
// Profile ke breakdowns (README §38, §39)
// -----------------------------------------------------------------------------

/*
  Yeh dono list khali bhi ho sakti hain. Iska matlab "kuch toot gaya" nahi, balki
  yeh ke abhi itna data nahi ke course/semester ki alag rating dikhayi ja sake.
  Threshold DB me hai (platform_settings.breakdown_min_reviews), UI me nahi.
*/
export async function getPersonCourseRatings(personId: string): Promise<CourseRating[]> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("person_course_ratings", {
      p_person_id: personId,
    });

    if (error || !data) return [];

    return data.map((row) => ({
      courseId: row.course_id,
      courseSlug: row.course_slug,
      courseCode: row.course_code,
      courseTitle: row.course_title,
      reviewCount: row.review_count ?? 0,
      averageRating: row.average_rating === null ? null : Number(row.average_rating),
      criteria: toCriteria(row.criteria),
    }));
  } catch {
    return [];
  }
}

export async function getPersonSemesterRatings(personId: string): Promise<SemesterRating[]> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("person_semester_ratings", {
      p_person_id: personId,
    });

    if (error || !data) return [];

    return data.map((row) => ({
      semesterId: row.semester_id,
      label: row.semester_label,
      season: row.semester_season,
      year: row.semester_year,
      reviewCount: row.review_count ?? 0,
      averageRating: row.average_rating === null ? null : Number(row.average_rating),
    }));
  } catch {
    return [];
  }
}

// -----------------------------------------------------------------------------
// Rankings, most reviewed, trending (README §40, §41, §42)
// -----------------------------------------------------------------------------

export async function getRankings(options: {
  category: PersonCategory;
  scope?: RankingScope;
  departmentId?: string | null;
  courseId?: string | null;
  semesterId?: string | null;
  limit?: number;
}): Promise<RankedPerson[]> {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.rpc("rankings", {
      p_category: options.category,
      p_scope: options.scope ?? "university",
      p_department_id: options.departmentId ?? null,
      p_course_id: options.courseId ?? null,
      p_semester_id: options.semesterId ?? null,
      p_limit: options.limit ?? 10,
    });

    if (error || !data) return [];

    return data.map((row) => ({ ...toPerson(row, options.category), rank: row.rank }));
  } catch {
    return [];
  }
}

export async function getMostReviewed(options: {
  category?: PersonCategory | null;
  limit?: number;
} = {}): Promise<PersonSummary[]> {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.rpc("most_reviewed", {
      p_category: options.category ?? null,
      p_limit: options.limit ?? 10,
    });

    if (error || !data) return [];

    return data.map((row) => toPerson(row, null));
  } catch {
    return [];
  }
}

export async function getTrending(options: {
  category?: PersonCategory | null;
  limit?: number;
} = {}): Promise<TrendingPerson[]> {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.rpc("trending", {
      p_category: options.category ?? null,
      p_limit: options.limit ?? 10,
    });

    if (error || !data) return [];

    return data.map((row) => ({
      ...toPerson(row, null),
      recentReviews: row.recent_reviews ?? 0,
      windowDays: row.window_days ?? 30,
    }));
  } catch {
    return [];
  }
}

/*
  Ranking ka minimum review threshold (README §40: admin isay badal sakta hai).
  UI isay sirf ek saaf line dikhane ke liye parhta hai. Eligibility ka faisla
  hamesha DB karti hai, yeh number nahi.
*/
export const getRankingThreshold = cache(async (): Promise<number> => {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("platform_settings")
      .select("ranking_min_reviews")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return RANKING.minReviews;
    return data.ranking_min_reviews ?? RANKING.minReviews;
  } catch {
    return RANKING.minReviews;
  }
});

// -----------------------------------------------------------------------------
// Comparison (README §43)
// -----------------------------------------------------------------------------

export async function comparePeople(
  ids: string[],
  category: PersonCategory,
): Promise<ComparisonPerson[]> {
  if (ids.length === 0) return [];

  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.rpc("compare_people", {
      p_ids: ids,
      p_category: category,
    });

    if (error || !data) return [];

    return data.map((row) => ({
      ...toPerson(row, category),
      criteria: toCriteria(row.criteria),
    }));
  } catch {
    return [];
  }
}

// -----------------------------------------------------------------------------
// Recommendations (README §44)
// -----------------------------------------------------------------------------

export async function getRecommendations(
  input: RecommendationInput,
  limit = 5,
): Promise<Recommendation[]> {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.rpc("recommend_teachers", {
      p_course_id: input.courseId,
      p_department_id: input.departmentId,
      p_program_id: input.programId,
      p_semester_id: input.semesterId,
      p_section: input.section.trim() || null,
      p_category: input.category,
      p_limit: limit,
    });

    if (error || !data) return [];

    return data.map((row) => ({
      ...toPerson(row, input.category),
      score: Number(row.score ?? 0),
      reasons: Array.isArray(row.reasons) ? row.reasons : [],
      strengths: toStrengths(row.strengths),
    }));
  } catch {
    return [];
  }
}

// -----------------------------------------------------------------------------
// Private lists (README §45, §46)
// -----------------------------------------------------------------------------

export async function getMyFavorites(options: { page?: number; perPage?: number } = {}): Promise<{
  people: SavedPerson[];
  total: number;
  failed: boolean;
}> {
  const perPage = options.perPage ?? FAVORITES_PER_PAGE;
  const page = options.page && options.page > 0 ? options.page : 1;

  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.rpc("my_favorites", {
      p_limit: perPage,
      p_offset: (page - 1) * perPage,
    });

    if (error) return { people: [], total: 0, failed: true };
    if (!data || data.length === 0) return { people: [], total: 0, failed: false };

    return {
      total: Number(data[0].total_count ?? 0),
      people: data.map((row) => ({ ...toPerson(row, null), savedAt: row.saved_at })),
      failed: false,
    };
  } catch {
    return { people: [], total: 0, failed: true };
  }
}

/** Save button ki halat ke liye. Logged out par khali set. */
export const getMyFavoriteIds = cache(async (): Promise<Set<string>> => {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("my_favorite_person_ids");

    if (error || !data) return new Set<string>();
    return new Set(data);
  } catch {
    return new Set<string>();
  }
});

export async function getMyRecentlyViewed(limit = RECENTLY_VIEWED_LIMIT): Promise<ViewedPerson[]> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("my_recently_viewed", { p_limit: limit });

    if (error || !data) return [];

    return data.map((row) => ({ ...toPerson(row, null), viewedAt: row.viewed_at }));
  } catch {
    return [];
  }
}

// -----------------------------------------------------------------------------
// Filter dropdown options
// -----------------------------------------------------------------------------

/*
  Yeh chaar chhoti lists filter bar aur recommendation form dono use karte hain.
  `cache()` ki wajah se ek request me ek hi baar chalti hain.

  Courses ki list par had lagi hui hai: poora catalog browser tak bhejna §84 ke
  khilaf hai. Department chunne par list usi department ki reh jati hai.
*/
export const getFilterOptions = cache(async (): Promise<FilterOptions> => {
  try {
    const supabase = createSupabaseServerClient();

    const [departments, semesters, courses, programs] = await Promise.all([
      supabase
        .from("departments")
        .select("id, name, short_name")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("semesters")
        .select("id, label, year")
        .order("year", { ascending: false })
        .order("label", { ascending: true })
        .limit(24),
      supabase
        .from("courses")
        .select("id, code, title, department_id")
        .eq("is_active", true)
        .order("title", { ascending: true })
        .limit(300),
      supabase
        .from("programs")
        .select("id, name, short_name, department_id")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(60),
    ]);

    return {
      departments: (departments.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        shortName: row.short_name,
      })),
      semesters: (semesters.data ?? []).map((row) => ({
        id: row.id,
        label: row.label,
        year: row.year,
      })),
      courses: (courses.data ?? []).map((row) => ({
        id: row.id,
        code: row.code,
        title: row.title,
        departmentId: row.department_id,
      })),
      programs: (programs.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        shortName: row.short_name,
        departmentId: row.department_id,
      })),
    };
  } catch {
    return EMPTY_FILTER_OPTIONS;
  }
});
