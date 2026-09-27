# Phase 3 verification record

Date: 2026-09-23
Scope: Phase 3 review system, admin text moderation, Internal Teacher to Faculty association.

## 1. Automated checks

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | exit 0 |
| Lint | `npx next lint` | no warnings, no errors |
| Production build | `npm run build` | **not run here.** The sandbox has no npm registry access (HTTP 403), so Next cannot resolve its build dependencies. This must be run on Windows. |

Content rules, checked with a script that strips comments first:

* em dash in user-facing strings: 0
* Roman Urdu inside string literals: 0
* service-role key or other secret referenced anywhere in `src`: none

## 2. Security review

An independent review pass was run over the two new migrations and the admin
moderation surface. Findings and what was done:

| Severity | Finding | Fix |
| --- | --- | --- |
| High | `apply_internal_teacher_faculty()` was not idempotent. Switching a person internal, then external, then internal again would hit `person_roles_unique_idx` (which ignores `is_active`) and abort the update with a raw `23505`. | The function now reactivates its own dormant faculty role before inserting, and the insert itself carries `on conflict ... do update set is_active = true`. |
| High | The backfill loop could abort the whole migration. One legacy internal teacher with no department would raise, and nothing would commit. | Each person now runs in its own sub-block. Problem rows are skipped with a `NOTICE` naming the id, and a count is reported at the end. |
| Medium | `moderate_review()` checked only `comment is not null`, not `status`. A crafted RPC call could approve or feature a review the student had already deleted. The queue hid such rows, so safety depended on an unrelated filter in a different function. | New migration `20260922140000_moderation_hardening.sql` replaces the function with `and r.status <> 'removed'` in its lookup. |
| Medium | Course and semester on a public review are a quasi-identifier. In a section with one or two reviewers, "CS-301, Fall 2025" points at a specific student. | `person_reviews()` now suppresses the course and semester label unless that (course, semester) bucket holds at least 3 published reviews, and the course/semester filter is subject to the same threshold. Small buckets always return an empty result, so the filter reveals nothing either. Ratings and text are unaffected. |
| Medium | `person_review_options()` offered courses that `submit_review()` would reject, and as a `security definer` function it bypassed the `courses` RLS predicate (course active and department active). | Both CTEs now join `courses` and `departments` and require `is_active` on each, mirroring the policy. |
| Low | The `pg_constraint` existence guard matched on name only. Constraint names are unique per table, not per database. | Added `and conrelid = 'public.reviews'::regclass`. |
| Low | The fallback branch of `submit_review()` raised "That course and semester do not match this profile." for a check that never looks at the semester. | Message is now "That course does not match this profile." |
| Low | In the admin moderation card, the chosen action was written into a hidden input through a React ref. That works after hydration but posts an empty action if the admin clicks before the JavaScript loads. | The action now lives on the submit button itself (`name="action" value="approve"`). Browsers and React both include the submitter in the form data, so it behaves the same with or without JavaScript. |

Confirmed as already correct, no change needed:

* No non-admin path reaches moderation. The admin layout redirects, and both
  `admin_review_queue()` and `moderate_review()` call `is_admin()` themselves.
  Deleting the entire admin UI folder would not weaken the database.
* Every function in the three new migrations is revoked from `public`, `anon`
  and `authenticated` before any grant. 11 functions, 11 revokes.
* `reviews.comment` is never covered by a table-level select grant. Only an
  explicit column list is granted, and `comment` is not in it.
* No function returns review author identity. `admin_review_queue()` has no
  author column at all, so the moderation screen structurally cannot show one.
* Every migration is additive. No table is dropped, no row is deleted, no
  column type changes. The one constraint removed is the old one-review-per-
  person rule, which is the point of the change.
* Error text shown to an admin comes from a fixed allow list, so no constraint,
  table or column name can reach the browser.

## 3. What the project owner still needs to do

Steps 1 and 4 are required before the site will run.

**1. Apply the migrations, in this order, in the Supabase SQL editor.**

```
20260921080000_auth_foundation.sql
20260921120000_reviews_core.sql
20260922090000_criteria_english_and_student_domain.sql
20260922100000_reviews_overall_ten_and_word_limit.sql
20260922110000_review_text_moderation.sql
20260922120000_review_course_semester_uniqueness.sql
20260922130000_internal_teacher_faculty.sql
20260922140000_moderation_hardening.sql
```

Skip any file that is already applied. Do not reset the database and do not run
`supabase db push`. Each file is wrapped in its own transaction, so a failure
rolls that file back cleanly and the earlier ones stay applied.

**2. Supabase dashboard settings.**

* Authentication, Providers: Confirm email ON, Anonymous sign-ins OFF, Phone OFF
* Authentication, URL Configuration: Site URL set, and `/auth/callback` added to Redirect URLs
* Authentication, Policies: minimum password length 12
* Project Settings, Auth, SMTP: Brevo custom SMTP configured

**3. Confirm `NEXT_PUBLIC_SITE_URL` in `.env.local`** matches the Site URL above.

**4. Build on Windows.** The sandbox cannot do this.

```
Remove-Item -Recurse -Force .next
npm run build
```

**5. Manual test.** Run the seven step auth test in `docs/PHASE2_AUTH.md`, then
check `/admin/reviews`: submit a review with text as a student, confirm the text
is not public, approve it as an admin, confirm it appears, then feature it and
confirm it moves into the featured block on the profile.

**6. Optional cleanup.** These files are retired and no longer imported:

```
src/app/(public)/login/
src/app/(public)/signup/
src/features/auth/auth-panel.tsx
src/features/home/rankings-preview.tsx
src/features/home/sample-rating-card.tsx
src/__probe.ts
```
