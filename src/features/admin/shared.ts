/*
  Admin server actions ke chhote shared helpers.

  YAAD RAHE: is file me koi authority nahi hai. Har admin RPC khud SECURITY
  DEFINER + is_admin() hai. Yeh sirf (1) UUID ki shakal check karta hai taake
  behtar message de sakein, aur (2) DB ke error message me se sirf wahi user tak
  bhejta hai jo pehle se allowlist me hai (jis me table/column/constraint ka koi
  naam nahi). Baaki har cheez ek aam message ban jati hai.
*/

export const GENERIC_ADMIN_ERROR =
  "We could not apply that change right now. Please try again.";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Slug sirf tab revalidate karein jab wo asli slug jaisa lage. */
export function isSlug(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9-]+$/.test(value);
}

/*
  Sirf allowlist me maujood DB message hi user tak jata hai. Yeh strings migration
  ki `raise exception` se hoobahoo milti hain aur in me koi internal naam nahi,
  is liye inhein dikhana mehfooz hai. Baaki sab GENERIC_ADMIN_ERROR.
*/
export function pickSafeMessage(
  message: string | undefined,
  allow: ReadonlySet<string>,
): string {
  if (message && allow.has(message)) return message;
  return GENERIC_ADMIN_ERROR;
}
