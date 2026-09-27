import { createSupabaseServerClient } from "@/lib/supabase/server";

/*
  Course reference data ki public read (server-side).

  SECURITY: wahi rules jo people queries me hain - anon key, RLS ke through read,
  aur fail hone par sirf `failed: true` (koi error detail, SQL ya table naam UI
  tak nahi jata, aur koi raw logging nahi hoti).
*/

export interface CourseSummary {
  id: string;
  slug: string;
  code: string | null;
  title: string;
  creditHours: number | null;
  department: string | null;
}

export interface CourseListResult {
  courses: CourseSummary[];
  failed: boolean;
}

// PostgREST filter value me wildcard/comma special hain - user input se hata dete hain.
function sanitizeSearch(term: string): string {
  return term.replace(/[%,*()]/g, " ").trim().slice(0, 80);
}

type CourseRow = {
  id: string;
  slug: string;
  code: string | null;
  title: string;
  credit_hours: number | null;
  departments: { name: string; short_name: string | null } | null;
};

export async function listCourses(options: {
  search?: string;
  limit?: number;
} = {}): Promise<CourseListResult> {
  const { search, limit = 60 } = options;

  try {
    const supabase = createSupabaseServerClient();

    let query = supabase
      .from("courses")
      .select("id, slug, code, title, credit_hours, departments ( name, short_name )")
      .eq("is_active", true)
      .order("title", { ascending: true })
      .limit(limit);

    const term = search ? sanitizeSearch(search) : "";
    if (term) {
      // Title ya course code, dono par match karo.
      query = query.or(`title.ilike.%${term}%,code.ilike.%${term}%`);
    }

    const { data, error } = await query;
    if (error) {
      return { courses: [], failed: true };
    }

    const courses = (data as unknown as CourseRow[]).map((row) => ({
      id: row.id,
      slug: row.slug,
      code: row.code,
      title: row.title,
      creditHours: row.credit_hours,
      department: row.departments?.short_name ?? row.departments?.name ?? null,
    }));

    return { courses, failed: false };
  } catch {
    return { courses: [], failed: true };
  }
}
