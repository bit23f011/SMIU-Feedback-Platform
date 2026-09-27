import { cache } from "react";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

/*
  Session helpers - server-side authorization ka waahid darwaza.

  RULES:
   - Hamesha `supabase.auth.getUser()` use karo, `getSession()` NAHI.
     getSession() cookie ka data bina verify kiye wapas de deta hai; getUser()
     Supabase se token verify karwata hai. Server par sirf verified data chalega.
   - Yeh helpers convenience hain, security boundary NAHI. Asli boundary RLS hai:
     agar yeh helper bhool bhi jayein, DB phir bhi ghalat row wapas nahi karegi.
   - `cache()` React ka per-request dedupe hai. Ek hi request me layout + page
     dono `getCurrentUser()` bulayein to network call sirf ek dafa jati hai.
*/

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface SessionUser {
  user: User;
  profile: Profile | null;
  /** auth.users.email_confirmed_at set hai ya nahi. */
  isVerified: boolean;
}

/** Logged-in user + uska profile. Logged out par null. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // RLS khud hi is user ko sirf apni row dikhati hai.
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    profile: profile ?? null,
    isVerified: Boolean(user.email_confirmed_at),
  };
});

/** Sirf verified + active student. Warna redirect. */
export async function requireStudent(): Promise<SessionUser> {
  const session = await getCurrentUser();

  if (!session) redirect("/auth/login?next=/student");

  // Account bana liya magar email confirm nahi kiya.
  if (!session.isVerified) redirect("/auth/verify-email");

  // Profile trigger se banti hai; na ho ya band ho to student area nahi milega.
  if (!session.profile || !session.profile.is_active) redirect("/auth/login");

  return session;
}

/** Sirf active admin. Warna 404-jaisa behaviour (admin area ka wujood chhupana). */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await getCurrentUser();

  if (!session) redirect("/auth/login?next=/admin");

  if (
    !session.isVerified ||
    !session.profile ||
    session.profile.role !== "admin" ||
    !session.profile.is_active
  ) {
    // Jaan boojh kar "not allowed" page nahi - admin area ka pata hi na chale.
    redirect("/");
  }

  return session;
}

/*
  Navbar ke liye chhota sa summary.

  Sirf wahi cheezein bhejte hain jo header ko chahiye (email + admin flag),
  poora user object client tak nahi jata. Unverified user ko "signed out"
  dikhate hain - kyunki wo abhi kuch kar bhi nahi sakta.
*/
export async function getHeaderAccount(): Promise<{ email: string; isAdmin: boolean } | null> {
  const session = await getCurrentUser();

  if (!session || !session.isVerified) return null;
  if (!session.profile || !session.profile.is_active) return null;

  return {
    email: session.profile.email,
    isAdmin: session.profile.role === "admin",
  };
}
