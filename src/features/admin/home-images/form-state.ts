/*
  Home-image actions ki SHARED state shape.

  Yeh file JAAN BOOJH KAR "use server" NAHI hai. Next.js ka rule: "use server"
  file sirf async functions export kar sakti hai. Is liye state type + khali
  default value yahan (alag plain module me) rakhe hain.
*/

export interface HomeImageActionState {
  ok: boolean;
  error?: string;
}

export const EMPTY_HOME_IMAGE_ACTION_STATE: HomeImageActionState = { ok: false };
