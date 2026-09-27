# Phase 6 verification record: security hardening and testing

Date: 2026-09-27
Scope: Phase 6 (README PRD section 98) - security hardening and a first
automated test harness for ProfAura. This phase adds tests and audits the
existing code. It does NOT change any application behaviour and it introduces
no new database migration.

## 0. Honest scope statement

This document records what was checked and what was changed. It does not claim
the system is "100 percent secure". No audit can prove the absence of every
flaw. What it can do is state the controls that exist, show they hold at the
places an attacker would push, list the one change that was made, and name the
gaps that are still open so they are not forgotten. Read section 8 for the
open items.

## 1. What changed in Phase 6

No database migration was written in this phase. The attacker-perspective
review (section 6) did not find a database issue that needed a corrective
migration, so the newest migration on disk is still the Phase 5 D pair
(`20260926090000` and `20260926091000`), which the owner applies separately.

Application and tooling files added or edited:

```
vitest.config.ts          new   unit-test runner config (jsdom, "@" alias, react plugin)
playwright.config.ts      new   e2e runner config (skeleton, chromium)
tests/unit/*.test.ts      new   four pure-logic unit test files
e2e/smoke.spec.ts         new   public smoke test skeleton
package.json              edit  test / test:watch / test:e2e scripts + dev deps
tsconfig.json             edit  exclude tests, e2e, and the two runner configs
.gitignore                edit  ignore .fuse_hidden* editor artifacts (the one fix)
```

None of these touch the running app, the database, or any server action. The
test folders are excluded from the app typecheck on purpose (see section 2), so
the app build is unaffected.

## 2. Test harness

Two runners were set up.

Vitest (unit) covers pure, import-safe logic that carries a security or
correctness meaning. These functions were chosen because they normalize or
gate untrusted input and can be tested without a database or network:

* `src/features/admin/shared.ts` - `isUuid`, `isSlug`, and `pickSafeMessage`.
  The last is the admin error-leak defence: only an allow-listed message reaches
  the user, everything else collapses to a single generic string.
* `src/features/auth/schemas.ts` - `studentIdSchema`, `studentIdToEmail`,
  `signUpSchema`, `signInSchema`. These prove the student id shape, the fact
  that the email domain is system-supplied and never taken from user input, the
  password match and length rules, and that sign-in deliberately does not leak
  account existence through a length or pattern error.
* `src/features/discovery/pagination.tsx` - `pageHref`, which builds list URLs
  from untrusted filter values.
* `src/features/admin/people/types.ts` and `.../students/types.ts` - the enum
  and status type guards that convert untrusted `searchParams` into trusted
  values.

Playwright (e2e) has a skeleton smoke test only: the home page loads and shows
the brand, and `/admin` is not reachable without signing in. This is an outer
behaviour check, not a substitute for the database controls in section 6.

Important: the unit tests could not be executed in the build sandbox because the
package registry is blocked there (HTTP 403), so the test dependencies cannot be
installed here. The tests were written against the exact exported signatures of
the functions under test. The owner runs them on Windows (section 9).

The app typecheck stays green because `tsconfig.json` now excludes `tests`,
`e2e`, `vitest.config.ts`, and `playwright.config.ts`. Without that, the app
`tsc --noEmit` would try to type the test files against tools that are not
installed and would fail.

## 3. Automated checks

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | exit 0 |
| Lint | `npx next lint --dir src` | no warnings, no errors |
| Unit tests | `npm run test` | must be run on Windows (deps not installable in sandbox) |
| Production build | `npm run build` | must be run on Windows (registry blocked in sandbox) |
| Dependency audit | `npm audit` | must be run on Windows |

Content rules across the new files: no em dash, and no non-ASCII beyond the
allowed section sign. Roman Urdu appears only inside code comments.

## 4. Secret and configuration audit

