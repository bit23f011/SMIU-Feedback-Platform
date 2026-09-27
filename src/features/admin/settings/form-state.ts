/*
  Feature-flag / settings form ki SHARED state shape.

  Yeh file JAAN BOOJH KAR "use server" NAHI hai. Next.js ka rule: "use server"
  file sirf async functions export kar sakti hai - type ya object wahan se export
  karna build/runtime par crash deta hai ("A 'use server' file can only export
  async functions"). Is liye state type + uski khali default value yahan hai.
*/

export interface FeatureFlagActionState {
  ok: boolean;
  error?: string;
  key?: string;
}

export const EMPTY_FEATURE_FLAG_ACTION_STATE: FeatureFlagActionState = { ok: false };
