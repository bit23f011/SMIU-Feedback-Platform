# Security policy

This document describes how SMIU Feedback Platform is secured and how to report a problem. It does not claim
the system is perfectly secure; it states the controls that exist and where the real boundary is.

## Reporting a vulnerability

If you believe you have found a security or privacy issue, please contact the repository owner
privately before disclosing it publicly. Include the steps to reproduce, the impact you observed,
and any accounts or URLs involved. Please do not open a public issue for a suspected
vulnerability, and please do not run automated scanners against the production site without
prior agreement.

We will acknowledge a valid report, investigate, and fix confirmed issues as a priority. There is
no bug-bounty program at this time.

## Security model in one line

The frontend is never the security boundary. The database is the final authority. Every control
below is enforced server-side, in Postgres Row Level Security or in a server action, so the
browser cannot reach around it.

## Layers, weakest to strongest

1. **Middleware** (`src/middleware.ts`) redirects signed-out visitors away from `/student` and
   `/admin` and attaches a per-request CSP nonce. The redirect is user experience only: it checks
   whether a session cookie exists, never a role. Removing it does not expose anyone's data.
2. **Server guards** (`requireStudent()`, `requireAdmin()`) run inside server layouts. They cannot
   be bypassed from the browser.
3. **Postgres RLS and grants** are the real gate. Even with layers 1 and 2 removed, a user cannot
   read another user's protected row.

## Authentication and accounts

- Sign-up is restricted to university email domains by a `BEFORE INSERT` trigger on `auth.users`,
  so a direct call to the Supabase API is blocked just like the form. The trigger fails closed
  when a university lists no domains.
- The profile row is created by an `AFTER INSERT` trigger that hardcodes the role to `student` and
  ignores any client-supplied metadata. There is no code path for a user to set their own role.
- Verification uses exactly one email per sign-up. There is no resend action by design.
- Sign-up and sign-in never reveal whether an account exists: sign-up always lands on the same
  verify screen, and sign-in returns one identical message for every kind of failure.
- Session verification uses `supabase.auth.getUser()` (a server check), never `getSession()`.

## Authorization

- Admin RPCs check `is_admin()` as their first statement and are revoked from `public`, `anon`
  and `authenticated` before being granted only to `authenticated`. Admin routes also sit behind
  `requireAdmin()` as defence in depth on top of the RPC gate.
- `profiles` has no insert, update or delete grant or policy. This structural absence is what
  prevents self-promotion to admin.
- Every `SECURITY DEFINER` function sets an explicit `search_path` and carries a matching
  `revoke ... from public, anon, authenticated` before its grant.

## Review privacy and anonymity

- Anonymity is **structural**, not just policy. The `reviews` table has no author column. The link
  between a review and its author lives in a separate private `review_authors` table whose RLS is
  `author_id = auth.uid()`, with no grant to `anon` and deliberately no admin policy, so an admin
  cannot read who wrote a review either.
- One person can review a given profile once (`unique (author_id, person_id)`), and a soft-deleted
  review keeps that mapping so the edit limit cannot be reset by delete-and-repost.
- A **k-anonymity brake** requires at least three reviews in a bucket before a course or semester
  label, or a per-criterion comparison value, is exposed. Thin buckets cannot single out a
  reviewer.
- Reporter and website-feedback sender identities are stripped from what an admin sees.

## Feature controls

Four platform switches (review submission, review editing, student signup, email domain lock) are
enforced inside the database functions and triggers, not just hidden in the UI. The client flag
query only decides whether to show a button.

## Transport and browser hardening

Response headers set in `next.config.mjs` and `src/middleware.ts`:

- `Content-Security-Policy` (nonce-based; report-only by default, enforce via `CSP_ENFORCE=true`)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` disabling camera, microphone, geolocation and browsing-topics
- `Strict-Transport-Security` (two years, `includeSubDomains`, `preload`)
- `X-Powered-By` removed

## Error and secret hygiene

- Users only ever see hand-written generic messages. Postgres and Supabase text, stack traces, SQL
  and file paths never reach the client. Error boundaries expose only Next's opaque `digest`.
- `console.error` appears only in the two error boundaries and only under
  `NODE_ENV === "development"`.
- No secrets live in source. Every `process.env` reference in `src` is `NEXT_PUBLIC_*`. The
  service-role key has no accessor in the app layer. `.env.local` is gitignored; `.env.example`
  holds placeholders only.

## Known limitations

- The CSP ships in report-only mode by default. It must be verified against a production build and
  then switched to enforce with `CSP_ENFORCE=true`.
- Rate limiting is enforced for new-review creation. Authentication attempts rely on the Supabase
  Auth provider defaults; add an explicit limiter if abuse is observed.
- `feature_enabled()` fails open (returns true) when a flag row is missing. That is the intended
  default for availability switches; a key used as a hard security gate should be made fail-closed.

See `docs/PHASE6_SECURITY.md` and `docs/FINAL_PROJECT_REVIEW.md` for the audit detail behind this
summary.