| Area | What was checked | Finding |
| --- | --- | --- |
| Hardcoded secrets | Full scan of `src`, `supabase`, and config for JWTs (`eyJ...`), API keys, and password literals | None found. |
| Client env surface | Every `process.env.*` reference in `src` | All are `NEXT_PUBLIC_*` (site url, Supabase url, Supabase anon key, Turnstile site key). No server secret is referenced in `src`, so none can be inlined into the browser bundle. |
| Service role | Any use of the Supabase service-role key in the app | None. `src/lib/env.ts` deliberately exposes no service-role accessor and documents why. There is no edge-function directory. Every data path uses the anon-key client and goes through a `SECURITY DEFINER` RPC that checks `is_admin()` or `auth.uid()`. |
| `.env` handling | `.env.local` contents and `.gitignore` | `.env.local` holds only the two public Supabase values. `.env.example` holds placeholders only. `.gitignore` ignores `.env`, `.env*.local`, build output, `*.tsbuildinfo`, `*.pem`, `.vercel`, the test output folders, and `supabase/.temp`. |
| Supabase CLI temp | `supabase/.temp` | Contains CLI metadata only (project ref, versions, pooler url), and is gitignored. No secret material was present. |
| Response headers | `next.config.mjs` | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, `Strict-Transport-Security` (two years, preload), and `poweredByHeader: false`. See section 8 for the missing Content-Security-Policy. |

## 5. Personal data and anonymity flow

| Data | Where it flows | Finding |
| --- | --- | --- |
| Student email | Admin students viewer (gated), the account owner's own menu, and the student layout | Email reaches only an admin (through a gated RPC) and the signed-in owner. The account menu shows only the local part in its trigger. The verify-email screen never prints the address. |
| Reporter / feedback sender identity | Report queue and website-feedback queue | Not returned. The queries strip student id, email, and auth id from what the admin sees (README section 58). |
| Review authorship | Public profile, my-reviews, admin moderation | Anonymity is structural, not just policy. The `reviews` table has no author column at all. The author link lives in a separate private table `review_authors` with RLS `using (author_id = auth.uid())`, no grant to `anon`, and deliberately no admin policy, so an admin cannot read who wrote a review either. No code in `src` selects from `review_authors` directly, and no review-returning function references an author column. |
| Course and semester labels | Public profile and comparison | k-anonymity brake of at least three reviews before a course or semester label or a per-criterion comparison value is exposed (`bucket_size >= 3`), so a thin bucket cannot be used to single out a reviewer. |

## 6. Attacker-perspective audit

Each row is a thing an attacker would try, what was verified in the code, and
the result. "Closed" means the control sits server-side, in the database or in
a server action, where the browser cannot reach around it.

| Attempt | What was verified | Result |
| --- | --- | --- |
| Make myself an admin (role escalation) | `profiles` has RLS on and only a `select` grant. There is no insert, update, or delete grant or policy, so no user can write their own `role`. `handle_new_user()` hardcodes `role = 'student'` and ignores signup metadata. `is_admin()` reads the role from `profiles` for `auth.uid()`, not from a client-settable claim. | Closed |
| Sign up with a non-university email | `enforce_university_email()` is a BEFORE INSERT trigger on `auth.users`, so it fires even for a direct Supabase auth API call, not only the form. Generic rejection message, no domain enumeration. | Closed |
| Pretend to be verified | `is_verified_student()` reads `auth.users.email_confirmed_at` plus active student role. Verification is not duplicated into a spoofable column. | Closed |
| Edit or delete someone else's review (IDOR) | `update_my_review` and `delete_my_review` scope ownership through `review_authors.author_id = auth.uid()`. A non-owner id returns the same generic "not available" message as a missing id, so review ids cannot be probed. | Closed |
| Beat the edit limit by deleting and reposting | `delete_my_review` is a soft delete (`status = 'removed'`) that keeps the `review_authors` mapping, so the one-per-person unique row survives and a fresh review cannot reset the edit counter. | Closed |
| Review the same person twice | `unique (author_id, person_id)` on `review_authors` plus an explicit check in `submit_review`. | Closed |
| Spam new reviews | `submit_review` enforces a per-day new-review limit server-side. | Closed (for review creation) |
| Post or edit while the admin has paused it | `submit_review` checks `feature_enabled('review_submission')`, `update_my_review` checks `feature_enabled('review_editing')`, and the signup and domain switches are checked inside the `auth.users` trigger. All four switches are enforced in the database; the client flag query is only for hiding buttons. | Closed |
| Read hidden or pending reviews | `reviews` RLS exposes only `status = 'published'` to `anon` and `authenticated`; a separate policy lets an admin read all. Answers follow the same published gate. | Closed |
| Break out a reviewer via a thin course or semester bucket | k-anonymity threshold of three (section 5). | Closed |
| Reach an admin RPC as a non-admin | Every admin RPC calls `is_admin()` as its first statement and is revoked from `public`, `anon`, and `authenticated` before being granted only to `authenticated`. The admin routes also sit behind `requireAdmin()` in `admin/layout.tsx`, which is defence in depth on top of the RPC gate, not the gate itself. | Closed |
| Inject script through a review or profile field (XSS) | No user content is rendered with `dangerouslySetInnerHTML`. The only such use is the theme no-flash script, whose content is a static string with a JSON-stringified constant, not request data. React escapes text by default. | Closed |
| SQL injection through an RPC argument | RPCs are parameterized. The only dynamic SQL is a migration-time DDL loop that uses `%I` identifier quoting over a fixed list of table names, not user input. | Closed |
| Tamper with the request or session cookie | Middleware verifies the session with `getUser()` (a server check), not by trusting the cookie contents, and makes no authorization decision itself. Authorization is RLS plus server guards. | Closed |
| Find a debug or data endpoint | The only route handler is `auth/callback`. There is no data API surface to attack; reads and writes go through server components and RPCs. | Closed |
| Read a stack trace or internal error | Admin surfaces map errors through a per-module allow list and otherwise return a single generic message; list queries return a `failed` flag rather than raw text. | Closed |
| Clickjack or downgrade transport | `X-Frame-Options: DENY` and HSTS with preload. | Closed |
| Fingerprint the stack | `poweredByHeader: false`. | Closed |

