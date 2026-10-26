# Demo reviews and featured spotlight

The admin dashboard and Settings page share a **Demo data ON/OFF** control.
Teachers, faculty, lab instructors and HR staff receive 5, 8, 10, 12, 14 or 16
sample ratings per active role, including 3–8 Roman Urdu/English comments per profile.
Lab and HR comments use role-appropriate templates. A teacher with an active
faculty role has distinct teacher and faculty samples on the same public profile,
with a shared maximum of eight sample comments across its roles.

ON includes samples in public reviews and rating aggregates. OFF hides all samples.
Real student reviews and authorship records are preserved. Counts stay stable
across toggles and migration reapplication. New role assignments are seeded
automatically; samples belonging to deleted/inactive roles stay removed.

The long public banner is replaced by a compact **Demo · ratings include sample data**
notice. Individual synthetic reviews remain labelled **Demo review**, and directory
cards distinguish sample totals from student-only reviews.

## Preview placements

With demo mode ON, university-scope faculty, lab and HR ranking pages show an
explicitly labelled, manually arranged demo preview. Faculty placements start with
Sarmad, Abdul Basit and Mansoor. Rafiuli appears at the end of the lab preview.
These placements do not change any person's saved ratings or the database ranking
algorithm. OFF returns the ordinary rankings; other scopes retain rating-based
results and disclose included sample data while ON.

## Sir Zeeshan spotlight

The existing HR profile matching the complete name token Zeeshan receives a gold
spotlight card on the homepage, HR directory cards and the profile/popup header.
The homepage feature appears only when the HR search identifies one matching profile.
Confetti loops inside the card, pauses on hover/focus and respects reduced motion.

The badge is **Featured spotlight** for the editorial feature. Demo mode uses
**Demo #1 overall** for its configured preview placement, without inventing an
actual highest rating. The feature remains available when samples are hidden.

## Database setup

The teacher migration must already be applied. Apply the additive extension:

`supabase/migrations/20261026120000_faculty_lab_hr_demo_reviews.sql`

It preserves the current mode and existing teacher samples, extends the sample
constraint/index to per-role slots, and seeds faculty/lab/HR roles. Both migrations
are transactional; reapply the extension alone after it has been installed.
The exact original inline check is identified by its expression so unrelated
validation checks remain intact. Deploy the matching application changes afterward.

Read-only verification in the SQL editor:

```sql
select is_enabled from public.demo_data_settings;
select category, count(distinct person_id) as people, count(*) as ratings,
       count(comment) as comments
from public.reviews
where demo_slot is not null and status <> 'removed'
group by category;
```

Only an active authenticated admin can toggle the mode. Public data and layout
caches are invalidated together. No student accounts or authorship are fabricated.

## Verification

Database tests cover every sample role, role-specific criteria, new assignments,
ON/OFF visibility, idempotent reapplication, removed roles, student/admin access,
and genuine-review preservation. Presentation tests cover preview placement,
unchanged scores, safe profile matching, demo labels and decorative animation.
Server clients use the explicit `ws` transport for Node 20 compatibility.

Live database/deployment state is not independently verified in this workspace.
