# Production deployment guide

This is the step-by-step for taking ProfAura to production. It assumes the code is already
complete (Phases 1 to 7) and that database migrations are applied by the repository owner. The
guiding rule throughout: **production contains no real secrets in source**. Every secret is an
environment variable set in the hosting dashboard.

## Overview of the production stack

| Piece | Role |
|---|---|
| Vercel | Hosts the Next.js app, builds on push, holds runtime environment variables |
| Supabase (production project) | Postgres, Auth, Row Level Security, storage |
| Brevo | SMTP provider for verification email, wired into Supabase Auth |
| Cloudflare | DNS for the custom domain, plus Turnstile for signup anti-abuse |
| Turnstile | Bot challenge on the signup form |

## 1. Supabase production project

1. Create a new Supabase project for production (separate from any development project).
2. Apply the migrations in `supabase/migrations/` in filename order, on Windows, using the owner's
   normal workflow. Do not reset the database, do not rerun an already-applied migration, and do
   not run `supabase db push` against a database that already has these objects.
3. Confirm Row Level Security is enabled on every table (it is defined in the migrations; verify
   in the dashboard).
4. Do not use the demo seed in `supabase/seed/` on production. It exists for local demonstration
   only.
5. Copy the production project URL and the anon (publishable) key for the environment variables
   below. The service-role key is not used by the app and should never be placed in a
   `NEXT_PUBLIC_*` variable.

## 2. Brevo SMTP

1. Create a Brevo account and generate an SMTP key.
2. In the Supabase dashboard, under Authentication and SMTP settings, enter the Brevo host, port,
   login and key, and set the from-address and from-name.
3. Send a test verification email and confirm delivery and the from-identity.

## 3. Cloudflare and Turnstile

1. Point the custom domain's DNS at Vercel per Vercel's domain instructions.
2. Create a Turnstile widget for the production domain. Keep the site key (public) and secret key
   (server-only) for the environment variables below.
3. Leave the Permissions-Policy and CSP as configured; the CSP already allows the Turnstile
   origin.

## 4. Environment variables (set in Vercel)

Set these in the Vercel project settings, not in source. Names match `.env.example`.

```
NEXT_PUBLIC_SITE_URL              https://your-production-domain
NEXT_PUBLIC_SUPABASE_URL          https://your-prod-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     the production anon/publishable key
NEXT_PUBLIC_TURNSTILE_SITE_KEY    the production Turnstile site key
TURNSTILE_SECRET_KEY              the production Turnstile secret (server-only)
CSP_ENFORCE                       false at first, then true after step 6
```

Do not set `SUPABASE_SERVICE_ROLE_KEY` unless a server-only feature later needs it; the app does
not use it today.

## 5. First deploy

1. Push to the branch Vercel builds, or trigger a deploy. (Git is handled manually by the owner.)
2. Confirm the build succeeds and the site loads on the production domain.
3. Smoke test: home page loads, a category page loads, signup with a university email reaches the
   verify screen, and `/admin` is not reachable while signed out.

## 6. Turn the CSP from report-only to enforce

1. With `CSP_ENFORCE=false`, open the site and browse every major page (home, a category, a
   profile, signup, login, the student area, the admin area). Watch the browser console for CSP
   violation reports.
2. If a legitimate resource is being reported, adjust the policy in `src/lib/security/csp.ts` with
   a new deploy, then recheck. Do not add `unsafe-inline` to `script-src`.
3. When no legitimate resource is reported, set `CSP_ENFORCE=true` and redeploy. Browse the same
   pages again to confirm nothing broke.

## 7. Post-launch checks

- Verify the security headers on a production URL (nosniff, frame DENY, HSTS, CSP present).
- Confirm `robots.txt` disallows `/admin`, `/student`, `/auth` and `/api`, and that `sitemap.xml`
  lists only public routes.
- Confirm error pages show a generic message with only a reference code, never a stack trace.
- Run `npm audit` and review any dependency advisories.
- Optionally wire an error monitor (the error boundaries already have a `TODO` marker for it).

## Rollback

Vercel keeps previous deployments. If a deploy misbehaves, promote the last known-good deployment
while investigating. Because there is no destructive database step in a normal app deploy, a code
rollback does not touch data.
