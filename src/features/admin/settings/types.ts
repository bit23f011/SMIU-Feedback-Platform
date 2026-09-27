import type { Database } from "@/lib/supabase/database.types";

/*
  Feature controls ke shared types (README §55).

  Chaar switch (DB me feature_flags keys):
    - student_signup     : naye student account (ON/OFF)
    - review_submission  : naya review jama karna (ON/OFF)
    - review_editing     : apna review edit karna (ON/OFF)
    - email_domain_lock  : sirf SMIU email domain (LOCKED/UNLOCKED)

  email_domain_lock ka mizaaj ulta hai: is_enabled=true ka matlab "LOCKED"
  (sirf university email), false = "UNLOCKED". Baaki teen me true = ON.

  AUTHORITY yahan nahi: set_feature_flag SECURITY DEFINER + is_admin() hai aur
  waqt (schedule) server-side authoritative hai. admin_feature_flags read bhi
  is_admin() gated. Yeh file sirf naam/shakal aur label deti hai.
*/

export type FeatureFlagRow =
  Database["public"]["Functions"]["admin_feature_flags"]["Returns"][number];

/** DB me maujood chaar keys (isi tarteeb me admin page par dikhein). */
export const FEATURE_FLAG_ORDER = [
  "student_signup",
  "review_submission",
  "review_editing",
  "email_domain_lock",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_ORDER)[number];

/** Lock-style switch: true = LOCKED (ulta mizaaj). Baaki ON/OFF hain. */
export const LOCK_STYLE_FLAGS: ReadonlySet<string> = new Set(["email_domain_lock"]);

export interface FeatureFlagMeta {
  key: FeatureFlagKey;
  label: string;
  help: string;
  /** true = LOCKED/UNLOCKED lafz; false = ON/OFF lafz. */
  lockStyle: boolean;
  /** enabled=true par lafz. */
  onWord: string;
  /** enabled=false par lafz. */
  offWord: string;
}

export const FEATURE_FLAG_META: Record<FeatureFlagKey, FeatureFlagMeta> = {
  student_signup: {
    key: "student_signup",
    label: "Student signup",
    help: "When off, new accounts cannot be created. Existing students can still sign in and browse.",
    lockStyle: false,
    onWord: "On",
    offWord: "Off",
  },
  review_submission: {
    key: "review_submission",
    label: "Review submission",
    help: "When off, no new reviews can be submitted. Sign in, browse and search still work.",
    lockStyle: false,
    onWord: "On",
    offWord: "Off",
  },
  review_editing: {
    key: "review_editing",
    label: "Review editing",
    help: "When off, students cannot edit reviews they already submitted.",
    lockStyle: false,
    onWord: "On",
    offWord: "Off",
  },
  email_domain_lock: {
    key: "email_domain_lock",
    label: "Student email domain lock",
    help: "When locked, only the SMIU student email domain may be used to sign up. When unlocked, the domain check is relaxed.",
    lockStyle: true,
    onWord: "Locked",
    offWord: "Unlocked",
  },
};

export interface FeatureFlag {
  key: string;
  label: string;
  /** Set value (schedule ke bagair kya hoga). */
  isEnabled: boolean;
  /** Abhi asal me effective (schedule window ka natija). Server ka faisla. */
  enabledNow: boolean;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
  /** Admin-facing metadata (label/help/lafz). Unknown key ho to null. */
  meta: FeatureFlagMeta | null;
}

export interface FeatureFlagView {
  flags: FeatureFlag[];
  failed: boolean;
}

export const EMPTY_FEATURE_FLAG_VIEW: FeatureFlagView = {
  flags: [],
  failed: false,
};

export function isFeatureFlagKey(value: unknown): value is FeatureFlagKey {
  return (
    typeof value === "string" && (FEATURE_FLAG_ORDER as readonly string[]).includes(value)
  );
}
