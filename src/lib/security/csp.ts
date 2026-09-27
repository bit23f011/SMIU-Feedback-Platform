/*
  Content-Security-Policy builder (Phase 7).

  Maqsad: XSS ka asli rasta script injection hai, is liye script-src par sakhti
  aur baaqi par sirf utni chhoot jitni app ko chahiye.

  Design:
   - script-src: 'nonce-<per-request>' + 'strict-dynamic'. Har request par naya
     nonce middleware banata hai. Next apne framework scripts par yehi nonce laga
     deta hai (jab request header me CSP mil jaye), aur hamari ek hi inline script
     (ThemeScript) ko bhi nonce milta hai. 'strict-dynamic' ke hote hue host-list
     aur 'self' modern browser ignore karta hai - is liye script-src me host
     daalne ka faida nahi, trust sirf nonce se aage badhta hai.
   - style-src: 'unsafe-inline'. framer-motion animation ke liye inline style
     attributes likhta hai; style attributes par nonce kaam nahi karta. Style
     injection ka khatra script ke muqable bahut kam hai, is liye yeh trade-off
     theek hai.
   - connect/frame-src: Supabase (REST + realtime websocket) aur Turnstile ke
     origins, taake browser client aur captcha chal sakein.

  Rollout: DEFAULT report-only hai (site kabhi break na ho). Owner jab production
  build me verify kar le ke koi legit resource block nahi ho raha, to server env
  CSP_ENFORCE=true set kar ke enforce mode on kare. Report-only me browser sirf
  violation report karta hai, kuch block nahi karta.
*/

export interface CspHeader {
  /** Enforce ya report-only - dono ka header naam alag hota hai. */
  header: "Content-Security-Policy" | "Content-Security-Policy-Report-Only";
  /** Poori policy string. */
  value: string;
}

const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

// Supabase project ka https origin + uska websocket (realtime) origin.
// Env missing ho to sirf 'self' - taake build/preview tabhi bhi na tootay.
function supabaseConnectOrigins(): string[] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return [];
  const wss = url.replace(/^https:/i, "wss:");
  return url === wss ? [url] : [url, wss];
}

export function buildContentSecurityPolicy(nonce: string): CspHeader {
  const isProd = process.env.NODE_ENV === "production";

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...supabaseConnectOrigins(), TURNSTILE_ORIGIN],
    "frame-src": [TURNSTILE_ORIGIN],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    // Empty directive = flag only.
    "upgrade-insecure-requests": [],
  };

  // Dev me Next Fast Refresh ko 'unsafe-eval' chahiye; production build me nahi.
  if (!isProd) {
    directives["script-src"].push("'unsafe-eval'");
  }

  const value = Object.entries(directives)
    .map(([key, sources]) => (sources.length ? `${key} ${sources.join(" ")}` : key))
    .join("; ");

  const enforce = process.env.CSP_ENFORCE === "true";
  return {
    header: enforce ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
    value,
  };
}
