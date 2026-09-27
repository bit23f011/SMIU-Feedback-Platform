/** @type {import('next').NextConfig} */

// ProfAura Next.js config
// Yahan sirf safe, non-breaking security headers set kar rahe hain.
// NOTE: Full restrictive nonce-based CSP Phase 6 (security hardening) mein
// middleware ke through aayegi taake Next ke inline scripts nonce ke saath chalein.
const securityHeaders = [
  // Browser ko MIME-type sniff karne se roko
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking se bachao - kisi frame me embed na ho
  { key: "X-Frame-Options", value: "DENY" },
  // Referrer sirf zaroorat bhar bhejo (privacy)
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Powerful browser features by default band
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // HTTPS enforce (Vercel/Cloudflare production par)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  reactStrictMode: true,
  // X-Powered-By header hata do - stack info leak avoid
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
