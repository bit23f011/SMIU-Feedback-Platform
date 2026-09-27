/*
  Notifications form ki SHARED state shape.

  Yeh file JAAN BOOJH KAR "use server" NAHI hai. Next.js ka rule: "use server"
  file sirf async functions export kar sakti hai - type ya object wahan se export
  karna build/runtime par crash deta hai ("A 'use server' file can only export
  async functions"). Is liye state type + uski khali default value yahan hai.
*/

export interface NotificationActionState {
  ok: boolean;
  error?: string;
  notificationId?: string;
}

export const EMPTY_NOTIFICATION_ACTION_STATE: NotificationActionState = { ok: false };
