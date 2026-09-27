# Phase 5 verification record

Date: 2026-09-25
Scope: Phase 5 control plane. Feature controls and audit helper, profile report
system, website feedback, admin notifications, review reset, duplicate merge,
criteria editor, and the public feedback page. Covers tasks #33 to #39. Task #40
(admin reference-data and people CRUD) is deferred and out of scope here.

## 1. Automated checks

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | exit 0 |
| Lint | `npx next lint --dir src` | no warnings, no errors |
| Production build | `npm run build` | **not run here.** The sandbox has no npm registry access (HTTP 403), so Next cannot resolve its build dependencies. This must be run on Windows. |

Content rules:

* em dash anywhere in `src`: 0 (checked project wide)
* non-ASCII beyond the allowed section sign and middot in the Phase 5 files: 0
* Roman Urdu is present only inside code comments, never in a label, help text,
  question, button, notification, validation message, or public string
* service-role key or admin client referenced in the UI or feature layer: none

## 2. Security review

An independent pass was run over the three new control-plane migrations, the
report and feedback migration, and the whole admin and public UI surface. This
time no code change was required. What was checked, and what was confirmed:

| Area | What was verified |
| --- | --- |
| Admin gate | Every admin RPC calls `is_admin()` as its first statement and raises before touching any data. This holds for all nine functions in the control plane migration and all admin functions in the reports and feedback migration. Deleting the entire `src/app/admin` folder would not weaken the database. |
| Grants | Every Phase 5 function is revoked from `public`, `anon` and `authenticated` before any grant. Counts match one to one: 1/1, 5/5, 7/7 and 9/9 across the four migrations. Only `submit_website_feedback` is granted to `anon`, which README §57 requires. |
| Report separation (§51) | `resolve_report` only updates the report row and writes an audit entry. It never changes `people.is_active` and never deletes. Deactivation is the separate `set_person_active`, which requires a non-empty reason and is audited. Acceptance alone can never remove a profile. |
| Archival over deletion (§52, §53) | Review reset sets `status = 'removed'` rather than deleting, and keeps `review_authors` rows so the one-review-per-person guard survives. Duplicate merge deactivates the duplicate rather than deleting it, archives colliding reviews so a rating is never double counted, and moves non-colliding children with conflict guards on each unique constraint. Both require a reason and are audited. |
| Feature switches (§55) | The server clock is authoritative. `feature_enabled()` compares `now()` against the schedule window, and `submit_review`, `update_my_review` and `enforce_university_email` re-check it inside the database. The UI toggle and badge are cosmetic. `set_feature_flag` is admin gated, rejects an end before a start, and only touches the four seeded keys. |
| Feedback privacy (§56 to §59) | Website feedback is a separate dataset with no foreign key to `people`, so it cannot affect any rating or ranking. `admin_feedback_queue` returns only a `from_student` boolean plus the optional contact email; it never returns a student id, student email, or auth user id. The public page and public action expose no submitter identity at all. `submitted_by` is read from `auth.uid()` inside the database, never from the form. |
| Untrusted client | The public feedback action uses the anon-key client and only shape-checks input. Every real rule lives in the definer function. Error text shown to a user, admin or visitor, comes from a fixed allow list that contains no table, column or constraint name; everything else collapses to a generic message. |
| No direct writes | All seventeen UI action and query call sites go through `supabase.rpc()`. No code in the feature or app layer writes a table directly. |

Noted for later, not a Phase 5 blocker:

* Public feedback submission is intentionally open to anonymous visitors
  (README §57), and the database has no rate limit on it. A determined bot could
  fill the feedback table. This cannot reach ratings, PII, or auth, so it is a
  housekeeping risk only. If spam appears, add a per-session or per-IP throttle
  in the RPC or at the edge. Left as a future item.

## 3. What the project owner still needs to do

**1. Apply the migrations, in this order, in the Supabase SQL editor.** Skip any
that are already applied. Do not reset the database and do not run
`supabase db push`. Each file is wrapped in its own transaction, so a failure
rolls that file back cleanly and the earlier ones stay applied.

```
20260919090000_reference_schema.sql
20260919090100_rls_policies.sql
20260919090200_seed_production.sql
20260920090000_positions_cleanup_and_gender.sql
20260921080000_auth_foundation.sql
20260921120000_reviews_core.sql
20260922090000_criteria_english_and_student_domain.sql
20260922100000_reviews_overall_ten_and_word_limit.sql
20260922110000_review_text_moderation.sql
20260922120000_review_course_semester_uniqueness.sql
20260922130000_internal_teacher_faculty.sql
20260922140000_moderation_hardening.sql
20260924090000_search_and_filters.sql
20260924091000_rankings_and_aggregates.sql
20260924092000_favorites_compare_recommend.sql
20260925090000_compare_people_kanon_threshold.sql   <- Phase 5
20260925093000_feature_controls_and_audit.sql       <- Phase 5
20260925094000_reports_and_website_feedback.sql     <- Phase 5
20260925095000_admin_control_plane.sql              <- Phase 5
```

**2. Build on Windows.** The sandbox cannot do this.

```
Remove-Item -Recurse -Force .next
npm run build
```

**3. Manual test as an admin.** Open each new screen from the admin nav:
Dashboard, Reports, Website feedback, Notifications, Criteria, Settings.

* Reports. As a signed-in student, report a profile. See it in the Reports queue
  as Pending. Accept it and confirm the profile is still active. Then open
  Profile actions, deactivate with a reason, and confirm the profile leaves the
  public directory. Reactivate it.
* Website feedback. From a logged-out browser open `/feedback` (linked in the
  footer). Send a message with and without a rating, and with and without a
  contact email. Confirm it appears under Website feedback, change its status and
  important flag, and confirm the contact email is visible only to the admin.
* Notifications. Create a notice with a start and end time. Confirm it is Off
  before the window and Live inside it, with no code change. Delete one.
* Criteria. Add a new criterion and confirm it appears in the review form for
  that category. Retire one by setting it Inactive. Confirm you cannot change an
  existing criterion's category, key, or answer type.
* Settings. Turn Review submission off and confirm the database refuses a new
  review even if the form is forced through dev tools. Set a schedule window and
  confirm the server clock, not the browser, decides what is live.

**4. Deferred.** Task #40 (admin reference-data and people CRUD: create and edit
people, departments, courses, and assignments from the admin UI) is the next
piece of Phase 5 and is not built yet.
