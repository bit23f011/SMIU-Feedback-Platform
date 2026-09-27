/*
  Admin website-feedback form ki SHARED state shape.

  Yeh file JAAN BOOJH KAR "use server" NAHI hai. Next.js ka rule: "use server"
  file sirf async functions export kar sakti hai - type ya object wahan se export
  karna build/runtime par crash deta hai ("A 'use server' file can only export
  async functions"). Is liye state type + uski khali default value yahan hai.
*/

export interface FeedbackActionState {
  ok: boolean;
  error?: string;
  /** Kis feedback par aakhri action chala - UI wahin natija dikhati hai. */
  feedbackId?: string;
}

export const EMPTY_FEEDBACK_ACTION_STATE: FeedbackActionState = { ok: false };
