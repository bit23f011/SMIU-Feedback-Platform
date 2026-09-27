import type { Database } from "@/lib/supabase/database.types";

/*
  Reports section ke shared types (README §51, §52, §53).

  Yeh reports TEACHER/STAFF profiles ke against hain (galat maloomat, duplicate
  profile wagera) - website ke apne feedback se bilkul alag (wo §56 me hai).

  AUTHORITY yahan nahi: kaun report resolve kar sakta hai, kaun profile
  deactivate/merge/reset kar sakta hai - sab kuch SECURITY DEFINER + is_admin()
  RPCs tay karti hain. Yeh file sirf naam aur shakal deti hai.
*/

export type ReportReason = Database["public"]["Enums"]["report_reason"];
export type ReportStatus = Database["public"]["Enums"]["report_status"];

export const REPORT_QUEUE_STATUSES = ["pending", "accepted", "rejected"] as const;

export const DEFAULT_REPORT_STATUS: ReportStatus = "pending";

/** README §29: browser me bohat saara data ek saath na aaye. */
export const ADMIN_REPORTS_PER_PAGE = 20;

/* README §51: report ke chaar reasons. Labels English (Roman Urdu sirf comment me). */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  duplicate_profile: "Duplicate profile",
  wrong_information: "Wrong information",
  incorrect_profile: "Incorrect profile",
  other: "Other",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
};

export interface ReportTab {
  status: ReportStatus;
  label: string;
  help: string;
}

export const REPORT_TABS: readonly ReportTab[] = [
  {
    status: "pending",
    label: "Pending",
    help: "Reports waiting for a decision. Accepting a report never deletes a profile on its own.",
  },
  {
    status: "accepted",
    label: "Accepted",
    help: "Reports you agreed with. Any change to the profile is a separate, explicit step.",
  },
  {
    status: "rejected",
    label: "Rejected",
    help: "Reports you turned down. The profile stays exactly as it was.",
  },
] as const;

export interface AdminReport {
  id: string;
  personId: string;
  personSlug: string;
  personName: string;
  /** Report ke waqt profile live hai ya deactivate ho chuka. */
  personActive: boolean;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  reviewedAt: string | null;
  resolutionNote: string | null;
  /** Isi profile par kul reports (context ke liye). */
  reportCount: number;
}

export interface AdminReportPage {
  reports: AdminReport[];
  total: number;
  /* Query chali hi nahi (network ya is_admin() ne roka) - khali list se alag. */
  failed: boolean;
}

export const EMPTY_REPORT_PAGE: AdminReportPage = {
  reports: [],
  total: 0,
  failed: false,
};

export function isReportQueueStatus(value: unknown): value is ReportStatus {
  return (
    typeof value === "string" &&
    (REPORT_QUEUE_STATUSES as readonly string[]).includes(value)
  );
}

/*
  Server sirf yeh do resolve actions manta hai (resolve_report ki if/elsif se
  hoobahoo). Delete/deactivate is me NAHI hai: README §51 ke mutabiq report
  accept karna khud profile nahi hataata - wo alag explicit step hai
  (setPersonActiveAction).
*/
export const REPORT_RESOLVE_ACTIONS = ["accept", "reject"] as const;

export type ReportResolveAction = (typeof REPORT_RESOLVE_ACTIONS)[number];

export function isReportResolveAction(value: unknown): value is ReportResolveAction {
  return (
    typeof value === "string" &&
    (REPORT_RESOLVE_ACTIONS as readonly string[]).includes(value)
  );
}
