import type { PersonCategory, PersonSummary, TeacherType } from "@/features/people/types";
import type { ReviewCriterionKind } from "@/features/reviews/types";

/*
  Phase 4 (search, filters, rankings, recommendations) ke shared shapes.

  ASOOL: yahan jo bhi "allow-list" hai (sort, scope, rating steps) wo sirf UI ko
  saaf rakhne ke liye hai. Asli hifazat DB me hai: `directory_people` aur
  `rankings` apni taraf se bhi sirf maloom values qubool karti hain aur baaki ko
  default par le aati hain. Is file ko poora hata dene se bhi DB kamzor nahi hoti.
*/

// -----------------------------------------------------------------------------
// Paging
// -----------------------------------------------------------------------------

export const PEOPLE_PER_PAGE = 24;
export const COURSES_PER_PAGE = 24;
export const COURSE_TEACHERS_PER_PAGE = 24;
export const FAVORITES_PER_PAGE = 24;
export const RECENTLY_VIEWED_LIMIT = 8;

/** URL se aaya page number. Kachra mile to 1. */
export function parsePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "", 10);
  return Number.isFinite(page) && page > 0 ? Math.min(page, 500) : 1;
}

export function totalPages(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / Math.max(perPage, 1)));
}

// -----------------------------------------------------------------------------
// Directory filters (README §35)
// -----------------------------------------------------------------------------

export const DIRECTORY_SORTS = [
  { value: "name", label: "Name" },
  { value: "rating", label: "Highest rated" },
  { value: "reviews", label: "Most reviewed" },
  { value: "recent", label: "Recently added" },
] as const;

export type DirectorySort = (typeof DIRECTORY_SORTS)[number]["value"];

export function parseDirectorySort(value: string | undefined): DirectorySort {
  const match = DIRECTORY_SORTS.find((sort) => sort.value === value);
  return match ? match.value : "name";
}

/** Rating filter ke steps. "Any" ka matlab null hai, 0 nahi. */
export const MIN_RATING_CHOICES = [9, 8, 7, 6, 5] as const;

export function parseMinRating(value: string | undefined): number | null {
  const rating = Number.parseInt(value ?? "", 10);
  return MIN_RATING_CHOICES.includes(rating as (typeof MIN_RATING_CHOICES)[number])
    ? rating
    : null;
}

export const TEACHER_TYPE_CHOICES: readonly TeacherType[] = ["internal", "external", "corporate"];

export function parseTeacherType(value: string | undefined): TeacherType | null {
  return TEACHER_TYPE_CHOICES.includes(value as TeacherType) ? (value as TeacherType) : null;
}

/*
  UUID ki shakal check. Yeh security nahi hai (DB khud type-cast par mana kar
  deti hai), magar is se ek galat query bhejne ke bajaye hum seedha "koi filter
  nahi" maan lete hain, aur user ko error ke bajaye poori list milti hai.
*/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseId(value: string | undefined): string | null {
  return value && UUID_PATTERN.test(value) ? value : null;
}

export function parseSearch(value: string | undefined): string {
  return (value ?? "").trim().slice(0, 80);
}

export interface DirectoryFilters {
  search: string;
  departmentId: string | null;
  courseId: string | null;
  semesterId: string | null;
  minRating: number | null;
  teacherType: TeacherType | null;
  sort: DirectorySort;
  page: number;
}

export const EMPTY_FILTERS: DirectoryFilters = {
  search: "",
  departmentId: null,
  courseId: null,
  semesterId: null,
  minRating: null,
  teacherType: null,
  sort: "name",
  page: 1,
};

/*
  URL param naam ek hi jagah likhe hain. Server (parse) aur client (controls)
  dono yahi naam use karte hain, warna filter bar aur query chupke se alag ho
  jate hain.
*/
export const FILTER_PARAMS = {
  search: "q",
  department: "dept",
  course: "course",
  semester: "semester",
  rating: "rating",
  teacherType: "type",
  sort: "sort",
  page: "page",
} as const;

export type QueryParams = { [key: string]: string | string[] | undefined };

