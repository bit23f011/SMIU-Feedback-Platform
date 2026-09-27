import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FEATURE_DEFAULT, FEATURE_KEYS, type FeatureKey } from "@/features/feature-flags/types";

/*
  Public feature-flag read (README §55).

  `public.feature_enabled(p_key)` anon + authenticated dono ko granted hai aur
  server ka waqt (schedule window) authoritative maanta hai. Yeh sirf UI gating
  ke liye hai: DB ki submit/edit/signup functions apni jagah dobara check karti
  hain, is liye yahan ka natija kabhi asal rukawat nahi - sirf dikhawa.

  Fail hone par per-key safe default (FEATURE_DEFAULT) laut'ta hai.
*/
export async function isFeatureEnabled(key: FeatureKey): Promise<boolean> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("feature_enabled", { p_key: key });
    if (error || typeof data !== "boolean") return FEATURE_DEFAULT[key];
    return data;
  } catch {
    return FEATURE_DEFAULT[key];
  }
}

/*
  Ek se zyada flags ek saath (parallel). Un pages ke liye jinhe kai switch chahiye
  (misal signup page ko student_signup + email_domain_lock dono).
*/
export async function getFeatureStates(
  keys: readonly FeatureKey[] = FEATURE_KEYS,
): Promise<Record<FeatureKey, boolean>> {
  const result: Record<FeatureKey, boolean> = { ...FEATURE_DEFAULT };
  const unique = Array.from(new Set(keys));
  const values = await Promise.all(unique.map((key) => isFeatureEnabled(key)));
  unique.forEach((key, i) => {
    result[key] = values[i];
  });
  return result;
}
