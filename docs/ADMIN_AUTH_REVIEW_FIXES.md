# Admin, signup and shared review lists (24 October 2026)

The user confirmed that a real signup now creates an account successfully. In Supabase project
`jyguyoauxzbsgqmjkxlw`, Email provider is ON, Confirm email is OFF, and both
`student_signup` and `review_submission` are enabled. Signup creates a session immediately
and opens the student dashboard. SMTP is no longer part of signup. A university SMTP block
was never established.

The admin-account review failure was traced to the account role. Development diagnostics recorded
`reviews.submit` with PostgreSQL code `42501`, and the user confirmed that the account also
opens Admin. The database's `is_verified_student()` allows active, confirmed student profiles.
The review panel now displays **Use a student account to review** for admins; the server action
checks the same role before attempting a write. Review permissions remain enforced in the database.

Separate development records at `2026-10-24T04:50:31.974Z` and `2026-10-24T05:59:30.109Z`
showed review check failures (`23514`). The first explicitly identified
`reviews_overall_rating_check`, the original inline one-to-five constraint. The current form and
submission RPC accept overall ratings from one to ten. The legacy constraint name is now included
in the safe diagnostic whitelist so this failure remains identifiable without logging private data.

## Shared course and semester workflow

1. Open **Admin → Courses**, choose a department for the list once, paste one course per line,
   and click **Save courses**. Names alone work; optional codes use `CS-301 | Computer Networks`.
2. Open **Admin → Semesters**, paste one semester per line, and click **Save semesters**.
   `spring24` becomes `Spring 2024`; Spring, Summer, Fall and Winter are supported.
3. Create teacher cards under **Admin → People**. Every teacher receives the university's active
   course list and the shared semester list automatically. Teaching assignments are optional records.
4. Students search and select a course and semester on a teacher card, then click **Write a review**.
   Those selections carry into the review form and survive the sign-in return path.

Each list save accepts up to 200 entries. Repeated entries are skipped; existing course IDs,
codes and archive flags, and semester IDs, labels, dates and current flags are preserved.
A bad entry rolls back the entire batch. Courses from another university and inactive
courses/departments/universities are rejected when a review is submitted.

The review questions and their scales are unchanged. One student may review the same teacher
for another course or semester. The duplicate rule is student + teacher + course + semester;
all published reviews contribute to that teacher's existing overall rating and review count.
Staff retain semester-only reviews. Comment moderation, anonymity, rate limits and edit limits remain.

## Applied shared-list database update

The user ran [`20261024100000_shared_review_catalog.sql`](../supabase/migrations/20261024100000_shared_review_catalog.sql)
in the configured project's [Supabase SQL Editor](https://supabase.com/dashboard/project/jyguyoauxzbsgqmjkxlw/sql/new)
and confirmed all four readiness flags are `true`. Fresh anonymous probes now reach both bulk RPCs
and receive `401/42501`, confirming that the functions are available and protected from anonymous writes.

The migration updates the review course check, adds the two atomic admin list RPCs, and fixes
internal teacher creation. Previously, the teacher-role trigger created an automatic faculty role,
then `admin_create_person` tried inserting it again and could hit `person_roles_unique_idx`.
Creation now uses the existing idempotent association helper. Existing people and roles are preserved.

## Applied overall-rating repair

[`20261024110000_review_rating_constraint_repair.sql`](../supabase/migrations/20261024110000_review_rating_constraint_repair.sql)
was run by the user in the same SQL Editor. The user then confirmed that a real review submitted
successfully. The repair's final query checks these two readiness flags:
`overall_rating_1_to_10_ready` and `legacy_1_to_5_check_removed`.

This transaction removes only the named, verified obsolete one-to-five check. It retains the
correct one-to-ten check or creates it if missing, and validates it against existing reviews.
It does not rescale saved ratings or change questions, functions, review permissions or the rating view.
An unexpected constraint definition or invalid existing rating causes the entire repair to roll back.
Do not rerun the historical five-to-ten migration: that script can rescale existing ratings.

The CLI login available in this workspace cannot administer this project, so both database updates
were applied through the project owner's SQL Editor access. Live signup and review submission are
confirmed by the user after the rating repair. A later short experience-text failure is described below.
Reviews remain restricted to active, confirmed student profiles; admin
accounts receive the student-account guidance. Shared lists can be maintained once through Courses
and Semesters and are available automatically on teacher cards.

## Required experience-text repair

The subsequent **Your experience** failure was identified in development diagnostics at
`2026-10-24T06:36:18.957Z`: `reviews.submit`, code `23514`, constraint `reviews_comment_check`.
This is the original check requiring 20–2,000 characters. The current form and RPC allow short
nonempty text, up to 150 words and 1,500 characters. The failure occurs during saving, before
the text can enter the admin queue. The confirmed legacy name is now included in safe diagnostics.

