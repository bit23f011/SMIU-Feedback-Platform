# ProfAura final project review

Date: 2026-09-27
Scope: end-to-end review of ProfAura across Phases 1 to 7, at the point where all
seven phases are code-complete. This document summarizes what was built, what was
verified, what is enforced where, and what the project owner still needs to do
before and after launch. It is written to be read on its own.

## 0. Honest scope statement

This review does not claim the system is perfectly secure or bug-free. No review
can. What it does is state what exists, show where each control is actually
enforced, record what was checked, and name the open items so they are not lost.
The security detail behind the summaries here lives in `docs/PHASE6_SECURITY.md`
and `SECURITY.md`; this document ties the whole project together.

## 1. What ProfAura is

An independent public review platform for Sindh Madressatul Islam University
(SMIU). Verified students post structured, anonymous reviews (a 1 to 5 overall
rating, four star criteria, and two yes/no questions per category) about
teachers, lab instructors, faculty, university staff and HR staff. One real
person maps to one public profile. The data model is multi-university from the
start; SMIU is simply the first university seeded.

Stack: Next.js 14 App Router with strict TypeScript, Tailwind v3.4 with
hand-written shadcn-style primitives, Framer Motion behind `prefers-reduced-motion`,
Supabase (Postgres, Auth, RLS), Zod inside Server Actions, Brevo SMTP for
verification email, and Cloudflare Turnstile on signup.

## 2. Phase-by-phase status

| Phase | Scope | Status | Record |
|---|---|---|---|
| 1 | Design system and public directory | Done | README |
| 2 | Student auth and university email verification | Done | docs/PHASE2_AUTH.md |
| 3 | Reviews: write, edit, display, aggregates, text moderation | Done | docs/PHASE3_VERIFICATION.md |
| 4 | Search, filters, rankings, recommendations, favourites, compare | Done | docs/PHASE4_VERIFICATION.md |
| 5 | Admin, moderation, notifications, reports, feedback | Done | docs/PHASE5_VERIFICATION.md |
| 5 D | Reference-data and people content management, student and audit viewers | Done | docs/PHASE5_D_VERIFICATION.md |
| 6 | Security hardening and automated testing | Done | docs/PHASE6_SECURITY.md |
| 7 | Production preparation and deployment | Done (code) | this doc, docs/DEPLOYMENT.md |
| 8 | Campus management, complaints, harassment and safety | Not started (future) | PRD section 100 |

## 3. Architecture and the security boundary

The governing rule is that the frontend is never the security boundary; the
database is the final authority. Three layers, weakest to strongest:

1. Middleware (`src/middleware.ts`) refreshes the Supabase session, redirects
   signed-out visitors away from `/student` and `/admin`, and now also attaches a
   per-request Content-Security-Policy nonce. The redirect is user experience
   only (it checks for a cookie, never a role).
2. Server guards (`requireStudent()`, `requireAdmin()`) run inside server
   layouts and cannot be bypassed from the browser.
3. Postgres RLS and grants are the real gate. Every write goes through a
   `SECURITY DEFINER` RPC that checks `is_admin()` or `auth.uid()` first; no
   client role holds a direct insert/update/delete grant on a protected table.

This layering was checked from an attacker's perspective in Phase 6 across
roughly eighteen vectors (role escalation, non-university signup, IDOR on
edit/delete, beating the edit limit by delete-and-repost, duplicate reviews,
posting while a feature is paused, reading hidden reviews, XSS, SQL injection,
cookie tampering, admin-RPC access, clickjacking, error and stack-trace leaks,
and the k-anonymity brake). All were found closed at the database or
server-action layer.

## 4. Privacy and anonymity

Anonymity is structural, not merely a policy toggle:

- The `reviews` table has no author column. Nothing in a public review row
  identifies its writer.
- The account-to-review link lives in a separate private `review_authors` table
  whose RLS allows only the owner to read their own rows, with no grant to `anon`
  and deliberately no admin policy. An administrator cannot read who wrote a
  review.
- A k-anonymity brake (bucket size of at least three) gates course and semester
  labels and per-criterion comparison values, so a thin bucket cannot single out
  a reviewer.
- Reporter and website-feedback sender identities are stripped from what an
  administrator sees.
- `profiles` stores no name or student id, and has no insert/update/delete grant
  or policy, which is what structurally prevents self-promotion to admin.

The honest limit: if a student types self-identifying details into a free-text
comment, those details are visible. `PRIVACY.md` states this plainly.

## 5. Production readiness (Phase 7)

Added or confirmed in this phase:

