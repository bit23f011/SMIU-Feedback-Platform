# Performance and simultaneous submissions

## Request workflow

Public pages use a cookie-free Supabase client for explicitly allowlisted public reads. Next.js caches those responses for 30 seconds. Private dashboards, authentication, review writes and scheduled feature checks are uncached. A successful review invalidates rating results; admin changes invalidate public data. Stable profile, course, criteria and photo reads remain reusable when reviews change. Public reads have a 10-second connection timeout; writes are not automatically retried or timed out by this cache wrapper.

The homepage streams its copy and search before photos finish. Profile data loads in parallel, and request memoization prevents duplicate base-profile and session work. Signed-out visitors without a Supabase session cookie avoid unnecessary Auth requests. A cookie is only a hint to perform verification; it never grants access.

## Review submissions

1. The server verifies the session, active student role, person and submitted fields. Independent prerequisites run in parallel.
2. One `submit_review` RPC opens one PostgreSQL transaction. The database independently verifies permission, the feature flag, category, semester and course.
3. Before duplicate and daily-limit checks, the transaction locks only the submitting student's profile with `FOR NO KEY UPDATE NOWAIT`. Different students lock different rows and can continue concurrently. The lock is compatible with foreign-key checks.
4. A second overlapping request from the same account fails promptly with a clear retry message. It does not wait in a long queue. Once the first request commits, resubmitting its scope receives the existing “already reviewed” message. A different scope can proceed if the daily quota permits it.
5. The database checks the per-student limit of 10 new reviews in the last 24 hours. The `(author_id, created_at)` index supports that lookup. Existing unique indexes protect student/person/course/semester scopes even if a caller bypasses the UI.
6. Review, private authorship and answers commit together. Invalid or missing answers roll everything back. The lock releases on commit or rollback. Written experience text enters moderation; the existing rating publication rules remain in place.
7. Only a confirmed database success returns success to the form and refreshes the profile. The submit button is disabled while pending. There is no automatic write retry: after a lost connection, a retry may report that the review was already saved, which prevents duplicate records.

The migration also maps known uniqueness constraint failures to safe duplicate messages and adds `(person_id, created_at)` for published review retrieval. Separate trigram indexes match the homepage's full-name/display-name search when `pg_trgm` is enabled.

## Signup bursts and automatic login

Each signup uses Supabase Auth, which owns email uniqueness, password handling, account creation, sessions and provider rate limits. The existing database signup trigger creates the student's profile during account creation. There is no shared application lock or in-memory queue across students. Multiple requests for the same student ID remain subject to Auth's uniqueness checks.

The application reads the public Auth configuration with a 30-second cache and checks its signup flag in parallel. Supabase and the database still enforce the current policy. Credentials, CAPTCHA tokens and sessions are never cached. Rate-limit responses produce a wait-and-retry message rather than a retry loop.

Successful signup stores the returned session through the Supabase SSR cookie adapter and redirects to `/student`. If Auth returns a confirmed account without a session, the server attempts password login immediately. If a CAPTCHA was consumed, the same signup form obtains a fresh challenge and switches to “Open account”; the consumed token is never replayed. Failed recovery stays on this form and retries login rather than creating another account. A continuation flag alone cannot bypass credential or CAPTCHA validation.

## Capacity and deployment

Apply only `supabase/migrations/20261025090000_review_concurrency_and_indexes.sql` after the existing shared-catalog and review-constraint migrations. Its three readiness flags must return `true`. Existing reviews, questions, RLS and privileges are retained. This additive migration uses ordinary index creation; schedule it during a quiet period if the database is already large, because index creation briefly blocks writes on each indexed table. Enable `pg_trgm` if the optional name indexes are absent.

Use a production build to assess capacity; Next.js development compilation substantially increases local navigation time. Hosting must provide sufficient concurrent requests and Supabase must have sufficient database connections/compute. The application uses HTTPS REST/RPC through Supabase instead of opening a PostgreSQL connection for every page request. Configure signup limits and optional Turnstile in the provider dashboards according to expected traffic. Current provider limits were not changed by this code update.

Load-test a disposable environment with separate authenticated students at increasing concurrency (for example 10, 25 and 50), then measure p50/p95 request latency, 429/5xx responses, database CPU and connections. Include simultaneous identical scopes, two different scopes from a student with one daily slot remaining, separate students reviewing the same person, malformed answers, lost responses, and unique/duplicate signup IDs. Never run synthetic signup or review load against real student data.

Sharding is a later capacity decision requiring measured database saturation and a tenancy plan. The current single-university workflow uses indexed queries, cached public reads, atomic writes and per-student guards. If measurements justify it, partition or shard by university while keeping each student's review scopes and quota checks together. A durable queue is appropriate for future background notifications or analytics; acknowledging a queued review as saved would change the current persistence guarantee.

## Verification and limits

Unit tests cover immediate signup, missing-session login, fresh CAPTCHA recovery, rate-limit responses, cache privacy and safe review errors. Isolated PostgreSQL tests execute the real migrations, preserve existing data, verify daily quotas for separate students, enforce duplicate scopes and verify complete rollback. The embedded test database has one connection; these tests do not replace a real multi-connection load test.

Warm local development measurements across three runs, excluding first compilation, improved homepage DOM-ready time from 1.63–1.74 seconds to 0.68–0.99 seconds, and repeated profile opens from 2.7–3.7 seconds to 0.6–1.3 seconds. These are local observations, not production latency or traffic guarantees.
