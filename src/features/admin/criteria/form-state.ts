/*
  Review criteria form ki SHARED state shape.

  Yeh file JAAN BOOJH KAR "use server" NAHI hai. Next.js ka rule: "use server"
  file sirf async functions export kar sakti hai - type ya object wahan se export
  karna build/runtime par crash deta hai ("A 'use server' file can only export
  async functions"). Is liye state type + uski khali default value yahan hai.
*/

export interface CriterionActionState {
  ok: boolean;
  error?: string;
  criterionId?: string;
}

export const EMPTY_CRITERION_ACTION_STATE: CriterionActionState = { ok: false };
