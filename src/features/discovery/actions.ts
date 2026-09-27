"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FavoriteState } from "@/features/discovery/types";

/*
  Phase 4 ke writes: sirf do, aur dono zaati (README §45, §46).

  ASOOL (§30): yeh file kuch "allow" nahi karti. Dono DB functions khud
  `auth.uid()` parhti hain aur logged-out call par kuch nahi karti. anon ko in
  functions ka EXECUTE grant hi nahi diya gaya. Is file ko poora hata dene se
  bhi koi banda doosre ki list nahi chhu sakta.

  DOOSRA ASOOL: raw DB error kabhi user tak nahi jata. Neeche ek chhoti si
  allow-list hai; baaki sab ek aam sa message ban jata hai.
*/

const GENERIC_ERROR = "We could not update your saved list right now.";

const SAFE_DB_MESSAGES = new Set<string>([
  "Sign in to save a profile.",
  "That profile is not available.",
]);

function safeMessage(message: string | undefined): string {
  return message && SAFE_DB_MESSAGES.has(message) ? message : GENERIC_ERROR;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Profile ko save ya unsave karna.
 *
 * DB ek boolean wapas karti hai: ab saved hai ya nahi. Is liye UI ko dobara
 * poochhne ki zaroorat nahi, aur do tab khule hon to bhi halat theek rehti hai.
 */
export async function toggleFavoriteAction(
  previous: FavoriteState,
  formData: FormData,
): Promise<FavoriteState> {
  const personId = String(formData.get("personId") ?? "");

  if (!UUID_PATTERN.test(personId)) {
    return { saved: previous.saved, error: GENERIC_ERROR };
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("toggle_favorite", {
      p_person_id: personId,
    });

    if (error) {
      return { saved: previous.saved, error: safeMessage(error.message) };
    }

    /*
      Fixed paths revalidate hote hain, client se aaya hua koi path nahi.
      "/people/[slug]" ke saath "page" dena Next ko kehta hai ke us route ke
      saare pages taaza karo, is liye slug client se lena bhi nahi parta.
    */
    revalidatePath("/student/favorites");
    revalidatePath("/people/[slug]", "page");

    return { saved: Boolean(data), error: null };
  } catch {
    return { saved: previous.saved, error: GENERIC_ERROR };
  }
}

/**
 * Recently viewed me ek profile darj karna (README §46).
 *
 * Yeh khamoshi se nakaam hoti hai. Profile dekhna har kisi ka haq hai; agar
 * history save na ho saki to user ko koi error nahi dikhana chahiye. Logged-out
 * banday ke liye DB function khud kuch nahi karta.
 */
export async function recordPersonViewAction(personId: string): Promise<void> {
  if (!UUID_PATTERN.test(personId)) return;

  try {
    const supabase = createSupabaseServerClient();
    await supabase.rpc("record_person_view", { p_person_id: personId });
  } catch {
    // Jaan boojh kar khamosh: yeh sirf soolat hai, page ka hissa nahi.
  }
}