- Nonce-based Content-Security-Policy built in `src/lib/security/csp.ts` and wired
  through middleware, the Supabase middleware helper, the root layout, and the
  theme no-flash script. It ships report-only by default and switches to enforce
  with `CSP_ENFORCE=true` after the owner verifies a production build. This was
  deliberately not enforced blind, because that risks breaking hydration and the
  theme script without a real build test.
- Existing hardening confirmed: nosniff, `X-Frame-Options: DENY`, strict
  Referrer-Policy, a restrictive Permissions-Policy, HSTS with preload, and
  `poweredByHeader: false` in `next.config.mjs`.
- SEO confirmed: `robots.ts` disallows `/admin`, `/student`, `/auth`, `/api`;
  `sitemap.ts` lists only public routes that all resolve; root metadata has
  `metadataBase`, Open Graph and Twitter cards, plus OG and Twitter images and a
  web manifest.
- Error handling confirmed: route and root error boundaries show only a generic
  message and an opaque digest; `console.error` appears only in those boundaries
  and only in development.
- Documentation: `README.md` rewritten for all seven phases, plus new
  `SECURITY.md`, `PRIVACY.md`, and `docs/DEPLOYMENT.md`. `.env.example` documents
  every variable including the new `CSP_ENFORCE`.

## 6. Testing

A test harness exists (Vitest for unit, Playwright for an e2e smoke skeleton).
Unit tests cover the security-meaningful pure logic: id and slug validators, the
admin error-leak defence, the auth Zod schemas, list-URL building, and the admin
type guards that convert untrusted search params into trusted values. The test
folders are excluded from the app typecheck on purpose so the app build stays
clean without the test tooling installed.

Important limit: the tests were authored but could not be executed in the build
sandbox because the package registry is blocked there. They must be run on
Windows before the project is considered signed off.

## 7. Content and language compliance

- No em dash appears anywhere, including code comments; hyphens are used
  throughout.
- Roman Urdu appears only inside source-code comments. All UI text, database
  labels, help text, validation messages, documentation and public content are in
  English.
- The only non-ASCII characters in scope are the allowed section sign and a
  middot in the page-title template.

## 8. What was verified here versus what the owner must run

Verified in the sandbox this phase:

- `npx tsc --noEmit` exits 0.
- `npx next lint --dir src` reports no warnings or errors.
- Content-rule sweep across every new and edited file passes.
- The demo review comment length satisfies the database constraint, and the seed
  targets the correct schema columns.

The owner must run on Windows (the sandbox cannot install packages, build, run
the test runners, or reach the database):

1. `npm install`, then `npm run test`, `npx playwright install`, `npm run build`,
   and `npm audit`.
2. Apply migrations only through the normal Windows workflow, in filename order.
   Do not reset the database, do not rerun an applied migration, and do not run
   `supabase db push` against a database that already has these objects.
3. Optionally load `supabase/seed/seed_dev.sql` then `supabase/seed/demo_review.sql`
   on a development project to see one complete review end to end. Never seed
   production.
4. Follow `docs/DEPLOYMENT.md` to stand up Vercel, the Supabase production
   project, Brevo SMTP, Cloudflare and Turnstile, set environment variables, and
   flip the CSP to enforce after a clean report-only pass.

## 9. Open items

These are real and are the honest boundary of the current state:

1. CSP is report-only until the owner verifies a production build and sets
   `CSP_ENFORCE=true`.
2. Automated tests are authored but not yet executed; they must pass on Windows.
3. Auth-attempt rate limiting relies on Supabase provider defaults; add an
   explicit limiter if abuse is observed. New-review creation already has a
   server-side daily limit.
4. `feature_enabled()` fails open when a flag row is missing, which is the right
   default for availability switches but should be made fail-closed for any key
   later used as a hard security gate.
5. An error monitor (for example Sentry) is not wired; the error boundaries carry
   a marked hook for it.
6. `.fuse_hidden*` editor artifacts on disk are gitignored but not deleted; the
   owner can remove them on Windows.

## 10. Overall assessment

ProfAura is a coherent, security-first build. The controls that matter most for
this product, review anonymity, authorization, and account integrity, are
enforced at the database and server-action layer rather than in the browser, and
they held under an attacker-perspective review. Phase 7 closes the last major
hardening gap by adding a nonce-based CSP (staged safely as report-only) and
ships the production and legal documentation. The remaining work is operational:
run the tests and the build on Windows, apply migrations through the normal
workflow, deploy per the checklist, and turn the CSP to enforce after a clean
pass. With those steps done, the platform is ready for a controlled launch.
