# Phase 4 verification record

Date: 2026-09-25
Scope: Phase 4 discovery layer. Search and filters, profile aggregation
(course-wise and semester-wise ratings), rankings (Best Teacher, Best Faculty,
Best Lab Instructor, Best Uni Staff, Best HR Staff), Most Reviewed, Trending,
side-by-side comparison, favourites, recently viewed, and the deterministic
recommendation system.

## 1. Automated checks

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | exit 0 |
| Lint | `npx next lint` | no warnings, no errors |
| Production build | `npm run build` | **not run here.** The sandbox has no npm registry access (HTTP 403), so Next cannot resolve its build dependencies. This must be run on Windows. |

Content rules:

* em dash in user-facing strings: 0. A repo-wide scan found em dashes only
  inside Roman Urdu code comments, never inside a quoted string or JSX text.
  Every em dash under `src/` has since been replaced with a hyphen, so the
  application source is now em-dash-free. Applied migration files and the PRD
  were deliberately left untouched (see note below).
* Roman Urdu inside user-facing strings, DB labels, help_text, buttons,
  notifications or validation messages: 0. Roman Urdu remains only in source
  code comments, which the PRD allows.
* service-role key or other secret referenced anywhere in `src`: none. The read
  and UI layer uses the anon-key server client only.

Note on migration files and the em dash rule: the Supabase CLI checksums each
file in `supabase/migrations/`. Editing an already-applied migration, even a
comment, can make the tooling report a hash mismatch on the owner's machine.
Those files are therefore left exactly as applied. Their em dashes are all in
comments and never reach a user. `ProfAura_README_PRD.md` is the owner's own
document and was likewise not edited.

## 2. Security review

An independent review pass was run over the three Phase 4 migrations
(`20260924090000_search_and_filters.sql`,
`20260924091000_rankings_and_aggregates.sql`,
`20260924092000_favorites_compare_recommend.sql`) and the new discovery UI.
Findings and what was done:

| Severity | Finding | Fix |
| --- | --- | --- |
| Medium | The "hide a criterion until it has at least 3 responses" anonymity guarantee was enforced only in the UI (`comparison-table.tsx`). `compare_people()` itself is granted to `anon` and returned raw sub-threshold counts, so a direct RPC call from DevTools or curl could read a single "No" or an `n = 1` star average and de-anonymise a reviewer. This is exactly the frontend-trust boundary the PRD forbids. | New migration `20260925090000_compare_people_kanon_threshold.sql` replaces `compare_people()` so the per-criterion values are gated in SQL, using the same admin-configurable `public.breakdown_min_reviews()` helper the other aggregates and `recommend_teachers()` already use. A criterion with too few responses now returns `averageStar = null` and `*Responses = 0` from the database itself. The row still appears (the UI shows a placeholder), but no raw number leaves the server. |
| Low | The private lists (`my_favorites`, `my_recently_viewed`, `my_favorite_person_ids`) are granted to `authenticated` only, while the two public reads (`compare_people`, `recommend_teachers`) are granted to `anon` and `authenticated`. Confirmed intentional and correct: private lists rely on RLS keyed to `auth.uid()`, public reads expose only already-public aggregates. | No change. Recorded so the split is not mistaken for an oversight. |
| Low | `record_person_view()` is `security definer`. Verified it derives the viewer from `auth.uid()` internally, is silent for logged-out callers, trusts no caller-supplied identity, keeps only the last 20 rows per user, and pins `search_path = public, pg_temp`. | No change. |
| Low | `toggle_favorite()` is `security definer`. Verified it derives the owner from `auth.uid()`, trusts no caller-supplied id, and pins `search_path`. | No change. |

Confirmed as already correct, no change needed:

* Every read RPC that backs a page is `security invoker`, so a caller only ever
  sees rows RLS already allows. The two `security definer` writes both derive
  identity from `auth.uid()` and never trust an id from the client.
* Every function in the Phase 4 migrations is revoked from `public`, `anon` and
  `authenticated` before any grant, and the corrective migration re-issues the
  revoke and grant for the function it replaces.
* Recommendation and ranking eligibility (the review-count threshold) is applied
  in SQL, not in the browser. A crafted URL with any id or filter cannot pull a
  profile that has too few reviews into a ranking or a recommendation.
* The comparison view is limited to a single category and at most four people in
  SQL (`limit 4` after de-duplication), so a long `ids` list cannot force a wide
  or cross-category read.
* No favourite list, recently-viewed list or recommendation input is stored with
  unnecessary personal data, and none of it is exposed to another user.
* No secret or service-role key appears in the read or UI layer.

## 3. What the project owner still needs to do

Steps 1 and 3 are required before the Phase 4 features will work.

**1. Apply the new migrations, in this order, in the Supabase SQL editor.**

```
20260924090000_search_and_filters.sql
20260924091000_rankings_and_aggregates.sql
20260924092000_favorites_compare_recommend.sql
20260925090000_compare_people_kanon_threshold.sql
```

Skip any file that is already applied. The last file is a corrective
`create or replace` for `compare_people()`; it changes one function body only,
touches no table and deletes no data, and is safe to run on top of the third
file. Do not reset the database and do not run `supabase db push`. Each file is
wrapped in its own transaction.

**2. Verify the anonymity fix after applying.** On a profile that has a criterion
with fewer than three responses, run in the SQL editor:

```
select criteria
from public.compare_people(array['<id1>','<id2>']::uuid[], 'teacher');
```

The low-response criterion should come back with `averageStar` null and both
`*Responses` values 0. A criterion with three or more responses should show its
real numbers.

**3. Build on Windows.** The sandbox cannot do this.

```
Remove-Item -Recurse -Force .next
npm run build
```

The pre-existing metadata-route notes on `/apple-icon` and `/twitter-image`
should be no worse than before this phase. Nothing in Phase 4 touched those
routes.

**4. Manual test.**

* Directory search and filters: search a teacher and a course, apply a
  department or program filter, confirm the URL carries the filter and a shared
  link reproduces the same result.
* Profile: open a teacher with several reviews and confirm the course-wise and
  semester-wise breakdowns appear, and that a course or semester with fewer than
  three reviews is not shown as a labelled bucket.
* Rankings, Most Reviewed, Trending: open each and confirm only profiles with
  enough reviews appear.
* Favourites: save two to four profiles of the same category, open
  `/student/favorites`, select them and choose Compare, and confirm the
  comparison page shows them side by side with low-response criteria blanked.
* Recently viewed: open a few profiles, then the student area, and confirm they
  appear only to you.
* Recommendations: choose a course or department and confirm the suggestions,
  their key strengths and the "why suggested" reasons appear, with no numeric
  score shown.

## 4. Note for the next phase

Phase 5 (Admin, Moderation, Notifications) continues from the current codebase.
The admin shell, the review moderation module and the placeholder routes for
notifications, reports, settings and website feedback already exist and must be
built on, not replaced.
