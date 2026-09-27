import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  EMPTY_FEATURE_FLAG_VIEW,
  FEATURE_FLAG_META,
  FEATURE_FLAG_ORDER,
  isFeatureFlagKey,
  type FeatureFlag,
  type FeatureFlagView,
} from "@/features/admin/settings/types";

/*
  Feature controls ka read (README §55).

  SECURITY:
  - Aam anon-key client, service role NAHI. `admin_feature_flags()` ke andar
    is_admin() gate hai, is liye non-admin ko sirf error milta hai, data nahi.
  - enabled_now server ka faisla hai (schedule window ka natija) - frontend is par
    bharosa nahi karta, sirf dikhata hai.
  - Error ka matan UI tak nahi jata; sirf `failed: true`.

  Rows ko DB ki tarteeb ke bajaye FEATURE_FLAG_ORDER par sort karte hain taake
  page hamesha ek jaisa lage. Koi ajnabi key aaye to bhi list me reh jati hai
  (meta null ke saath), taake kuch chhup na jaye.
*/
export async function getFeatureFlags(): Promise<FeatureFlagView> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_feature_flags");

    if (error) return { ...EMPTY_FEATURE_FLAG_VIEW, failed: true };
    if (!data || data.length === 0) return EMPTY_FEATURE_FLAG_VIEW;

    const flags: FeatureFlag[] = data.map((row) => ({
      key: row.key,
      label: row.label,
      isEnabled: row.is_enabled,
      enabledNow: row.enabled_now,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      updatedAt: row.updated_at,
      meta: isFeatureFlagKey(row.key) ? FEATURE_FLAG_META[row.key] : null,
    }));

    // Known keys apni tarteeb me; ajnabi keys (agar hon) aakhir me.
    const orderIndex = (key: string) => {
      const i = (FEATURE_FLAG_ORDER as readonly string[]).indexOf(key);
      return i === -1 ? FEATURE_FLAG_ORDER.length : i;
    };
    flags.sort((a, b) => orderIndex(a.key) - orderIndex(b.key));

    return { failed: false, flags };
  } catch {
    return { ...EMPTY_FEATURE_FLAG_VIEW, failed: true };
  }
}
