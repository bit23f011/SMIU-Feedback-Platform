import type { Database } from "@/lib/supabase/database.types";

/*
  Students / accounts viewer ke types (README §49).

  Yeh sirf account fields dikhata hai (email admin-only, role, active, kab bana).
  ZAROORI: yeh dataset REVIEWS se kabhi nahi jurta - anonymity mehfooz rehti hai.
  Read-only: yahan koi mutation nahi (account actions alag jagah).
*/

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface AdminStudent {
  id: string;
  email: string;
  role: AppRole;
  isActive: boolean;
  createdAt: string;
}

export type StudentStatus = "all" | "active" | "inactive";

export const STUDENT_STATUS_OPTIONS: readonly { value: StudentStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export function isStudentStatus(value: unknown): value is StudentStatus {
  return value === "all" || value === "active" || value === "inactive";
}

export const STUDENTS_PAGE_SIZE = 20;

export interface AdminStudentsView {
  items: AdminStudent[];
  total: number;
  page: number;
  pageSize: number;
  failed: boolean;
}

export const EMPTY_STUDENTS_VIEW: AdminStudentsView = {
  items: [],
  total: 0,
  page: 1,
  pageSize: STUDENTS_PAGE_SIZE,
  failed: false,
};