/** searchParams se ek safe string. Array aaye to pehli value. */
export function firstParam(params: QueryParams | undefined, key: string): string | undefined {
  const raw = params?.[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value : undefined;
}

/** Poora filter set URL se. Har hissa apne parser se guzarta hai. */
export function readDirectoryFilters(params: QueryParams | undefined): DirectoryFilters {
  return {
    search: parseSearch(firstParam(params, FILTER_PARAMS.search)),
    departmentId: parseId(firstParam(params, FILTER_PARAMS.department)),
    courseId: parseId(firstParam(params, FILTER_PARAMS.course)),
    semesterId: parseId(firstParam(params, FILTER_PARAMS.semester)),
    minRating: parseMinRating(firstParam(params, FILTER_PARAMS.rating)),
    teacherType: parseTeacherType(firstParam(params, FILTER_PARAMS.teacherType)),
    sort: parseDirectorySort(firstParam(params, FILTER_PARAMS.sort)),
    page: parsePage(firstParam(params, FILTER_PARAMS.page)),
  };
}

/** Pagination links ke liye: wahi filters, magar query shakal me. */
export function filtersToQuery(filters: DirectoryFilters): Record<string, string> {
  const query: Record<string, string> = {};
  if (filters.search) query[FILTER_PARAMS.search] = filters.search;
  if (filters.departmentId) query[FILTER_PARAMS.department] = filters.departmentId;
  if (filters.courseId) query[FILTER_PARAMS.course] = filters.courseId;
  if (filters.semesterId) query[FILTER_PARAMS.semester] = filters.semesterId;
  if (filters.minRating !== null) query[FILTER_PARAMS.rating] = String(filters.minRating);
  if (filters.teacherType) query[FILTER_PARAMS.teacherType] = filters.teacherType;
  if (filters.sort !== "name") query[FILTER_PARAMS.sort] = filters.sort;
  return query;
}

/** Kitne filters lage hue hain (chip / "Clear all" dikhane ke liye). */
export function activeFilterCount(filters: DirectoryFilters): number {
  let count = 0;
  if (filters.departmentId) count += 1;
  if (filters.courseId) count += 1;
  if (filters.semesterId) count += 1;
  if (filters.minRating !== null) count += 1;
  if (filters.teacherType) count += 1;
  return count;
}

// -----------------------------------------------------------------------------
// Result shapes
// -----------------------------------------------------------------------------

/** `failed` aur "khali" alag cheezein hain: pehli error state hai, doosri sach. */
export interface PeoplePage {
  people: PersonSummary[];
  total: number;
  failed: boolean;
}

export interface CourseSummary {
  id: string;
  slug: string;
  code: string | null;
  title: string;
  creditHours: number | null;
  departmentName: string | null;
  departmentShort: string | null;
  teacherCount: number;
}

export interface CoursePage {
  courses: CourseSummary[];
  total: number;
  failed: boolean;
}

export interface CourseTeacher extends PersonSummary {
  /** Sirf is course ki rating. Threshold se kam data ho to null. */
  courseAverage: number | null;
  courseReviewCount: number | null;
  semestersTaught: number;
}

export interface CourseTeacherPage {
  teachers: CourseTeacher[];
  total: number;
  failed: boolean;
}

// -----------------------------------------------------------------------------
// Aggregates (README §37, §38, §39)
// -----------------------------------------------------------------------------

export interface CriterionAggregate {
  key: string;
  label: string;
  kind: ReviewCriterionKind;
  averageStar: number | null;
  starResponses: number;
  yesCount: number;
  boolResponses: number;
}

/** YES/NO sawal ka percentage. Jawab hi na hon to null (0% nahi). */
export function yesPercent(criterion: CriterionAggregate): number | null {
  if (criterion.kind !== "yes_no" || criterion.boolResponses === 0) return null;
  return Math.round((criterion.yesCount / criterion.boolResponses) * 100);
}

export interface CourseRating {
  courseId: string;
  courseSlug: string;
  courseCode: string | null;
  courseTitle: string;
  reviewCount: number;
  averageRating: number | null;
  criteria: CriterionAggregate[];
}

export interface SemesterRating {
  semesterId: string;
  label: string;
  season: string;
  year: number;
  reviewCount: number;
  averageRating: number | null;
}

// -----------------------------------------------------------------------------
// Rankings (README §40, §41, §42)
// -----------------------------------------------------------------------------

export const RANKING_SCOPES = [
  { value: "university", label: "University" },
  { value: "department", label: "Department" },
  { value: "course", label: "Course" },
  { value: "semester", label: "Semester" },
] as const;

export type RankingScope = (typeof RANKING_SCOPES)[number]["value"];

export function parseRankingScope(value: string | undefined): RankingScope {
  const match = RANKING_SCOPES.find((scope) => scope.value === value);
  return match ? match.value : "university";
}

/*
  Category ki value URL se aati hai. Sirf maloom values qubool; kachra mile to
  "teacher". Yeh security nahi (DB khud invalid enum par mana kar deti hai), bas
  UI ko ek theek default deti hai.
*/
const PERSON_CATEGORY_VALUES: readonly PersonCategory[] = [
  "teacher",
  "lab_instructor",
  "faculty",
  "university_staff",
  "hr_staff",
];

export function parsePersonCategory(value: string | undefined): PersonCategory {
  return PERSON_CATEGORY_VALUES.includes(value as PersonCategory)
    ? (value as PersonCategory)
    : "teacher";
}

export interface RankedPerson extends PersonSummary {
  rank: number;
}

export interface TrendingPerson extends PersonSummary {
  recentReviews: number;
  windowDays: number;
}

// -----------------------------------------------------------------------------
// Comparison (README §43)
// -----------------------------------------------------------------------------

export const COMPARE_MIN = 2;
export const COMPARE_MAX = 4;

export interface ComparisonPerson extends PersonSummary {
  criteria: CriterionAggregate[];
}

/** URL se ?ids=a,b,c. Sirf sahi shakal wali ids, bina duplicate, max 4. */
export function parseCompareIds(value: string | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  for (const part of value.split(",")) {
    const id = parseId(part.trim());
    if (id) seen.add(id);
    if (seen.size >= COMPARE_MAX) break;
  }
  return [...seen];
}

// -----------------------------------------------------------------------------
// Recommendations (README §44)
// -----------------------------------------------------------------------------

export interface RecommendationStrength {
  key: string;
  label: string;
  averageStar: number | null;
}

export interface Recommendation extends PersonSummary {
  /** 0 se 100. Weights DB function ke comment me likhe hain. */
  score: number;
  /** "Why this teacher" - sirf wahi wajah jo asal me lagi. */
  reasons: string[];
  strengths: RecommendationStrength[];
}

export interface RecommendationInput {
  courseId: string | null;
  departmentId: string | null;
  programId: string | null;
  semesterId: string | null;
  section: string;
  category: PersonCategory;
}

export const EMPTY_RECOMMENDATION_INPUT: RecommendationInput = {
  courseId: null,
  departmentId: null,
  programId: null,
  semesterId: null,
  section: "",
  category: "teacher",
};

export function hasRecommendationInput(input: RecommendationInput): boolean {
  return Boolean(input.courseId || input.departmentId || input.programId);
}

// -----------------------------------------------------------------------------
// Private lists (README §45, §46)
// -----------------------------------------------------------------------------

export interface SavedPerson extends PersonSummary {
  savedAt: string;
}

export interface ViewedPerson extends PersonSummary {
  viewedAt: string;
}

/*
  Save button ka form state.

  Yeh types yahan hain, actions file me nahi: ek "use server" file se sirf async
  functions export ho sakti hain, is liye state aur uska default yahin rehta hai.
*/
export interface FavoriteState {
  saved: boolean;
  error: string | null;
}

export function initialFavoriteState(saved: boolean): FavoriteState {
  return { saved, error: null };
}


// -----------------------------------------------------------------------------
// Filter dropdown options
// -----------------------------------------------------------------------------

export interface DepartmentOption {
  id: string;
  name: string;
  shortName: string | null;
}

export interface SemesterOption {
  id: string;
  label: string;
  year: number;
}

export interface CourseOption {
  id: string;
  code: string | null;
  title: string;
  departmentId: string;
}

export interface ProgramOption {
  id: string;
  name: string;
  shortName: string | null;
  departmentId: string;
}

export interface FilterOptions {
  departments: DepartmentOption[];
  semesters: SemesterOption[];
  courses: CourseOption[];
  programs: ProgramOption[];
}

export const EMPTY_FILTER_OPTIONS: FilterOptions = {
  departments: [],
  semesters: [],
  courses: [],
  programs: [],
};

/** Dropdown me course ka label. Code ho to "CS-301 Database Systems". */
export function courseLabel(course: { code: string | null; title: string }): string {
  return course.code ? `${course.code} ${course.title}` : course.title;
}
