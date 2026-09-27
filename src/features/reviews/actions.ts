"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/features/auth/session";
import { getReviewCriteria } from "@/features/reviews/queries";
import type { ReviewFormState } from "@/features/reviews/form-state";
import {
  categoryNeedsCourse,
  COMMENT_MAX_CHARS,
  COMMENT_MAX_WORDS,
  countWords,
  OVERALL_MAX,
  OVERALL_MIN,
  STAR_MAX,
  STAR_MIN,
} from "@/features/reviews/types";

/*
  Review ke writes.

  ASOOL: yeh actions khud kuch "allow" nahi karti. Har asli rule DB ki
  SECURITY DEFINER functions me hai (submit_review / update_my_review /
  delete_my_review): verified student hona, ek banday par ek review, edit limit,
  daily limit, saare sawal ka jawab. Yahan ki validation sirf achhe error
  messages ke liye hai - agar yeh file poori bhi hata di jaye, DB phir bhi ghalat
  write qubool nahi karega.

  DOOSRA ASOOL: DB ka raw error kabhi user tak nahi jata. Neeche ek allow-list
  hai - sirf wahi messages dikhte hain jo hum ne khud likhe hain. Baaki sab ek
  generic message ban jata hai, warna constraint/table ke naam leak hote hain.

  NOTE: ReviewFormState type aur EMPTY_REVIEW_STATE ab ek alag plain module
  (form-state.ts) me hain. Wajah: "use server" file sirf async functions export
  kar sakti hai - type/object yahan se export karna Next.js build par error deta.
*/

const GENERIC_ERROR = "We could not save your review right now. Please try again.";

/*
  Sirf yeh messages user ko dikhte hain. Yeh wahi text hai jo migration 0006 ki
  functions `raise exception` karti hain. List me na ho to GENERIC_ERROR.
*/
const SAFE_DB_MESSAGES = new Set<string>([
  "You must be signed in to post a review.",
  "Your account cannot post reviews yet.",
  "Your account cannot edit reviews.",
  "Your account cannot delete reviews.",
  "That profile is not available.",
  "That profile cannot be reviewed yet.",
  "You have already reviewed this person.",
  /*
    README §25 ke naye messages. In me person ka naam ya koi id nahi hai, is
    liye inhein dikhana mehfooz hai.
  */
  "Choose the semester this review is about.",
  "Choose a valid semester.",
  "Choose the course this review is about.",
  "Choose a valid course.",
  "That course and semester do not match this profile.",
  "You have already reviewed this course for this semester.",
  "You have already reviewed this person for this semester.",
  "You have reached the daily limit for new reviews.",
  "You have used all edits for this review.",
  "Give an overall rating between 1 and 10.",
  "Keep your comment to 150 words or fewer.",
  "Your comment is too long. Please shorten it.",
  "Please answer every question before posting.",
  "Please answer every question before saving.",
  "That review is not available to edit.",
  "That review is not available to delete.",
]);

function safeMessage(message: string | undefined): string {
  if (message && SAFE_DB_MESSAGES.has(message)) return message;
  return GENERIC_ERROR;
}

interface ParsedReview {
  overall: number;
  comment: string | null;
  answers: { key: string; star?: number; yes?: boolean }[];
}

/*
  Form ko parse karo - magar sawal ki list FORM se nahi, DB se aati hai.
  Is tarah client apni marzi ke keys ghusa nahi sakta, aur DB ka "har sawal ka
  jawab lazmi" wala check yahan bhi pehle se pakra jata hai.
*/
async function parseReviewForm(
  formData: FormData,
  category: Parameters<typeof getReviewCriteria>[0],
): Promise<{ data: ParsedReview } | { errors: Record<string, string[]> }> {
  const errors: Record<string, string[]> = {};

  /*
    OVERALL 1-10 hai (README §15). Criteria ke stars 1-5 hain - dono ko mat milao.
  */
  const overall = Number(formData.get("overall"));
  if (!Number.isInteger(overall) || overall < OVERALL_MIN || overall > OVERALL_MAX) {
    errors.overall = [`Choose an overall rating from ${OVERALL_MIN} to ${OVERALL_MAX}.`];
  }

  const rawComment = (formData.get("comment") ?? "").toString().trim();
  let comment: string | null = null;

  /*
    README §21: had 150 WORDS hai. Comment optional hai, is liye khaali hona
    theek hai - koi minimum length nahi. char limit doosri deewar hai taake
    150 "words" ki aar me koi bohat lamba payload na aa jaye. Bilkul yehi dono
    checks DB me bhi hain.
  */
  if (rawComment.length > 0) {
    if (countWords(rawComment) > COMMENT_MAX_WORDS) {
      errors.comment = [`Keep this to ${COMMENT_MAX_WORDS} words or fewer.`];
    } else if (rawComment.length > COMMENT_MAX_CHARS) {
      errors.comment = ["This comment is too long. Please shorten it."];
    } else {
      comment = rawComment;
    }
  }

  const criteria = await getReviewCriteria(category);
  if (criteria.length === 0) {
    return { errors: { _form: ["This profile cannot be reviewed yet."] } };
  }

  const answers: ParsedReview["answers"] = [];

  for (const criterion of criteria) {
    const raw = formData.get(`c_${criterion.key}`);
    const value = raw === null ? "" : raw.toString();

    if (criterion.kind === "star") {
      const star = Number(value);
      if (!Number.isInteger(star) || star < STAR_MIN || star > STAR_MAX) {
        errors[`c_${criterion.key}`] = [`Choose a rating from ${STAR_MIN} to ${STAR_MAX}.`];
        continue;
      }
      answers.push({ key: criterion.key, star });
    } else {
      if (value !== "yes" && value !== "no") {
        errors[`c_${criterion.key}`] = ["Choose yes or no."];
        continue;
      }
      answers.push({ key: criterion.key, yes: value === "yes" });
    }
  }

  if (Object.keys(errors).length > 0) return { errors };

  return { data: { overall, comment, answers } };
}

