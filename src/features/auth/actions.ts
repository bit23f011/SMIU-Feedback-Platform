"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { signInSchema, signUpSchema, studentIdToEmail } from "@/features/auth/schemas";
import type { AuthFormState } from "@/features/auth/form-state";

/*
  Auth Server Actions.

  YEH server par chalti hain - is liye yahan ki validation asli validation hai.
  Client sirf form bhejta hai; kya allowed hai, wo yahan aur DB me tay hota hai.

  TEEN cheezein jaan boojh kar aise likhi hain:

  1) EK HI EMAIL (product wada): signup par Supabase khud ek confirmation email
     bhejta hai. Is file me koi "resend" action NAHI hai. Agar aage resend chahiye
     to wo alag, rate-limited, explicitly-designed cheez hogi.

  2) USER ENUMERATION se bachao: signup ka jawab hamesha ek jaisa hai, chahe email
     pehle se mojood ho ya na ho. Login ka error bhi hamesha "email ya password
     ghalat" hai - kabhi "is email ka account nahi hai" nahi.

  3) SAFE ERRORS: Supabase/Postgres ka asli message kabhi user tak nahi jata
     (DB trigger ka text bhi nahi). Sirf humare likhe hue generic messages.

  NOTE: AuthFormState type aur EMPTY_AUTH_STATE ab ek alag plain module
  (form-state.ts) me hain. Wajah: "use server" file sirf async functions export
  kar sakti hai - type/object yahan se export karna Next.js build par error deta.
*/

/*
  Open-redirect guard. `?next=` se sirf apni site ke andar ka raasta chalega.
  "//evil.com" browser ke liye protocol-relative URL hai, is liye wo bhi block.
  Backslash Windows/browser normalisation tricks ke liye block hai.
*/
function safeNextPath(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;
  return value;
}

// -----------------------------------------------------------------------------
// SIGN UP
// -----------------------------------------------------------------------------
export async function signUpAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    studentId: formData.get("studentId"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptTerms: formData.get("acceptTerms"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = createSupabaseServerClient();

  // Email SERVER par banti hai. Client jo bhi bheje, domain hissa hamesha yahan
  // se aata hai - is liye kisi doosre domain se signup mumkin hi nahi.
  const email = studentIdToEmail(parsed.data.studentId);

  const { error } = await supabase.auth.signUp({
    email,
    password: parsed.data.password,
    options: {
      // Confirmation link isi route par wapas aayega.
      emailRedirectTo: `${publicEnv.siteUrl}/auth/callback`,
      // KOI user metadata nahi bhej rahe. Role DB trigger me hardcoded 'student'
      // hai; client se role/flags bhejna khud ek vulnerability hoti.
    },
  });

  if (error) {
    /*
      Yahan hum error ko QISMON me baant rahe hain, magar user ko detail nahi
      de rahe. Domain wala case pehchanne ke liye status/code dekhte hain -
      DB trigger `check_violation` raise karta hai, jo Supabase 4xx me aata hai.
    */
    const isRateLimited = error.status === 429;

    return {
      ok: false,
      formError: isRateLimited
        ? "Too many attempts. Please wait a few minutes and try again."
        : "We could not create the account with those details. Please check your student ID and try again.",
    };
  }

  /*
    Kamiyabi par hamesha ek hi jagah bhejte hain - chahe email nayi thi ya
    pehle se mojood. Isi tarah koi bahar se account enumerate nahi kar sakta.
  */
  redirect("/auth/verify-email");
}

// -----------------------------------------------------------------------------
// SIGN IN
// -----------------------------------------------------------------------------
export async function signInAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    studentId: formData.get("studentId"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const nextPath = safeNextPath(formData.get("next")?.toString(), "/student");

  const supabase = createSupabaseServerClient();

  // Signup ki tarah, login par bhi email server par banti hai.
  const { data, error } = await supabase.auth.signInWithPassword({
    email: studentIdToEmail(parsed.data.studentId),
    password: parsed.data.password,
  });

  if (error) {
    if (error.status === 429) {
      return {
        ok: false,
        formError: "Too many sign-in attempts. Please wait a few minutes and try again.",
      };
    }

    /*
      AHEM FARQ (yeh pehle bug tha): jab "Confirm email" on hai, to SAHI
      password ke bawajood ek aisa user jisne abhi email confirm nahi ki,
      Supabase se `email_not_confirmed` error aata hai - kamiyabi nahi. Purana
      code har error ko "password ghalat" bana deta tha, is liye sahi password
      wale user ko bhi "incorrect password" dikhta tha. Yahan hum us ek soorat
      ko pehchan kar usay "apna email check karein" screen par bhejte hain
      (wahi jagah jahan naya signup jata hai), jhooti "password ghalat" nahi.

      Yeh enumeration nahi kholta: yeh branch sirf tab chalti hai jab password
      pehle hi sahi ho. Galat ID/password par hamesha wahi ek generic message.
    */
    const code = (error as { code?: string }).code;
    const isUnconfirmed =
      code === "email_not_confirmed" || /email not confirmed/i.test(error.message);

    if (isUnconfirmed) {
      redirect("/auth/verify-email?status=unconfirmed");
    }

    // Ek hi message har nakaami ke liye - na batao ke account mojood hai ya nahi.
    return { ok: false, formError: "That student ID and password do not match." };
  }

  // Double safety: kisi wajah se session mila magar email confirm nahi
  // (config farq), to bhi student area ke bajaye verify screen.
  if (!data.user?.email_confirmed_at) {
    redirect("/auth/verify-email?status=unconfirmed");
  }

  revalidatePath("/", "layout");
  redirect(nextPath);
}

// -----------------------------------------------------------------------------
// SIGN OUT
// -----------------------------------------------------------------------------
export async function signOutAction(): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}
