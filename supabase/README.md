# ProfAura — Supabase (database)

Ye folder database ka source of truth hai: schema migrations + seeds.
Sab kuch SQL me hai taake review + version control aasan rahe.

> Security principle (spec): **backend/database hamesha final authority hai.**
> Frontend par kabhi trust nahi. Access control RLS + server se hota hai.

## Folder layout

```
supabase/
  migrations/
    20260919090000_reference_schema.sql    -- enums + tables + indexes + triggers
    20260919090100_rls_policies.sql        -- RLS enable (deny-by-default) + public read
    20260919090200_seed_production.sql     -- REAL backbone: SMIU + positions + semesters
    20260920090000_positions_cleanup_and_gender.sql
                                           -- purani unwanted positions delete + people.gender
  seed/
    seed_dev.sql                           -- SAMPLE/demo data — sirf dev, prod par NAHI
```

Migrations filename (timestamp) order me apply hoti hain. Prod seed ek migration
hai (har environment me chahiye). Dev seed alag hai taake demo data prod me na jaye.

## Pehli dafa apply karna (Supabase CLI)

```bash
# 1) apna live project link karein (project ref Supabase dashboard se)
supabase link --project-ref <your-project-ref>

# 2) migrations push karein (0001 -> 0002 -> 0003 order me chalengi)
supabase db push
```

`db push` sirf `migrations/` chalata hai — dev seed ko haath nahi lagata.

## Dev/demo data (sirf local ya dev project)

```bash
# option A: CLI
supabase db execute --file supabase/seed/seed_dev.sql

# option B: Supabase Studio > SQL Editor me file ka content paste karke Run
```

Dev seed idempotent hai (fixed UUIDs + on conflict), dobara chalana safe hai.
**Prod project par dev seed kabhi na chalayein.**

## Positions (designations) — approved list

Database me sirf **paanch** designations hain:

| slug | title |
| --- | --- |
| `dean` | Dean |
| `professor` | Professor |
| `associate-professor` | Associate Professor |
| `hod` | HOD |
| `coordinator` | Coordinator |

Inke ilawa koi designation **na** migration me add karein, **na** UI me hardcode.
Jis shakhs ki designation in paanch me nahi aati uske liye UI me **"Other"** hai:
`person_roles.position_id = null` + `person_roles.title_override` me free text.
`positions.category` ab nullable hai — `null` ka matlab hai yeh designation har
category (teacher / lab instructor / faculty / uni staff / HR staff) me chal sakti hai.

Frontend side ki mirror list: `src/lib/positions.ts` (sirf UI convenience; final
authority hamesha database hai).

## TypeScript types generate karna

`src/lib/supabase/database.types.ts` migrations se generate hoti hai. Schema badalne
par dobara generate karein:

```bash
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

## RLS ka khulasa (Phase 1)

- Har table par RLS **enabled**. Koi policy na ho to sab deny (deny-by-default).
- Sirf **SELECT** policies di gayi hain:
  - directory tables: sirf `is_active` rows public ko.
  - `site_notifications`: sirf active + current time-window rows.
- Koi **INSERT/UPDATE/DELETE** policy nahi → client roles (anon/authenticated) kuch
  likh nahi sakte. Admin writes Phase 2+ me `service_role` / SECURITY DEFINER
  functions se aayenge (jo RLS bypass karte hain).

## Aage (Phase 2+)

students, auth linkage, review criteria, reviews, reports, aur admin control tables
(signup lock, review locks, email-domain lock, audit logs) — separate migrations me.
