import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  emptyRefList,
  type AdminCourse,
  type AdminDepartment,
  type AdminPosition,
  type AdminProgram,
  type AdminRefList,
  type AdminSemester,
} from "@/features/admin/reference/types";

/*
  Reference-data ka read (README §49).

  SECURITY:
  - Aam anon-key client, service role NAHI. Har RPC ke andar is_admin() gate hai,
    is liye non-admin ko sirf error milta hai, data nahi.
  - Inactive rows bhi aate hain (admin ko poora manzar chahiye) + counts (kitne
    programs/courses/roles/offerings lage hain) taake pata rahe kya retire karna
    mehfooz hai.
  - Error ka matan UI tak nahi jata; sirf `failed: true`.

  DB pehle hi sensible tarteeb (active pehle, phir naam) me deta hai.
*/

export async function getAdminDepartments(): Promise<AdminRefList<AdminDepartment>> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_departments_list");
    if (error) return emptyRefList<AdminDepartment>(true);
    if (!data) return emptyRefList<AdminDepartment>();
    return {
      failed: false,
      items: data.map((row) => ({
        id: row.id,
        name: row.name,
        shortName: row.short_name,
        slug: row.slug,
        isActive: row.is_active,
        universityId: row.university_id,
        programCount: Number(row.program_count ?? 0),
        courseCount: Number(row.course_count ?? 0),
        roleCount: Number(row.role_count ?? 0),
      })),
    };
  } catch {
    return emptyRefList<AdminDepartment>(true);
  }
}

export async function getAdminPrograms(): Promise<AdminRefList<AdminProgram>> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_programs_list");
    if (error) return emptyRefList<AdminProgram>(true);
    if (!data) return emptyRefList<AdminProgram>();
    return {
      failed: false,
      items: data.map((row) => ({
        id: row.id,
        name: row.name,
        shortName: row.short_name,
        slug: row.slug,
        level: row.level,
        isActive: row.is_active,
        departmentId: row.department_id,
        departmentName: row.department_name,
        courseCount: Number(row.course_count ?? 0),
      })),
    };
  } catch {
    return emptyRefList<AdminProgram>(true);
  }
}

export async function getAdminCourses(): Promise<AdminRefList<AdminCourse>> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_courses_list");
    if (error) return emptyRefList<AdminCourse>(true);
    if (!data) return emptyRefList<AdminCourse>();
    return {
      failed: false,
      items: data.map((row) => ({
        id: row.id,
        title: row.title,
        code: row.code,
        slug: row.slug,
        creditHours: row.credit_hours === null ? null : Number(row.credit_hours),
        isActive: row.is_active,
        departmentId: row.department_id,
        departmentName: row.department_name,
        programId: row.program_id,
        programName: row.program_name,
        offeringCount: Number(row.offering_count ?? 0),
      })),
    };
  } catch {
    return emptyRefList<AdminCourse>(true);
  }
}

export async function getAdminSemesters(): Promise<AdminRefList<AdminSemester>> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_semesters_list");
    if (error) return emptyRefList<AdminSemester>(true);
    if (!data) return emptyRefList<AdminSemester>();
    return {
      failed: false,
      items: data.map((row) => ({
        id: row.id,
        label: row.label,
        season: row.season,
        year: Number(row.year),
        slug: row.slug,
        isCurrent: row.is_current,
        startsOn: row.starts_on,
        endsOn: row.ends_on,
        offeringCount: Number(row.offering_count ?? 0),
      })),
    };
  } catch {
    return emptyRefList<AdminSemester>(true);
  }
}

export async function getAdminPositions(): Promise<AdminRefList<AdminPosition>> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_positions_list");
    if (error) return emptyRefList<AdminPosition>(true);
    if (!data) return emptyRefList<AdminPosition>();
    return {
      failed: false,
      items: data.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        rank: Number(row.rank ?? 0),
        category: row.category,
        isActive: row.is_active,
        roleCount: Number(row.role_count ?? 0),
      })),
    };
  } catch {
    return emptyRefList<AdminPosition>(true);
  }
}
