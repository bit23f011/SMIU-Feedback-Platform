import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  EMPTY_PEOPLE_VIEW,
  EMPTY_PERSON_BUNDLE,
  PEOPLE_PAGE_SIZE,
  type AdminPeopleView,
  type AdminPersonAssignment,
  type AdminPersonBundle,
  type AdminPersonDetail,
  type AdminPersonRole,
  type PeopleStatus,
  type PersonCategory,
} from "@/features/admin/people/types";

/*
  People ka read (README §49-§50).

  SECURITY:
  - Aam anon-key client, service role NAHI. Har RPC ke andar is_admin() gate hai.
  - admin_people_list paginated hai + total_count deta hai; review_count sirf
    published reviews ki ginti hai (kis ne likhi ka koi izhaar nahi = anonymity).
  - Error ka matan UI tak nahi jata; sirf `failed: true`.
*/

interface PeopleQueryInput {
  category?: PersonCategory | null;
  search?: string | null;
  status?: PeopleStatus;
  page?: number;
}

export async function getAdminPeople(input: PeopleQueryInput = {}): Promise<AdminPeopleView> {
  const page = Math.max(1, Math.trunc(input.page ?? 1));
  const pageSize = PEOPLE_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  const search = (input.search ?? "").trim();

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_people_list", {
      p_category: input.category ?? null,
      p_search: search ? search : null,
      p_status: input.status ?? "all",
      p_limit: pageSize,
      p_offset: offset,
    });

    if (error) return { ...EMPTY_PEOPLE_VIEW, page, failed: true };
    if (!data || data.length === 0) return { ...EMPTY_PEOPLE_VIEW, page };

    return {
      failed: false,
      page,
      pageSize,
      total: Number(data[0]?.total_count ?? 0),
      items: data.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        displayName: row.display_name,
        slug: row.slug,
        primaryCategory: row.primary_category,
        teacherType: row.teacher_type,
        gender: row.gender,
        headline: row.headline,
        isActive: row.is_active,
        isVerified: row.is_verified,
        roleCount: Number(row.role_count ?? 0),
        reviewCount: Number(row.review_count ?? 0),
      })),
    };
  } catch {
    return { ...EMPTY_PEOPLE_VIEW, page, failed: true };
  }
}

export async function getAdminPersonBundle(personId: string): Promise<AdminPersonBundle> {
  try {
    const supabase = createSupabaseServerClient();
    const [personRes, rolesRes, assignmentsRes] = await Promise.all([
      supabase.rpc("admin_get_person", { p_person_id: personId }),
      supabase.rpc("admin_person_roles", { p_person_id: personId }),
      supabase.rpc("admin_person_assignments", { p_person_id: personId }),
    ]);

    if (personRes.error) return { ...EMPTY_PERSON_BUNDLE, failed: true };

    const personRow = personRes.data?.[0];
    const person: AdminPersonDetail | null = personRow
      ? {
          id: personRow.id,
          fullName: personRow.full_name,
          displayName: personRow.display_name,
          titlePrefix: personRow.title_prefix,
          headline: personRow.headline,
          bio: personRow.bio,
          slug: personRow.slug,
          gender: personRow.gender,
          primaryCategory: personRow.primary_category,
          teacherType: personRow.teacher_type,
          isActive: personRow.is_active,
          isVerified: personRow.is_verified,
        }
      : null;

    const roles: AdminPersonRole[] = (rolesRes.data ?? []).map((row) => ({
      id: row.id,
      category: row.category,
      departmentId: row.department_id,
      departmentName: row.department_name,
      positionId: row.position_id,
      positionTitle: row.position_title,
      titleOverride: row.title_override,
      isPrimary: row.is_primary,
      isActive: row.is_active,
    }));

    const assignments: AdminPersonAssignment[] = (assignmentsRes.data ?? []).map((row) => ({
      id: row.id,
      courseOfferingId: row.course_offering_id,
      courseId: row.course_id,
      courseTitle: row.course_title,
      semesterId: row.semester_id,
      semesterLabel: row.semester_label,
      section: row.section,
      category: row.category,
      isActive: row.is_active,
    }));

    return { person, roles, assignments, failed: false };
  } catch {
    return { ...EMPTY_PERSON_BUNDLE, failed: true };
  }
}
