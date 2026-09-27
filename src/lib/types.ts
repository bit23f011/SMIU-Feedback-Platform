/*
  Domain-level shared types (hand-authored, DB-agnostic).
  Yeh public UI aur server dono me use hote hain. DB row types alag se
  supabase/database.types.ts me generate honge.
*/

// Paanch tarah ke log jinke reviews hote hain. Yeh values DB enum se match karengi.
export type PersonCategory =
  | "teacher"
  | "lab_instructor"
  | "faculty"
  | "university_staff"
  | "hr_staff";

// Har category ka display metadata.
export interface PersonCategoryMeta {
  value: PersonCategory;
  /** Full label, e.g. "Lab Instructors". */
  label: string;
  /** Tight jagahon (chips, mobile nav) ke liye chhota label. */
  shortLabel: string;
  /** Ek fard ke liye, e.g. "Lab Instructor". */
  singular: string;
  /** Public route slug, e.g. "lab-instructors". */
  slug: string;
  description: string;
}

// Navbar / footer link.
export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

// Admin notification banner ki priority (Task: website-open notice).
export type NotificationPriority = "info" | "success" | "warning" | "critical";

// Homepage highlight card ka generic shape (Phase 1 me placeholder data ke liye).
export interface HighlightItem {
  id: string;
  title: string;
  subtitle?: string;
  category: PersonCategory;
}

// Admin server-controlled feature locks. Frontend inhe sirf DIKHANE ke liye
// padhta hai; asli enforcement server/RLS me hoti hai.
export interface FeatureLocks {
  studentSignup: boolean;
  reviewSubmission: boolean;
  reviewEditing: boolean;
  emailDomain: boolean;
}
