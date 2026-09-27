import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RANKING } from "@/lib/constants";
import type { PersonCategory, PersonRoleSummary, PersonSummary } from "@/features/people/types";
import { getPersonRatingStats, getRatingStatsForPeople } from "@/features/reviews/queries";

/*
  Public directory queries (server-side).

  SECURITY:
  - Sirf anon key wala server client use hota hai, isliye har read RLS ke through
    jati hai. RLS (migration 0002) sirf is_active rows public ko deti hai.
  - Koi error detail UI tak nahi jati. Fail hone par `failed: true` return hota hai
    aur user ko safe generic message dikhta hai (na stack, na SQL, na table naam).
  - Yahan koi logging nahi ki gayi: production me raw error log karna aasani se
    connection string / query detail leak kar deta hai. Structured observability
    baad ke phase me add hogi.
*/

export interface DirectoryResult {
  people: PersonSummary[];
  /** true = query fail hui (UI error state dikhaye, empty state nahi). */
  failed: boolean;
}

// PostgREST filter value me wildcard/comma ka apna matlab hota hai, isliye user
// input se yeh characters nikal dete hain. (Yeh injection fix nahi - PostgREST
// khud parameterise karta hai - yeh sirf predictable matching ke liye hai.)
function sanitizeSearch(term: string): string {
  return term.replace(/[%,*()]/g, " ").trim().slice(0, 80);
}

const PERSON_SELECT = `
  id,
  slug,
  full_name,
  display_name,
  gender,
  photo_url,
  headline,
  primary_category,
  teacher_type,
  person_roles!inner (
    category,
    title_override,
    is_primary,
    is_active,
    positions ( title ),
    departments ( name, short_name )
  )
` as const;

type PersonRow = {
  id: string;
  slug: string;
  full_name: string;
  display_name: string | null;
  gender: PersonSummary["gender"];
  photo_url: string | null;
  headline: string | null;
  primary_category: PersonCategory | null;
  teacher_type: PersonSummary["teacherType"];
  person_roles: {
    category: PersonCategory;
    title_override: string | null;
    is_primary: boolean;
    is_active: boolean;
    positions: { title: string } | null;
    departments: { name: string; short_name: string | null } | null;
  }[];
};

function toPersonSummary(row: PersonRow): PersonSummary {
  const roles: PersonRoleSummary[] = (row.person_roles ?? [])
    .filter((role) => role.is_active)
    .map((role) => ({
      category: role.category,
      // Pehle approved position ka title, warna "Other" wala free-text override.
      title: role.positions?.title ?? role.title_override ?? null,
      department: role.departments?.short_name ?? role.departments?.name ?? null,
      isPrimary: role.is_primary,
    }));

  return {
    id: row.id,
    slug: row.slug,
    name: row.display_name ?? row.full_name,
    gender: row.gender,
    photoUrl: row.photo_url,
    headline: row.headline,
    primaryCategory: row.primary_category,
    teacherType: row.teacher_type ?? null,
    roles,
    // Rating alag query se aati hai (reviews ke aggregates). Yahan default null -
    // null ka matlab "abhi koi review nahi", 0 ka matlab "sab ne 0 diya" hota,
    // is liye 0 kabhi placeholder ki tarah use nahi karte.
    rating: null,
    reviewCount: null,
  };
}

/*
  Directory cards par asli rating lagana.
  Alag query kyun? Kyunki `person_rating_stats` ek view hai aur PostgREST usay
  `people` ke saath join nahi karta (unka FK relationship declared nahi hai).
  Is liye ek hi extra query me saare stats le kar JS me merge karte hain -
  N+1 nahi hota.
*/
async function withRatings(people: PersonSummary[]): Promise<PersonSummary[]> {
  if (people.length === 0) return people;

  const stats = await getRatingStatsForPeople(people.map((person) => person.id));
  if (stats.size === 0) return people;

  return people.map((person) => {
    const stat = stats.get(person.id);
    if (!stat || stat.reviewCount === 0) return person;
    return { ...person, rating: stat.averageRating, reviewCount: stat.reviewCount };
  });
}

export async function listPeopleByCategory(options: {
  category: PersonCategory;
  search?: string;
  limit?: number;
}): Promise<DirectoryResult> {
  const { category, search, limit = 48 } = options;

  try {
    const supabase = createSupabaseServerClient();

    let query = supabase
      .from("people")
      .select(PERSON_SELECT)
      .eq("is_active", true)
      .eq("person_roles.category", category)
      .eq("person_roles.is_active", true)
      .order("full_name", { ascending: true })
      .limit(limit);

    const term = search ? sanitizeSearch(search) : "";
    if (term) {
      query = query.ilike("full_name", `%${term}%`);
    }

    const { data, error } = await query;
    if (error) {
      return { people: [], failed: true };
    }

    return {
      people: await withRatings((data as unknown as PersonRow[]).map(toPersonSummary)),
      failed: false,
    };
  } catch {
    return { people: [], failed: true };
  }
}

export async function getPersonBySlug(slug: string): Promise<PersonSummary | null> {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("people")
      .select(`
        id,
        slug,
        full_name,
        display_name,
        gender,
        photo_url,
        headline,
        primary_category,
        person_roles (
          category,
          title_override,
          is_primary,
          is_active,
          positions ( title ),
          departments ( name, short_name )
        )
      `)
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) return null;

    const person = toPersonSummary(data as unknown as PersonRow);
    const stats = await getPersonRatingStats(person.id);

    return stats.reviewCount === 0
      ? person
      : { ...person, rating: stats.averageRating, reviewCount: stats.reviewCount };
  } catch {
    return null;
  }
}

/*
  Ek category ka sab se upar wala person (homepage ka "top teacher" slot).

  Do queries kyun? `person_rating_stats` ek view hai aur PostgREST usay `people`
  ke saath join nahi karta. Is liye pehle threshold cross karne wale top stats
  lete hain, phir unhi ids me se is category ka pehla active person chunte hain.

  Return null ka matlab hai "abhi koi eligible nahi" - UI us halat me imandar
  empty state dikhata hai, koi nakli naam nahi.
*/
export async function getTopPersonByCategory(options: {
  category: PersonCategory;
  minReviews?: number;
}): Promise<PersonSummary | null> {
  const { category, minReviews = RANKING.minReviews } = options;

  try {
    const supabase = createSupabaseServerClient();

    const { data: stats, error: statsError } = await supabase
      .from("person_rating_stats")
      .select("person_id, review_count, average_rating")
      .gte("review_count", minReviews)
      .order("average_rating", { ascending: false })
      .order("review_count", { ascending: false })
      .limit(20);

    if (statsError || !stats || stats.length === 0) return null;

    const ids = stats
      .map((row) => row.person_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    if (ids.length === 0) return null;

    const { data, error } = await supabase
      .from("people")
      .select(PERSON_SELECT)
      .in("id", ids)
      .eq("is_active", true)
      .eq("person_roles.category", category)
      .eq("person_roles.is_active", true);

    if (error || !data) return null;

    const eligible = new Map<string, PersonSummary>();
    for (const row of data as unknown as PersonRow[]) {
      const person = toPersonSummary(row);
      eligible.set(person.id, person);
    }

    // stats pehle se sorted hai, is liye pehla match hi top spot hai.
    for (const stat of stats) {
      const person = stat.person_id ? eligible.get(stat.person_id) : undefined;
      if (!person) continue;

      return {
        ...person,
        rating: stat.average_rating === null ? null : Number(stat.average_rating),
        reviewCount: stat.review_count ?? 0,
      };
    }

    return null;
  } catch {
    return null;
  }
}
