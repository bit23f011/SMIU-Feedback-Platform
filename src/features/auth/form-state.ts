/*
  Auth form ki SHARED state shape.

  Yeh file JAAN BOOJH KAR "use server" NAHI hai. Next.js ka rule hai: jis file
  ke top par "use server" ho, wo SIRF async functions export kar sakti hai - koi
  object ya type wahan se export karna build/runtime par fail karta hai
  ("A 'use server' file can only export async functions").

  Is liye state ka type aur uski khali (empty) default value yahan rakhi hai.
  Server actions (actions.ts) aur client forms (login-form/signup-form) dono
  yahan se import karte hain - server boundary saaf rehti hai.
*/

export interface AuthFormState {
  ok: boolean;
  /** Poore form ka ek error (banner me dikhta hai). */
  formError?: string;
  /** Field-wise errors: { email: ["..."] } */
  fieldErrors?: Record<string, string[]>;
}

// useFormState ko shuru me yeh khali state milti hai (abhi koi submit nahi hua).
export const EMPTY_AUTH_STATE: AuthFormState = { ok: false };
