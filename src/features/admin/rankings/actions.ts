"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GENERIC_ADMIN_ERROR, pickSafeMessage } from "@/features/admin/shared";
import {
  RANKING_BOUNDS,
  type RankingsActionState,
} from "@/features/admin/rankings/types";

/*
  Rankings thresholds ka write (README §40).

  ASOOL: authority DB me. set_platform_settings SECURITY DEFINER + is_admin() hai
  aur har tabdeeli audit hoti hai. NULL parameter = "na chhero", magar form saari
  4 values bhejta hai. Range yahin check hoti hai taake DB ka CHECK error (jis me
  column naam hota) kabhi user tak na jaye; range se bahar par apna saaf message.
*/

const SAFE_MESSAGES = new Set<string>([
  "You do not have permission to change these settings.",
]);

const FIELD_LABELS: Record<keyof typeof RANKING_BOUNDS, string> = {
  rankingMinReviews: "The ranking threshold",
  breakdownMinReviews: "The breakdown threshold",
  trendingWindowDays: "The trending window",
  trendingMinReviews: "The trending threshold",
};

type FieldKey = keyof typeof RANKING_BOUNDS;

function parseBounded(formData: FormData, key: FieldKey): number | { error: string } {
  const bound = RANKING_BOUNDS[key];
  const raw = (formData.get(key) ?? "").toString().trim();
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < bound.min || value > bound.max) {
    return { error: `${FIELD_LABELS[key]} must be between ${bound.min} and ${bound.max}.` };
  }
  return value;
}

export async function updateRankingsSettingsAction(
  _previous: RankingsActionState,
  formData: FormData,
): Promise<RankingsActionState> {
  const ranking = parseBounded(formData, "rankingMinReviews");
  if (typeof ranking !== "number") return { ok: false, error: ranking.error };
  const breakdown = parseBounded(formData, "breakdownMinReviews");
  if (typeof breakdown !== "number") return { ok: false, error: breakdown.error };
  const trendingWindow = parseBounded(formData, "trendingWindowDays");
  if (typeof trendingWindow !== "number") return { ok: false, error: trendingWindow.error };
  const trendingMin = parseBounded(formData, "trendingMinReviews");
  if (typeof trendingMin !== "number") return { ok: false, error: trendingMin.error };

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("set_platform_settings", {
      p_ranking_min_reviews: ranking,
      p_breakdown_min_reviews: breakdown,
      p_trending_window_days: trendingWindow,
      p_trending_min_reviews: trendingMin,
    });
    if (error) return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES) };
    revalidatePath("/admin/rankings");
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR };
  }
}
