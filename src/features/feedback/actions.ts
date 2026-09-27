"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  FEEDBACK_MESSAGE_MAX,
  isFeedbackType,
  type FeedbackType,
} from "@/features/admin/feedback/types";
import type { FeedbackFormState } from "@/features/feedback/form-state";

/*
  Website feedback jama karne ka PUBLIC action (README §56 - §59).

  Yeh ProfAura ke BAARE me feedback hai (bug, suggestion, website ka tajurba) -
  kisi teacher/profile ke against report NAHI (uske liye alag report system hai).
  Yeh dataset bilkul alag hai aur kisi rating/ranking par asar nahi daalta.

  KAUN: public visitor bhi aur logged-in student bhi. Is liye anon-key server
  client theek hai - RPC ko anon + authenticated dono ko execute grant hai.

  ASOOL (baaki actions jaisa): yeh function khud kuch "allow" nahi karti. Asli
  rule submit_website_feedback (SECURITY DEFINER) me hai - message zaroori,
  message ki had, rating 1-5, email ki shakal. Yahan ki validation sirf achhe
  error messages ke liye hai; yeh file poori hata do to bhi DB ghalat write
  qubool nahi karega.

  PRIVACY (README §59): submitter ki shanaakht (student id, email, auth id)
  kabhi public par nahi jati. Yeh form contact email sirf follow-up ke liye
  optional leta hai, jo sirf admin ko dikhta hai.

  DB ka raw error kabhi user tak nahi jata - neeche ek allow-list hai jis me
  sirf wahi text hai jo migration khud raise karti hai (koi table/column naam
  nahi). Baaki sab ek generic message ban jata hai.

  NOTE: FeedbackFormState type aur EMPTY_FEEDBACK_FORM_STATE ab ek alag plain
  module (form-state.ts) me hain. Wajah: "use server" file sirf async functions
  export kar sakti hai - type/object yahan se export karna build par error deta.
*/

const GENERIC_ERROR = "We could not send your feedback right now. Please try again.";

/*
  Sirf yeh messages user ko dikhte hain. Yeh hoobahoo wahi text hai jo
  submit_website_feedback `raise exception` karta hai. In me koi internal naam
  nahi, is liye dikhana mehfooz hai. List me na ho to GENERIC_ERROR.
*/
const SAFE_DB_MESSAGES = new Set<string>([
  "Please write your feedback before sending.",
  "Please keep your feedback shorter.",
  "Give a rating between 1 and 5.",
  "That contact email does not look right.",
]);

function safeMessage(message: string | undefined): string {
  if (message && SAFE_DB_MESSAGES.has(message)) return message;
  return GENERIC_ERROR;
}

/* Halki si email shakal - asli tasdeeq DB me hoti hai (README §57). */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function submitWebsiteFeedbackAction(
  _previous: FeedbackFormState,
  formData: FormData,
): Promise<FeedbackFormState> {
  const fieldErrors: Record<string, string[]> = {};

  // Type: Select sirf jaiz value bhejta hai, phir bhi shakal check kar lo.
  const typeRaw = formData.get("type");
  let type: FeedbackType | null = null;
  if (isFeedbackType(typeRaw)) {
    type = typeRaw;
  } else {
    fieldErrors.type = ["Choose a type of feedback."];
  }

  /*
    Rating optional hai (README §57). Khaali = koi rating nahi (null). Agar diya
    hai to 1 se 5 tak integer hona chahiye.
  */
  const ratingRaw = (formData.get("rating") ?? "").toString().trim();
  let rating: number | null = null;
  if (ratingRaw !== "" && ratingRaw !== "none") {
    const parsed = Number(ratingRaw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
      fieldErrors.rating = ["Choose a rating from 1 to 5, or leave it blank."];
    } else {
      rating = parsed;
    }
  }

  // Message zaroori hai, aur had FEEDBACK_MESSAGE_MAX (DB par bhi wahi).
  const message = (formData.get("message") ?? "").toString().trim();
  if (message.length === 0) {
    fieldErrors.message = ["Please write your feedback before sending."];
  } else if (message.length > FEEDBACK_MESSAGE_MAX) {
    fieldErrors.message = ["Please keep your feedback shorter."];
  }

  /*
    Contact email optional hai aur sirf follow-up ke liye. Khaali = null. Agar
    diya hai to shakal theek honi chahiye (DB aur sakht check karti hai).
  */
  const emailRaw = (formData.get("contactEmail") ?? "").toString().trim();
  let contactEmail: string | null = null;
  if (emailRaw.length > 0) {
    if (emailRaw.length > 254 || !EMAIL_RE.test(emailRaw)) {
      fieldErrors.contactEmail = ["That contact email does not look right."];
    } else {
      contactEmail = emailRaw.toLowerCase();
    }
  }

  if (Object.keys(fieldErrors).length > 0 || type === null) {
    return { ok: false, fieldErrors };
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("submit_website_feedback", {
      p_type: type,
      p_rating: rating,
      p_message: message,
      p_contact_email: contactEmail,
    });

    if (error) {
      return { ok: false, formError: safeMessage(error.message) };
    }
  } catch {
    return { ok: false, formError: GENERIC_ERROR };
  }

  return { ok: true };
}
