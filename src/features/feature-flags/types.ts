/*
  Public feature-flag types (README §55).

  Yeh chaar switch public/student taraf UX gate karne ke liye padhe jaate hain
  (misal: signup band ho to form ki jagah note dikhana). ASAL enforcement DB ke
  andar hai (submit/edit/signup functions khud feature_enabled() check karti
  hain), is liye yeh module kabhi authority nahi - sirf UI ko sach dikhata hai.

  email_domain_lock ka mizaaj ulta hai: enabled=true = LOCKED (sirf SMIU domain).
  Baaki teen me enabled=true = feature ON.
*/

export const FEATURE_KEYS = [
  "student_signup",
  "review_submission",
  "review_editing",
  "email_domain_lock",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

/*
  Har key ka "safe default" jab read hi fail ho jaye (network/transient).
  Seeded halat char ki char ON/LOCKED (true) hai, is liye default true rakhna
  aam surat se milta hai:
   - ON/OFF gates par true = fail-open. Koi security khatra nahi kyunke DB agar
     sach me OFF hai to server action khud friendly message ke saath rok degi.
   - email_domain_lock par true = LOCKED (zyada conservative display).
*/
export const FEATURE_DEFAULT: Record<FeatureKey, boolean> = {
  student_signup: true,
  review_submission: true,
  review_editing: true,
  email_domain_lock: true,
};

export function isFeatureKey(value: unknown): value is FeatureKey {
  return typeof value === "string" && (FEATURE_KEYS as readonly string[]).includes(value);
}
