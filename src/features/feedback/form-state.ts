/*
  Public website-feedback form ki SHARED state shape.

  Yeh file JAAN BOOJH KAR "use server" NAHI hai. Next.js ka rule: "use server"
  file sirf async functions export kar sakti hai - type ya object wahan se export
  karna build/runtime par crash deta hai ("A 'use server' file can only export
  async functions"). Is liye state type + uski khali default value yahan hai.
*/

export interface FeedbackFormState {
  ok: boolean;
  formError?: string;
  fieldErrors?: Record<string, string[]>;
}

export const EMPTY_FEEDBACK_FORM_STATE: FeedbackFormState = { ok: false };