[`20261024120000_review_comment_constraint_repair.sql`](../supabase/migrations/20261024120000_review_comment_constraint_repair.sql)
is prepared and tested but **not yet confirmed as applied to the live database**. The project owner
must run the complete file in the same SQL Editor. Both final flags should be `true`:
`comment_word_limit_ready` and `legacy_comment_check_removed`.

The user's first attempt failed with `42P01` because the helper temporary table
`profaura_review_comment_policy` was unavailable to the repair block. Previously the helper was
created in a separate statement with `ON COMMIT DROP`, so the repair required all statements to
share a session and transaction. The corrected file creates, reads and drops the helper inside
one atomic `DO` statement, with the reviews-table lock inside that same statement. It works when
the editor runs the repair block independently and remains safe inside a migration transaction.
Replace the editor's old SQL with the complete corrected file before retrying. Live application
of the corrected repair is still unconfirmed.

The regression test reproduced `42P01` with the old standalone block, then passed with the
corrected file. All 39 targeted comment-repair and shared-review integration tests pass, including
independent block execution, reapplication within an outer transaction, saved-data preservation,
custom-constraint rollback, text boundaries and the pending-to-approved moderation flow.

The repair removes the verified obsolete minimum-length check, retains the correct current comment
check or adds it if missing, and validates saved text. It compares canonical expressions generated
by the same PostgreSQL instance so it can reject unexpected custom constraints. An incompatible
constraint or existing text outside the current limit rolls back the whole transaction. Saved text,
ratings, questions, moderation states and authorization are preserved.

The real PostgreSQL tests confirm that short text saves as `pending`, appears in the admin queue,
and stays hidden from visitors until an admin approves it. Approval is audit logged. Editing
approved text returns it to `pending`; rejected text stays hidden while its numeric rating still
counts. Students cannot read the moderation queue or approve their own text. Word and character
limits remain enforced. Live anonymous probes confirm that `admin_review_queue` and `moderate_review`
are available and reject anonymous access with `401/42501`; these probes changed no live reviews.

After applying the repair, submit an experience review from a student account and check
**Admin → Reviews → Pending**. Successful live experience submission and queue entry still need
confirmation from the user.

## Diagnostics and validation

Unexpected backend failures record only operation, safe error code, status and known constraint
names. Development also appends these records to the ignored
`.next/profaura-backend-errors.jsonl`, so a missing terminal connection does not hide the cause.
Raw messages, student identifiers, passwords, tokens and review text are excluded.

The isolated PostgreSQL tests apply the actual repository migrations and exercise authenticated
roles. They cover student/admin permissions, teachers without assignments, shared courses from
another department, aggregated ratings across scopes, duplicate rejection, invalid/inactive courses,
unchanged questions and existing reviews, atomic batches, archived/current record preservation,
internal teacher creation, and safe reapplication with all four readiness flags.
They also recreate the exact legacy rating constraint failure using the real submission RPC,
repair a missing one-to-ten constraint, save the previously rejected eight-point rating, preserve
existing ratings/questions, enforce table boundaries, and safely reapply the repair. Separate
PostgreSQL checks verify rollback with unexpected constraint definitions and out-of-range saved data.

The historical five-to-ten rating migration cannot reorder view columns with `CREATE OR REPLACE`.
The test bootstrap uses the repository's existing rating-view repair before that historical step;
the live database already has the ten-bucket view. The new shared-list migration does not alter that view.

Latest validation passed: 118 tests across 15 files, TypeScript and lint. Vitest now limits file
workers to two after a concurrent full-suite/lint/typecheck run exhausted local Windows memory;
the complete suite and final checks then passed. The earlier isolated
production build and browser checks passed for the application changes. Browser checks
verified actual production cards on desktop/mobile, course search, selected IDs in review links,
and the sign-in return path. Isolated copies of the real components, using the production fonts/styles,
verified keyboard navigation, reopening/clearing dropdowns, prefilled review forms, bulk-list previews,
invalid-list handling and mobile scrolling of a 40-course list. No JavaScript errors or hydration
warnings were observed. Edge's existing report-only CSP notice was excluded from application errors.
These checks did not create live accounts or reviews. The live bulk-RPC probes were anonymous,
used empty arguments, and were rejected by database permissions before any write could occur.

Earlier sidebar, compact filter popup, direct-signup, hydration and Windows image-route fixes
remain in this workspace. The sidebar scrolls internally, filters apply only after **Apply filters**,
and **Clear all filters** preserves the search term. Verification builds use
`PROFAURA_BUILD_DIR=.next-verify` to preserve the active development server.

Turnstile remains optional. With no site key, signup uses the student's details directly.
When configured, Supabase Auth verifies CAPTCHA tokens and the app supplies them on signup/sign-in;
the secret belongs in Supabase Auth, with only `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in the app.
Existing unconfirmed accounts require individual account support; legacy verification URLs go to sign-in.
