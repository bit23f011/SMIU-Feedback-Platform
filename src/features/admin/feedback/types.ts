import type { Database } from "@/lib/supabase/database.types";

/*
  Website feedback ke shared types (README §56 - §59).

  Yeh ProfAura ke BAARE me feedback hai (bug, suggestion, website ka tajurba) -
  kisi teacher/profile ke against report NAHI. Yeh dataset bilkul alag hai aur
  kisi rating/ranking par asar nahi daalta.

  PRIVACY (README §58): submitter ki shanaakht (student id, email, auth id)
  kabhi expose nahi hoti. Admin queue sirf `from_student` (boolean) deti hai.
  `contact_email` sirf tab hota hai jab bhejne wale ne khud follow-up ke liye
  diya ho, aur wo sirf admin ko dikhta hai - kabhi public par nahi.

  AUTHORITY yahan nahi: read/update dono admin RPC (is_admin()) tay karti hain.
*/

export type FeedbackType = Database["public"]["Enums"]["website_feedback_type"];
export type FeedbackStatus = Database["public"]["Enums"]["website_feedback_status"];

export const FEEDBACK_STATUSES = ["new", "reviewing", "resolved", "archived"] as const;

export const DEFAULT_FEEDBACK_STATUS: FeedbackStatus = "new";

export const ADMIN_FEEDBACK_PER_PAGE = 20;

/* README §56: paanch feedback types. Public form aur admin filter dono yahi use karte hain. */
export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  website_feedback: "Website feedback",
  suggest_update: "Suggest an update",
  report_bug: "Report a bug",
  report_issue: "Report an issue",
  other: "Other",
};

/** Public form me types isi tarteeb me dikhein. */
export const FEEDBACK_TYPE_ORDER: readonly FeedbackType[] = [
  "website_feedback",
  "suggest_update",
  "report_bug",
  "report_issue",
  "other",
] as const;

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  resolved: "Resolved",
  archived: "Archived",
};

export interface FeedbackTab {
  status: FeedbackStatus;
  label: string;
  help: string;
}

export const FEEDBACK_TABS: readonly FeedbackTab[] = [
  { status: "new", label: "New", help: "Feedback that has not been looked at yet." },
  { status: "reviewing", label: "Reviewing", help: "Feedback you are currently working through." },
  { status: "resolved", label: "Resolved", help: "Feedback that has been dealt with." },
  { status: "archived", label: "Archived", help: "Feedback set aside. Kept, but out of the way." },
] as const;

export interface AdminFeedback {
  id: string;
  type: FeedbackType;
  /** 1 - 5, ya null agar bhejne wale ne rating nahi di. */
  rating: number | null;
  message: string;
  /** Sirf follow-up ke liye, sirf admin ko. Public par kabhi nahi. */
  contactEmail: string | null;
  status: FeedbackStatus;
  isImportant: boolean;
  /** Logged-in student ne bheja tha ya visitor ne. Shanaakht NAHI. */
  fromStudent: boolean;
  createdAt: string;
  reviewedAt: string | null;
}

export interface AdminFeedbackFilters {
  status: FeedbackStatus | null;
  type: FeedbackType | null;
  search: string;
  importantOnly: boolean;
  page: number;
}

export interface AdminFeedbackPage {
  feedback: AdminFeedback[];
  total: number;
  failed: boolean;
}

export const EMPTY_FEEDBACK_PAGE: AdminFeedbackPage = {
  feedback: [],
  total: 0,
  failed: false,
};

export function isFeedbackStatus(value: unknown): value is FeedbackStatus {
  return (
    typeof value === "string" && (FEEDBACK_STATUSES as readonly string[]).includes(value)
  );
}

export function isFeedbackType(value: unknown): value is FeedbackType {
  return (
    typeof value === "string" && (FEEDBACK_TYPE_ORDER as readonly string[]).includes(value)
  );
}

/** README §57: message ki max length (server bhi 2000 par enforce karta hai). */
export const FEEDBACK_MESSAGE_MAX = 2000;
