# Phase 5 D verification record

Date: 2026-09-26
Scope: Phase 5 D, the admin content-management surface (README §49). Covers
tasks #40 to #44: reference-data administration (departments, programs, courses,
semesters, positions), people administration (create and edit a person, their
roles, and their teaching assignments), a read-only students viewer, and a
read-only audit-log viewer, plus the grouped admin navigation and the rankings
settings page. This layer is UI and server code built on top of two new database
migrations. It does not change any Phase 2 to Phase 5 behaviour.

## 1. What was added

Two new migrations, both additive and each wrapped in its own transaction:

```
20260926090000_admin_reference_data.sql   <- Phase 5 D  (reference-data RPCs)
20260926091000_admin_people.sql           <- Phase 5 D  (people + students + audit RPCs)
```

Neither has been applied yet. Every earlier migration is already applied and
must not be rerun.

New server code (queries and server actions) under `src/features/admin/` in the
`reference`, `people`, `students`, and `audit` folders. New admin screens under
`src/app/admin/` for `departments`, `programs`, `courses`, `semesters`,
`positions`, `rankings`, `people`, `people/new`, `people/[id]`, `students`, and
`audit`.

## 2. Automated checks

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | exit 0 |
| Lint | `npx next lint --dir src` | no warnings, no errors |
| Production build | `npm run build` | **not run here.** The sandbox has no npm registry access (HTTP 403), so Next cannot resolve its build dependencies. This must be run on Windows. |

Content rules, checked across both new migrations and the new server and UI
files:

* em dash anywhere: 0
* non-ASCII beyond the allowed section sign and middot: none
* Roman Urdu appears only inside code comments, never in a label, help text,
  question, button, notification, validation message, aria or screen-reader
  string, or public content
* banned position titles (§31): they appear in exactly one place, as a rejection
  blocklist inside `admin_upsert_position`, which refuses to create or rename a
  position to any of them. They are never seeded and never offered as a choice.

## 3. Security review

An independent pass was run over the two new migrations and the whole new server
and UI surface. What was checked, and what was confirmed:

| Area | What was verified |
| --- | --- |
| Admin gate (§50) | Every admin RPC calls `is_admin()` as its first executable statement and raises `insufficient_privilege` before touching any data. This was confirmed on all 28 callable functions, including the four sensitive read paths `admin_people_list`, `admin_get_person`, `admin_students_list`, and `admin_audit_list`. Deleting the entire `src/app/admin` folder would not weaken the database. |
| Route guard (§50) | `src/app/admin/layout.tsx` calls `requireAdmin()`, so every new screen is also protected at the route level and a non-admin is redirected home without the admin area being revealed. This sits on top of the per-RPC gate and RLS, not instead of it. |
| Grants | All 28 functions are revoked from `public`, `anon`, and `authenticated` before any grant. Every grant is `execute ... to authenticated` only; none is granted to `public` or `anon`. The one internal helper, `_admin_slugify`, is revoked from everyone and granted to nobody, because the definer functions call it as owner. |
| No service role | Neither migration references `service_role`. No query or action in the new server layer imports a service-role client. Every one of the 27 call sites uses the anon-key server client and goes through `supabase.rpc()`; there is not a single direct table write in the feature or app layer. |
| Position titles (§31) | `admin_upsert_position` compares the trimmed, lower-cased title against a fixed banned array and raises `check_violation` on a match, so a forbidden title cannot enter through the form, through dev tools, or through a direct RPC call. The allowed set stays HOD, Coordinator, Dean, Associate Professor, Professor, and Other. |
| Identity is fixed (§28 to §30) | A person's category and slug are set at creation and are never submitted by the edit form. The update RPC does not accept them, so the public web address and the one-person-one-profile category cannot be changed after the fact from the UI. |
| Deactivate, not delete (§51) | The Visibility section reuses the existing `set_person_active` action, which requires a non-empty reason and is audited. It hides a profile and keeps all data and reviews. There is no delete path for a person in this surface. Reset-reviews and merge-duplicate stay in the reports queue, each reason-gated and audited. |
| Students stay unlinked | `admin_students_list` returns account rows only. It has no join to reviews and exposes no path from an account to the reviews it wrote, so the anonymity guarantee is preserved. The viewer is read only; there is no action that edits or promotes an account. |
| Audit is a record (§103) | `admin_audit_list` is read only, gated, and paginated. Entries are written by the database when an admin action runs and cannot be edited from the UI. The detail blob is rendered as escaped JSON text, not executed, and no secret is written to it. |
| Untrusted client | Error text shown to an admin comes from a fixed allow list per module; anything else collapses to a single generic message that names no table, column, or constraint. List and detail queries return a `failed` flag rather than raw error text. |

Nothing in this pass required a code change.

## 4. What the project owner still needs to do

**1. Apply the two new migrations, in this order, in the Supabase SQL editor.**
Do not rerun any earlier file, do not reset the database, and do not run
`supabase db push`. Each file is wrapped in its own transaction, so a failure
rolls that file back cleanly and everything already applied stays applied.

```
20260926090000_admin_reference_data.sql
20260926091000_admin_people.sql
```

**2. Build on Windows.** The sandbox cannot do this.

```
Remove-Item -Recurse -Force .next
npm run build
```

**3. Manual test as an admin.** Open the new screens from the admin nav.

* Reference data. Add a department, a program, a course, and a semester, then
  edit each and toggle one inactive. Confirm an inactive item stops appearing in
  the pickers on the person screen but is not deleted. On Positions, try to save
  the title "Lecturer" or "Assistant Professor" and confirm the database refuses
  it, then add an allowed one such as "Professor".
* People. Create a person, choosing a category, and confirm the category and web
  address are shown but locked on the edit screen afterwards. Add a role with a
  department and position, mark it primary, and confirm the public profile shows
  it. Add a teaching assignment for a course and semester. Deactivate the profile
  with a reason and confirm it leaves the public directory, then reactivate it.
* Students. Open the list, search by email, and filter by status. Confirm it is
  read only and that nothing ties an account to any review.
* Audit. Open the log, confirm the actions you just took appear with who, what,
  and when, and filter by entity. Confirm no secret or password is present in any
  entry.

**4. Server-side spot check (optional but recommended).** While signed in as a
non-admin, or signed out, call one admin RPC directly (for example
`admin_students_list`) from the browser console using the public anon key.
Confirm it returns a privilege error and no rows. This shows the gate does not
depend on the UI hiding the screens.

## 5. Scope note

This completes the admin content-management work (§49). No behaviour from earlier
phases changed. The next work is Phase 6, security hardening and full testing,
which is tracked separately.
