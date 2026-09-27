import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EMPTY_RANKINGS_VIEW, type RankingsView } from "@/features/admin/rankings/types";

/*
  Rankings thresholds ka read (README §40).

  platform_settings par public read policy hai (sirf yeh columns; updated_by bahar).
  Is liye aam anon-key client se ek hi row (id=1) padh lete hain. Error UI tak nahi
  jata; sirf `failed: true`.
*/
export async function getRankingsSettings(): Promise<RankingsView> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("platform_settings")
      .select(
        "ranking_min_reviews, breakdown_min_reviews, trending_window_days, trending_min_reviews, updated_at",
      )
      .eq("id", 1)
      .maybeSingle();

    if (error) return { ...EMPTY_RANKINGS_VIEW, failed: true };
    if (!data) return EMPTY_RANKINGS_VIEW;

    return {
      failed: false,
      settings: {
        rankingMinReviews: Number(data.ranking_min_reviews),
        breakdownMinReviews: Number(data.breakdown_min_reviews),
        trendingWindowDays: Number(data.trending_window_days),
        trendingMinReviews: Number(data.trending_min_reviews),
        updatedAt: data.updated_at ?? null,
      },
    };
  } catch {
    return { ...EMPTY_RANKINGS_VIEW, failed: true };
  }
}