/** Person ki category DB se lo - client jo bheje us par bharosa nahi. */
async function getPersonContext(
  personId: string,
): Promise<{ category: Parameters<typeof getReviewCriteria>[0]; slug: string } | null> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("people")
      .select("slug, primary_category")
      .eq("id", personId)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data || !data.primary_category) return null;
    return { category: data.primary_category, slug: data.slug };
  } catch {
    return null;
  }
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

// -----------------------------------------------------------------------------
// Naya review
// -----------------------------------------------------------------------------
export async function submitReviewAction(
  _previous: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const personId = formData.get("personId");

  if (!isUuid(personId)) {
    return { ok: false, formError: GENERIC_ERROR };
  }

  // Sirf behtar message ke liye - asli check DB me hai.
  const session = await getCurrentUser();
  if (!session || !session.isVerified) {
    return { ok: false, formError: "Sign in with your university email to post a review." };
  }

  const person = await getPersonContext(personId);
  if (!person) {
    return { ok: false, formError: "That profile is not available." };
  }

  /*
    README §25: har review ek semester se bandhi hai, aur parhane walon ki
    review ek course se bhi. Yahan sirf shakal check hoti hai (uuid hai ya
    nahi). Jorha is banday ka hai ya nahi, yeh sirf DB tay karti hai.
  */
  const rawCourseId = formData.get("courseId");
  const rawSemesterId = formData.get("semesterId");
  const courseId = isUuid(rawCourseId) ? rawCourseId : null;
  const semesterId = isUuid(rawSemesterId) ? rawSemesterId : null;

  const needsCourse = categoryNeedsCourse(person.category);

  const contextErrors: Record<string, string[]> = {};
  if (!semesterId) {
    contextErrors.semesterId = ["Choose the semester this review is about."];
  }
  if (needsCourse && !courseId) {
    contextErrors.courseId = ["Choose the course this review is about."];
  }

  const parsed = await parseReviewForm(formData, person.category);
  if ("errors" in parsed) {
    const { _form, ...fieldErrors } = parsed.errors;
    const merged = { ...contextErrors, ...fieldErrors };
    return {
      ok: false,
      formError: _form?.[0],
      fieldErrors: Object.keys(merged).length > 0 ? merged : undefined,
    };
  }

  if (Object.keys(contextErrors).length > 0) {
    return { ok: false, fieldErrors: contextErrors };
  }

  try {
    const supabase = createSupabaseServerClient();

    const { error } = await supabase.rpc("submit_review", {
      p_person_id: personId,
      p_overall: parsed.data.overall,
      p_comment: parsed.data.comment,
      p_answers: parsed.data.answers,
      // Staff/HR par course bheja hi nahi jata; DB bhi isay girati hai.
      p_course_id: needsCourse ? courseId : null,
      p_semester_id: semesterId,
    });

    if (error) {
      return { ok: false, formError: safeMessage(error.message) };
    }
  } catch {
    return { ok: false, formError: GENERIC_ERROR };
  }

  revalidatePath(`/people/${person.slug}`);
  revalidatePath("/student");

  return { ok: true };
}

// -----------------------------------------------------------------------------
// Review edit
// -----------------------------------------------------------------------------
/*
  Course aur semester JAAN BOOJH KAR edit nahi hote. Yehi dono uniqueness ka
  scope hain (README §25) - inhein badalne dena "ek course, ek semester, ek
  review" wale rule me pichhle darwaze se ghusna hai. update_my_review in
  columns ko chhoota hi nahi, is liye form se kuch bhejna bekaar hai.
*/
export async function updateReviewAction(
  _previous: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const reviewId = formData.get("reviewId");
  const personId = formData.get("personId");

  if (!isUuid(reviewId) || !isUuid(personId)) {
    return { ok: false, formError: GENERIC_ERROR };
  }

  const person = await getPersonContext(personId);
  if (!person) {
    return { ok: false, formError: "That profile is not available." };
  }

  const parsed = await parseReviewForm(formData, person.category);
  if ("errors" in parsed) {
    const { _form, ...fieldErrors } = parsed.errors;
    return {
      ok: false,
      formError: _form?.[0],
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    };
  }

  try {
    const supabase = createSupabaseServerClient();

    const { error } = await supabase.rpc("update_my_review", {
      p_review_id: reviewId,
      p_overall: parsed.data.overall,
      p_comment: parsed.data.comment,
      p_answers: parsed.data.answers,
    });

    if (error) {
      return { ok: false, formError: safeMessage(error.message) };
    }
  } catch {
    return { ok: false, formError: GENERIC_ERROR };
  }

  revalidatePath(`/people/${person.slug}`);
  revalidatePath("/student");

  return { ok: true };
}

// -----------------------------------------------------------------------------
// Review hatao (soft delete - DB me status 'removed' hota hai)
// -----------------------------------------------------------------------------
export async function deleteReviewAction(
  _previous: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const reviewId = formData.get("reviewId");
  const slug = (formData.get("personSlug") ?? "").toString();

  if (!isUuid(reviewId)) {
    return { ok: false, formError: GENERIC_ERROR };
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("delete_my_review", { p_review_id: reviewId });

    if (error) {
      return { ok: false, formError: safeMessage(error.message) };
    }
  } catch {
    return { ok: false, formError: GENERIC_ERROR };
  }

  if (/^[a-z0-9-]+$/.test(slug)) {
    revalidatePath(`/people/${slug}`);
  }
  revalidatePath("/student");

  return { ok: true };
}
