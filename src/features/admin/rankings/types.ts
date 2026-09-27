import type { Database } from "@/lib/supabase/database.types";

/*
  Rankings / privacy thresholds ke shared types (README §40, §38-§39, §42).

  Yeh platform_settings ki ek hi row (id=1) hai. Public sirf padh sakta hai; likhne
  ka faisla admin RPC set_platform_settings (is_admin()) me hota hai. Bounds neeche
  DB ke CHECK constraints se hoobahoo milte hain taake form pehle hi rok de aur DB
  ka (column-naam wala) error kabhi user tak na jaye.
*/

export type PlatformSettingsRow = Database["public"]["Tables"]["platform_settings"]["Row"];

export interface RankingsSettings {
  rankingMinReviews: number;
  breakdownMinReviews: number;
  trendingWindowDays: number;
  trendingMinReviews: number;
  updatedAt: string | null;
}

export interface RankingsBound {
  min: number;
  max: number;
}

/* DB CHECK constraints (20260924091000_rankings_and_aggregates.sql). */
export const RANKING_BOUNDS: Record<keyof Omit<RankingsSettings, "updatedAt">, RankingsBound> = {
  rankingMinReviews: { min: 1, max: 100 },
  breakdownMinReviews: { min: 2, max: 50 },
  trendingWindowDays: { min: 7, max: 180 },
  trendingMinReviews: { min: 2, max: 50 },
};

export interface RankingsView {
  settings: RankingsSettings | null;
  failed: boolean;
}

export const EMPTY_RANKINGS_VIEW: RankingsView = { settings: null, failed: false };

export interface RankingsActionState {
  ok: boolean;
  error?: string;
}

export const EMPTY_RANKINGS_ACTION_STATE: RankingsActionState = { ok: false };
