/*
  Env access - typed + fail-loud.
  NOTE: NEXT_PUBLIC_* variables build-time par inline hote hain, isliye inhe
  poore literal `process.env.NEXT_PUBLIC_...` ke tor par likhna zaroori hai.
  Server-only secrets (service role, Brevo) sirf runtime par access karo,
  taake sirf public envs se bhi `next build` fail na ho.
*/

function required(name: string, value: string | undefined): string {
  if (value == null || value.length === 0) {
    throw new Error(
      `[env] Missing required environment variable: ${name}. .env.example dekhein aur .env.local set karein.`,
    );
  }
  return value;
}

// Public (browser-safe) envs. Yeh build me inline ho jaate hain.
export const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
} as const;

// Supabase client ko chahiye url + anon key (dono public). Missing par saaf error.
export function getSupabaseClientEnv(): { url: string; anonKey: string } {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

/*
  service_role key ka koi accessor yahan JAAN BOOJH KAR nahi hai.

  Yeh file client bundle me bhi jati hai (`getSupabaseClientEnv()` browser
  client ko chahiye). Us file me sab se taqatwar secret ka darwaza rakhna sirf
  intezaar hai ke koi din galti se usay client component me import kar de.

  ProfAura ko abhi service_role ki zaroorat hai bhi nahi: har privileged kaam
  SECURITY DEFINER function ke andar hota hai jo khud `is_admin()` ya
  `auth.uid()` check karti hai. Agar kabhi wakai zaroorat pare, usay ek alag
  server-only module me rakhna, is file me nahi.
*/