No change to application or database code was required by this review.

## 7. The one change made

`.gitignore` now ignores `.fuse_hidden*`. These are orphan editor artifacts that
the FUSE-mounted filesystem leaves when a file is edited while open. They can
contain an old copy of a source file, so ignoring them prevents an accidental
commit. They were not previously matched by any ignore rule. This is a hygiene
fix, not a response to an exploit.

## 8. Known limitations and recommended next hardening

These are open on purpose and are the reason this document does not claim the
system is fully secure.

1. No Content-Security-Policy. The response headers are strong but there is no
   CSP yet. A correct policy for this app needs to be nonce-based, because the
   theme no-flash script and Next's own hydration scripts run inline; a naive
   policy would either break them or fall back to `unsafe-inline`, which defeats
   the point. Implementing it means generating a nonce in middleware and
   threading it through the inline script, then testing every page in a real
   build. That testing cannot be done in this sandbox, so the work was not shipped
   blind. This is the top recommended next step.
2. `.fuse_hidden*` artifacts still exist on disk (now ignored, not deleted). The
   owner should delete them on Windows. File deletion is not available in the
   sandbox.
3. `feature_enabled()` fails open (returns true) when a flag row is missing. That
   is the right default for availability switches and the rows are seeded, but if
   a switch is ever used as a hard security gate, that specific key should be made
   fail-closed.
4. `person_reviews` has two overloads on disk (an older five-argument version and
   the live seven-argument version). Both are safe and neither exposes an author,
   but the older one is dead and could be dropped in a future additive migration
   for tidiness.
5. Rate limiting is enforced for new-review creation. Auth attempts (sign-in,
   password reset) rely on the Supabase Auth provider defaults; if abuse is seen,
   add an explicit limiter in front of the auth calls.
6. Automated tests were authored but not executed here. They must pass on Windows
   before this phase is considered signed off.

## 9. What the project owner still needs to do

1. Install the new dev dependencies on Windows, then run the tests:

```
npm install
npm run test        # vitest unit tests
npx playwright install   # first time only, for the e2e browser
npm run build       # production build (also the real check that nothing broke)
npm run test:e2e    # optional: runs the smoke test against a built app
npm audit           # review any dependency advisories
```

2. There is no new database migration in this phase. Do not reset the database,
   do not rerun any earlier migration, and do not run `supabase db push`.

3. Delete the `.fuse_hidden*` files from the project folder (they are now
   gitignored, but removing them is cleaner).

4. Consider the CSP work in section 8 as the next hardening task.

## 10. Scope note

This completes the Phase 6 security hardening and testing pass as far as it can
be taken inside the sandbox. The controls that protect anonymity, authorization,
and account integrity were checked at the database and server-action layer and
hold. The open items in section 8 are real and are the honest boundary of this
review.
