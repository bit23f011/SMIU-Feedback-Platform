# ProfAura

Independent public review platform for **Sindh Madressatul Islam University (SMIU)** students.
Students give structured, anonymous reviews (star ratings plus yes/no answers) to teachers, lab
instructors, faculty, university staff and HR staff. One person equals one public profile.

Multi-university architecture from day one. SMIU is simply the first university in the data.

> **Status: Phases 1 to 7 code-complete.** The public directory, student authentication,
> reviews, search and rankings, the admin suite, a security-hardening and testing pass, and
> production preparation are all built. Database migrations are applied by the repository owner
> on Windows; see each phase document under `docs/`.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) plus TypeScript (strict) |
| Styling | Tailwind CSS v3.4 plus hand-written shadcn/ui primitives plus Lucide icons |
| Motion | Framer Motion (always behind `prefers-reduced-motion`) |
| Backend | Supabase: Postgres, Auth, Row Level Security |
| Validation | Zod (server-side, inside Server Actions) |
| Email | Brevo SMTP, configured in the Supabase dashboard |
| Anti-abuse | Cloudflare Turnstile on signup |
| Tests | Vitest (unit) plus Playwright (e2e skeleton) |

Forms use **Server Actions plus Zod**, not react-hook-form. That keeps validation on the server,
where it actually counts, and every form still works with JavaScript disabled.

---

## Getting started

```bash
npm install
cp .env.example .env.local     # phir real values bharo
npm run dev
```

Useful scripts:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
npm run build        # production build
npm run test         # vitest unit tests
npm run test:e2e     # playwright smoke (needs: npx playwright install)
npm run format       # prettier
```

Environment variables are documented in `.env.example`. Only `NEXT_PUBLIC_*` values ever reach
the browser. `SUPABASE_SERVICE_ROLE_KEY` is server-only and currently has **zero callers** in the
application code.

---

## Project layout

```
src/
  app/
    (public)/        public directory: home, 5 category pages, person profile, courses
    auth/            login, signup, verify-email, /auth/callback (own minimal layout)
    student/         signed-in student area (guarded by requireStudent)
    admin/           admin area, separate chrome (guarded by requireAdmin)
    error.tsx        route error boundary (generic message only)
    global-error.tsx root error boundary (self-contained, inline styles)
    robots.ts        crawl rules (private areas disallowed)
    sitemap.ts       public routes only
  components/
    brand/           logo plus Aura loader
    ui/              shadcn-style primitives (hand-written, no CLI)
    layout/          site header / footer / account menu
    theme/           Light / Dark / System theme provider plus no-flash script
    common/          empty, error, loading states, page header, rating stars
  features/
    auth/            schemas, server actions, session helpers, forms
    people/ directory/ courses/ home/ student/ admin/ notifications/
  lib/
    security/        Content-Security-Policy builder
    supabase/        browser client, server client, middleware helper, generated types
    env.ts           the only place env vars are read
supabase/
  migrations/        numbered SQL, applied in order by the owner
  seed/              optional demo data (never for production)
tests/               vitest unit tests (excluded from the app typecheck)
e2e/                 playwright smoke test skeleton
docs/                per-phase apply/verify checklists and audits
```

---

## Security model

The one rule everything else follows: **the frontend is never security. The database is the
final authority.**

Boundaries, weakest to strongest:

1. **`src/middleware.ts`** redirects signed-out visitors away from `/student` and `/admin`, and
   attaches a per-request Content-Security-Policy nonce. The redirect part is UX only; it checks
   for a cookie, nothing more.
2. **Server layouts** call `requireStudent()` / `requireAdmin()` from
   `src/features/auth/session.ts`. These run on the server and cannot be bypassed from the browser.
3. **Postgres RLS plus grants** are the real gate. Delete layers 1 and 2 and nobody can still read
   somebody else's row.

Standing practices in this codebase:

- `supabase.auth.getUser()` server-side, never `getSession()` (the latter trusts the cookie
  without verifying it).
- Every `SECURITY DEFINER` function carries `set search_path` and a matching
  `revoke all on function ... from public, anon, authenticated` before any grant.
- `profiles` has **no insert/update/delete grant or policy at all**. That structural absence is
  what makes it impossible for a user to promote themselves to admin.
- Review authorship is **structural anonymity**: the `reviews` table has no author column. The
  author link lives in a separate private `review_authors` table that not even an admin can read.
- A **k-anonymity brake** (bucket size of at least three) gates course and semester labels and
  per-criterion comparison values, so a thin bucket cannot be used to single out a reviewer.
- Errors shown to users are hand-written. Postgres/Supabase messages, stack traces, SQL and file
  paths never reach the client. `console.error` exists only in the two error boundaries and only
  under `NODE_ENV === "development"`.
- Response headers include nosniff, `X-Frame-Options: DENY`, a strict Referrer-Policy, a
  restrictive Permissions-Policy, HSTS with preload, and a nonce-based CSP (report-only by
  default, switchable to enforce via `CSP_ENFORCE`).
- No secrets in source. `.env.local` is gitignored; `.env.example` holds placeholders only.

Full detail lives in [`SECURITY.md`](SECURITY.md) and the phase audits under `docs/`.

---

## Build and roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Design system plus public directory | Done |
| 2 | Student auth plus university email verification | Done |
| 3 | Reviews: write, edit, display, aggregates, moderation text | Done |
| 4 | Search, filters, rankings, recommendations, favourites, compare | Done |
| 5 | Admin, moderation, notifications, reports, website feedback, content management | Done |
| 6 | Security hardening plus automated testing | Done |
| 7 | Production preparation plus deployment | Done (code) |
| 8 | Campus management, complaints, harassment and safety | Future, not started |

Per-phase records:

- [`docs/PHASE2_AUTH.md`](docs/PHASE2_AUTH.md)
- [`docs/PHASE3_VERIFICATION.md`](docs/PHASE3_VERIFICATION.md)
- [`docs/PHASE4_VERIFICATION.md`](docs/PHASE4_VERIFICATION.md)
- [`docs/PHASE5_VERIFICATION.md`](docs/PHASE5_VERIFICATION.md)
- [`docs/PHASE5_D_VERIFICATION.md`](docs/PHASE5_D_VERIFICATION.md)
- [`docs/PHASE6_SECURITY.md`](docs/PHASE6_SECURITY.md)
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- [`docs/FINAL_PROJECT_REVIEW.md`](docs/FINAL_PROJECT_REVIEW.md)

---

## Deployment

Production runs on Vercel with a Supabase production project, Brevo SMTP for verification email,
Cloudflare (DNS plus Turnstile), and environment variables set in the Vercel dashboard. The full
step-by-step is in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Production must contain no real
secrets in source; every secret is an environment variable.

---

## Conventions

- Code comments are written in **Roman Urdu with simple English technical words**. Identifiers,
  database columns, UI text, documentation and public content stay in standard English.
- No em dashes anywhere, including code comments. Use hyphens.
- Migrations are numbered by timestamp and applied in order. They are never edited after being
  applied; a correction becomes a new additive migration.
- Git is handled manually by the repository owner.
