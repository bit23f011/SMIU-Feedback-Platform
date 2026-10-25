// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

// Asli migrations aur permissions ko isolated PostgreSQL me chalao; live DB ko na chhoo.
const ids = {
  admin: "10000000-0000-4000-8000-000000000001",
  student: "10000000-0000-4000-8000-000000000002",
  otherStudent: "10000000-0000-4000-8000-000000000003",
  inactive: "10000000-0000-4000-8000-000000000004",
  unconfirmed: "10000000-0000-4000-8000-000000000005",
  foreignUniversity: "10000000-0000-4000-8000-000000000006",
  existingReview: "10000000-0000-4000-8000-000000000007",
};
const migrationName = "20261024100000_shared_review_catalog.sql";
const ratingRepairName = "20261024110000_review_rating_constraint_repair.sql";
const commentRepairName = "20261024120000_review_comment_constraint_repair.sql";
const concurrencyName = "20261025090000_review_concurrency_and_indexes.sql";
let db: PGlite;
let teacher: string;
let staff: string;
let department: string;
let course: string;
let secondCourse: string;
let archivedCourse: string;
let foreignCourse: string;
let semester: string;
let secondSemester: string;
let answers: { key: string; star?: number; yes?: boolean }[];
let criteriaBefore: unknown[];
let criteriaAfter: unknown[];
let preservedBefore: unknown[];
let preservedAfter: unknown[];
let migrationReadiness: unknown[];
let legacyRatingFailure: { code?: string; constraint?: string } | undefined;
let ratingRepairReadiness: unknown[];
let legacyCommentFailure: { code?: string; constraint?: string } | undefined;
let commentRepairReadiness: unknown[];
let concurrencyReadiness: unknown[];

async function scalar<T>(sql: string, params: unknown[] = []): Promise<T> {
  const result = await db.query<{ value: T }>(sql, params);
  return result.rows[0]!.value;
}

async function signIn(userId: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    userId,
  ]);
  await db.exec("set role authenticated");
}

async function submit(
  courseId = course,
  semesterId = semester,
  rating = 8,
  personId = teacher,
  comment: string | null = null,
) {
  return scalar<string>(
    "select public.submit_review($1::uuid, $2::smallint, $3::text, $4::jsonb, $5::uuid, $6::uuid) as value",
    [personId, rating, comment, JSON.stringify(answers), courseId, semesterId],
  );
}

async function rejection(sql: string, params: unknown[] = []) {
  await db.exec("savepoint expected_failure");
  let failure: { code?: string; message?: string } | undefined;
  try {
    await db.query(sql, params);
  } catch (error) {
    failure = error as { code?: string; message?: string };
  } finally {
    await db.exec(
      "rollback to savepoint expected_failure; release savepoint expected_failure",
    );
  }
  expect(failure, "the database must reject this call").toBeDefined();
  return failure!;
}

const submitSql =
  "select public.submit_review($1::uuid, 8::smallint, null, $2::jsonb, $3::uuid, $4::uuid)";
function submitParams(courseId = course, semesterId = semester) {
  return [teacher, JSON.stringify(answers), courseId, semesterId];
}

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto, pg_trgm } });
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (
      id uuid primary key, email text, email_confirmed_at timestamptz,
      raw_user_meta_data jsonb default '{}'::jsonb
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to anon, authenticated;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean);
    create table storage.objects (id uuid primary key, bucket_id text, name text);
    alter table storage.objects enable row level security;
  `);
  const folder = resolve("supabase/migrations");
  for (const name of readdirSync(folder)
    .filter((name) => name.endsWith(".sql") && name < migrationName)
    .sort()) {
    try {
      if (name === "20260922100000_reviews_overall_ten_and_word_limit.sql") {
        // Purani migration view columns ka order badalti hai; repository ka mojooda
        // repair yahan wahi ten-bucket view banata hai jo live DB me confirm hui hai.
        const repair = readFileSync(
          resolve("supabase/repair/20260929_repair_review_objects.sql"),
          "utf8",
        );
        const viewRepair = repair.match(
          /drop view if exists public\.person_rating_stats;[\s\S]*?grant select on public\.person_rating_stats to anon, authenticated;/,
        )?.[0];
        if (!viewRepair)
          throw new Error("The existing rating-view repair is missing");
        await db.exec(viewRepair);
      }
      await db.exec(readFileSync(resolve(folder, name), "utf8"));
    } catch (error) {
      throw new Error(`Migration ${name} failed: ${(error as Error).message}`, {
        cause: error,
      });
    }
  }
  const university = await scalar<string>(
    "select id as value from public.universities order by created_at limit 1",
  );
  const domain = await scalar<string>(
    "select email_domains[1] as value from public.universities where id = $1",
    [university],
  );
  for (const [name, id] of Object.entries(ids).filter(([name]) =>
    ["admin", "student", "otherStudent", "inactive", "unconfirmed"].includes(
      name,
    ),
  )) {
    await db.query(
      "insert into auth.users (id, email, email_confirmed_at) values ($1, $2, $3)",
      [
        id,
        `catalog-test-${name.toLowerCase()}@${domain}`,
        name === "unconfirmed" ? null : new Date().toISOString(),
      ],
    );
  }
  await db.query("update public.profiles set role = 'admin' where id = $1", [
    ids.admin,
  ]);
  await db.query("update public.profiles set is_active = false where id = $1", [
    ids.inactive,
  ]);

  await signIn(ids.admin);
  department = await scalar<string>(
    "select public.admin_upsert_department(null, 'Catalog Test Course Department', 'CTC', true) as value",
  );
  const teacherDepartment = await scalar<string>(
    "select public.admin_upsert_department(null, 'Catalog Test Teacher Department', 'CTT', true) as value",
  );
  teacher = await scalar<string>(
    "select public.admin_create_person('Catalog Test Teacher', 'teacher', null, 'external', $1, null, null, null) as value",
    [teacherDepartment],
  );
  staff = await scalar<string>(
    "select public.admin_create_person('Catalog Test Staff', 'university_staff', null, null, null, null, null, null) as value",
  );
  course = await scalar<string>(
    "select public.admin_upsert_course(null, 'Catalog Test AI', 'QA-AI', 3, $1, null, true) as value",
    [department],
  );
  secondCourse = await scalar<string>(
    "select public.admin_upsert_course(null, 'Catalog Test Data Structures', null, null, $1, null, true) as value",
    [department],
  );
  archivedCourse = await scalar<string>(
    "select public.admin_upsert_course(null, 'Catalog Test Archived', 'KEEP-CODE', 4, $1, null, false) as value",
    [department],
  );
  semester = await scalar<string>(
    "select public.admin_upsert_semester(null, 'Existing Custom Spring Label', 'spring', 2090, true, '2090-01-01', '2090-05-01') as value",
  );
  secondSemester = await scalar<string>(
    "select public.admin_upsert_semester(null, 'Fall 2090', 'fall', 2090, false, null, null) as value",
  );
  await db.exec("reset role");
  await db.query(
    "insert into public.universities (id, slug, short_name, full_name) values ($1, 'catalog-test-foreign', 'FOREIGN', 'Catalog Test Foreign University')",
    [ids.foreignUniversity],
  );
  const foreignDepartment = await scalar<string>(
    "insert into public.departments (university_id, slug, name) values ($1, 'foreign-department', 'Foreign Department') returning id as value",
    [ids.foreignUniversity],
  );
  foreignCourse = await scalar<string>(
    "insert into public.courses (department_id, slug, title) values ($1, 'foreign-course', 'Foreign Course') returning id as value",
    [foreignDepartment],
  );
  answers = (
    await db.query<{ key: string; kind: string }>(
      "select key, kind from public.review_criteria where category = 'teacher' and is_active order by sort_order",
    )
  ).rows.map(({ key, kind }) =>
    kind === "star" ? { key, star: 4 } : { key, yes: true },
  );

  await db.query(
    "insert into public.reviews (id, person_id, category, overall_rating, course_id, semester_id) values ($1, $2, 'teacher', 8, $3, $4)",
    [ids.existingReview, teacher, course, semester],
  );
  await db.query(
    "insert into public.review_authors (review_id, author_id, person_id, category, course_id, semester_id) values ($1, $2, $3, 'teacher', $4, $5)",
    [ids.existingReview, ids.otherStudent, teacher, course, semester],
  );
  criteriaBefore = (
    await db.query("select * from public.review_criteria order by id")
  ).rows;
  preservedBefore = (
    await db.query("select * from public.reviews where id = $1", [
      ids.existingReview,
    ])
  ).rows;
  const migration = readFileSync(resolve(folder, migrationName), "utf8");
  await db.exec(migration);
  // Dobara apply karna bhi safe ho; neeche snapshots existing data ko check karte hain.
  migrationReadiness = (await db.exec(migration)).at(-1)!.rows;

  // Live error ko dohrao: purana 1-5 check, mojooda 8/10 review aur 1-10 RPC.
  await db.exec(`
    alter table public.reviews drop constraint reviews_overall_rating_range;
    alter table public.reviews add constraint reviews_overall_rating_check
      check (overall_rating between 1 and 5) not valid;
  `);
  await signIn(ids.student);
  try {
    await submit();
  } catch (error) {
    legacyRatingFailure = error as { code?: string; constraint?: string };
  }
  await db.exec("reset role");
  const ratingRepair = readFileSync(resolve(folder, ratingRepairName), "utf8");
  await db.exec(ratingRepair);
  ratingRepairReadiness = (await db.exec(ratingRepair)).at(-1)!.rows;

  // Live text error ko bhi dohrao: 20-character purani had aur short experience.
  await db.exec(`
    alter table public.reviews drop constraint reviews_comment_word_limit;
    alter table public.reviews add constraint reviews_comment_check
      check (comment is null or char_length(btrim(comment)) between 20 and 2000);
  `);
  await signIn(ids.student);
  try {
    await submit(course, semester, 8, teacher, "Helpful");
  } catch (error) {
    legacyCommentFailure = error as { code?: string; constraint?: string };
  }
  await db.exec("reset role");
  const commentRepair = readFileSync(
    resolve(folder, commentRepairName),
    "utf8",
  );
  await db.exec(commentRepair);
  commentRepairReadiness = (await db.exec(commentRepair)).at(-1)!.rows;
  const concurrency = readFileSync(resolve(folder, concurrencyName), "utf8");
  await db.exec(concurrency);
  concurrencyReadiness = (await db.exec(concurrency)).at(-1)!.rows;
  await db.exec(
    readFileSync(
      resolve(folder, "20261025100000_search_and_duplicate_courses.sql"),
      "utf8",
    ),
  );
  criteriaAfter = (
    await db.query("select * from public.review_criteria order by id")
  ).rows;
  preservedAfter = (
    await db.query("select * from public.reviews where id = $1", [
      ids.existingReview,
    ])
  ).rows;
}, 60_000);

beforeEach(async () => {
  await db.exec("begin");
  await signIn(ids.student);
});
afterEach(async () => {
  await db.exec("rollback; reset role");
});
afterAll(async () => {
  await db?.close();
});

describe("word search and duplicate course cleanup", () => {
  it("matches title variants, partial words, reversed names and department keywords under public RLS", async () => {
    await db.exec("reset role");
    await db.query(
      "update public.people set full_name = 'Ma’am Sarah Khan', display_name = 'Sarah', gender = 'female', headline = 'Computer Science' where id = $1",
      [teacher],
    );
    await db.exec("set role anon");
    for (const term of [
      "mam sar",
      "maam Sarah",
      "MA'AM khan",
      "Khan Sarah",
      "Computer Sarah",
      "CTT Sarah",
    ]) {
      const result = await db.query<{ id: string }>(
        "select id from public.search_all_people($1, 24, 0)",
        [term],
      );
      expect(result.rows.map((row) => row.id)).toContain(teacher);
      const category = await db.query<{ person_id: string }>(
        "select person_id from public.directory_people('teacher', $1)",
        [term],
      );
      expect(category.rows.map((row) => row.person_id)).toContain(teacher);
    }
    await db.exec("reset role");
    await db.query("update public.people set is_active = false where id = $1", [
      teacher,
    ]);
    await db.exec("set role anon");
    expect(
      (await db.query("select * from public.search_all_people('Sarah', 24, 0)"))
        .rows,
    ).toHaveLength(0);
  });

  it("rejects cleanup for students", async () => {
    expect(
      (await rejection("select public.admin_delete_duplicate_courses()"))
        .message,
    ).toBe("You do not have access to this.");
  });

  it("merges courses across departments and archived records while preserving conflicting reviews and offerings", async () => {
    await db.exec("reset role");
    const otherDepartment = await scalar<string>(
      "insert into public.departments (university_id, slug, name) select university_id, 'duplicate-course-test', 'Duplicate Test' from public.departments where id = $1 returning id as value",
      [department],
    );
    const duplicate = await scalar<string>(
      "insert into public.courses (department_id, slug, title, code) values ($1, 'catalog-test-ai-copy', 'CATALOG   TEST-AI', 'DIFFERENT-CODE') returning id as value",
      [otherDepartment],
    );
    const archived = await scalar<string>(
      "insert into public.courses (department_id, slug, title, is_active) values ($1, 'archived-ai-copy', 'Catalog Test AI', false) returning id as value",
      [otherDepartment],
    );
    await signIn(ids.student);
    const originalReview = await submit();
    const duplicateReview = await submit(duplicate);
    await db.exec("reset role");
    const firstOffering = await scalar<string>(
      "insert into public.course_offerings (course_id, semester_id) values ($1, $2) returning id as value",
      [course, semester],
    );
    const duplicateOffering = await scalar<string>(
      "insert into public.course_offerings (course_id, semester_id) values ($1, $2) returning id as value",
      [duplicate, semester],
    );
    await db.query(
      "insert into public.teacher_assignments (person_id, course_offering_id) values ($1, $2), ($1, $3)",
      [teacher, firstOffering, duplicateOffering],
    );
    const reviewCount = await scalar<number>(
      "select count(*)::int as value from public.reviews",
    );
    await signIn(ids.admin);
    const removed = await scalar<number>(
      "select public.admin_delete_duplicate_courses() as value",
    );
    expect(removed).toBeGreaterThanOrEqual(2);
    await db.exec("reset role");
    expect(
      await scalar<number>(
        "select count(*)::int as value from public.courses where id in ($1, $2)",
        [duplicate, archived],
      ),
    ).toBe(0);
    expect(
      await scalar<number>("select count(*)::int as value from public.reviews"),
    ).toBe(reviewCount);
    expect(
      (
        await db.query<{ course_id: string }>(
          "select course_id from public.reviews where id in ($1, $2)",
          [originalReview, duplicateReview],
        )
      ).rows.map((row) => row.course_id),
    ).toEqual([course, course]);
    expect(
      await scalar<number>(
        "select count(*)::int as value from public.teacher_assignments where person_id = $1 and course_offering_id = $2",
        [teacher, firstOffering],
      ),
    ).toBe(1);
    await signIn(ids.student);
    expect((await rejection(submitSql, submitParams())).message).toContain(
      "already reviewed",
    );
    await signIn(ids.admin);
    expect(
      await scalar<number>(
        "select public.admin_delete_duplicate_courses() as value",
      ),
    ).toBe(0);
  });
});

describe("review burst safeguards", () => {
  it("reapplies the guard and indexes without changing reviews or criteria", () => {
    expect(concurrencyReadiness).toEqual([
      {
        concurrent_review_guard_ready: true,
        review_daily_limit_index_ready: true,
        public_review_index_ready: true,
      },
    ]);
    expect(preservedAfter).toEqual(preservedBefore);
    expect(criteriaAfter).toEqual(criteriaBefore);
  });

  it("enforces the daily limit separately for each student", async () => {
    await db.exec(
      "reset role; create or replace function public.review_limits() returns table (max_per_day int, max_edits int) language sql immutable as $$ select 1, 2 $$;",
    );
    await db.query(
      "update public.review_authors set created_at = now() - interval '2 days' where author_id = $1",
      [ids.otherStudent],
    );
    await signIn(ids.student);
    await submit();
    const failure = await rejection(submitSql, submitParams(secondCourse));
    expect(failure.message).toBe(
      "You have reached the daily limit for new reviews.",
    );
    await signIn(ids.otherStudent);
    expect(await submit(secondCourse)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rolls back review, authorship and answers together on invalid answers", async () => {
    const before = await scalar<number>(
      "select count(*)::int as value from public.reviews",
    );
    await rejection(submitSql, [teacher, "[]", course, semester]);
    expect(
      await scalar<number>("select count(*)::int as value from public.reviews"),
    ).toBe(before);
    expect(
      await scalar<number>(
        "select count(*)::int as value from public.review_authors where author_id = $1",
        [ids.student],
      ),
    ).toBe(0);
    expect(
      await scalar<number>(
        "select count(*)::int as value from public.review_answers a left join public.reviews r on r.id = a.review_id where r.id is null",
      ),
    ).toBe(0);
    expect(await submit()).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("experience text and admin moderation", () => {
  const publicReviewSql =
    "select * from public.person_reviews($1) where review_id = $2";

  it("reproduces the observed legacy comment check failure and safely reapplies its repair", () => {
    expect(legacyCommentFailure).toMatchObject({
      code: "23514",
      constraint: "reviews_comment_check",
    });
    expect(commentRepairReadiness).toEqual([
      { comment_word_limit_ready: true, legacy_comment_check_removed: true },
    ]);
    expect(criteriaAfter).toEqual(criteriaBefore);
    expect(preservedAfter).toEqual(preservedBefore);
  });

  it("queues short text for admins, hides it from visitors, then publishes it after approval", async () => {
    const reviewId = await submit(course, semester, 8, teacher, "Helpful");
    expect(
      await scalar<string>(
        "select moderation_status as value from public.reviews where id = $1",
        [reviewId],
      ),
    ).toBe("pending");

    await db.exec("set role anon");
    expect(
      (await db.query(publicReviewSql, [teacher, reviewId])).rows,
    ).toMatchObject([{ comment: null, overall_rating: 8 }]);

    await signIn(ids.admin);
    expect(
      (
        await db.query(
          "select * from public.admin_review_queue('pending') where review_id = $1",
          [reviewId],
        )
      ).rows,
    ).toMatchObject([{ comment: "Helpful", overall_rating: 8 }]);
    await db.query("select public.moderate_review($1, 'approve')", [reviewId]);
    expect(
      await scalar<number>(
        "select count(*)::int as value from public.admin_audit_log where entity_id = $1 and action = 'review.approve'",
        [reviewId],
      ),
    ).toBe(1);
    await db.exec("set role anon");
    expect(
      (await db.query(publicReviewSql, [teacher, reviewId])).rows,
    ).toMatchObject([{ comment: "Helpful", overall_rating: 8 }]);
  });

  it("requires admin approval again when an approved experience is edited", async () => {
    const reviewId = await submit(course, semester, 8, teacher, "Helpful");
    await signIn(ids.admin);
    await db.query("select public.moderate_review($1, 'approve')", [reviewId]);
    await signIn(ids.student);
    await db.query(
      "select public.update_my_review($1, 8::smallint, 'Clear teaching', $2::jsonb)",
      [reviewId, JSON.stringify(answers)],
    );
    expect(
      await scalar<string>(
        "select moderation_status as value from public.reviews where id = $1",
        [reviewId],
      ),
    ).toBe("pending");
    await db.exec("set role anon");
    expect(
      (await db.query(publicReviewSql, [teacher, reviewId])).rows,
    ).toMatchObject([{ comment: null }]);
  });

  it("keeps rejected experience text hidden while its rating still counts", async () => {
    const reviewId = await submit(course, semester, 8, teacher, "Helpful");
    await signIn(ids.admin);
    await db.query("select public.moderate_review($1, 'reject')", [reviewId]);
    await db.exec("set role anon");
    expect(
      (await db.query(publicReviewSql, [teacher, reviewId])).rows,
    ).toMatchObject([{ comment: null, overall_rating: 8 }]);
    expect(
      await scalar<number>(
        "select review_count as value from public.person_rating_stats where person_id = $1",
        [teacher],
      ),
    ).toBe(2);
  });

  it("prevents students from accessing the moderation queue or approving their own text", async () => {
    const reviewId = await submit(course, semester, 8, teacher, "Helpful");
    expect(
      (await rejection("select * from public.admin_review_queue('pending')"))
        .code,
    ).toBe("42501");
    expect(
      (
        await rejection("select public.moderate_review($1, 'approve')", [
          reviewId,
        ])
      ).code,
    ).toBe("42501");
  });

  it.each(["words", "characters"])(
    "retains the server's %s limit for experience text",
    async (kind) => {
      const comment =
        kind === "words" ? "helpful ".repeat(151).trim() : "a".repeat(1501);
      const failure = await rejection(
        "select public.submit_review($1::uuid, 8::smallint, $2::text, $3::jsonb, $4::uuid, $5::uuid)",
        [teacher, comment, JSON.stringify(answers), course, semester],
      );
      expect(failure.code).toBe("23514");
      expect(failure.message).toBe(
        kind === "words"
          ? "Keep your comment to 150 words or fewer."
          : "Your comment is too long. Please shorten it.",
      );
    },
  );
});

describe("legacy overall rating constraint repair", () => {
  it("reproduces the observed 23514 failure from the obsolete five-point check", () => {
    expect(legacyRatingFailure).toMatchObject({
      code: "23514",
      constraint: "reviews_overall_rating_check",
    });
  });

  it("is safe to reapply and reports both rating readiness flags", () => {
    expect(ratingRepairReadiness).toEqual([
      {
        overall_rating_1_to_10_ready: true,
        legacy_1_to_5_check_removed: true,
      },
    ]);
  });

  it("saves the previously rejected eight-point rating without rescaling existing reviews", async () => {
    const reviewId = await submit();
    expect(
      await scalar<number>(
        "select overall_rating as value from public.reviews where id = $1",
        [reviewId],
      ),
    ).toBe(8);
    expect(preservedAfter).toEqual(preservedBefore);
    expect(criteriaAfter).toEqual(criteriaBefore);
  });

  it.each([0, 11])(
    "keeps the table's one-to-ten boundary enforced (%i)",
    async (rating) => {
      await db.exec("reset role");
      const error = await rejection(
        "insert into public.reviews (person_id, category, overall_rating, course_id, semester_id) values ($1, 'teacher', $2, $3, $4)",
        [teacher, rating, course, semester],
      );
      expect(error.code).toBe("23514");
      expect(error.message).toContain("reviews_overall_rating_range");
    },
  );
});

describe("shared catalog review rules", () => {
  it("confirms all four SQL Editor readiness flags after safely reapplying the migration", () => {
    expect(migrationReadiness).toEqual([
      {
        course_list_ready: true,
        semester_list_ready: true,
        shared_review_courses_ready: true,
        teacher_card_creation_ready: true,
      },
    ]);
  });
  it("preserves saved reviews and every existing review question", () => {
    expect(criteriaAfter).toEqual(criteriaBefore);
    expect(preservedAfter).toEqual(preservedBefore);
    expect(criteriaAfter.length).toBeGreaterThan(0);
  });

  it.each([ids.admin, ids.inactive, ids.unconfirmed])(
    "blocks accounts that are not active confirmed students (%s)",
    async (id) => {
      await signIn(id);
      const error = await rejection(submitSql, submitParams());
      expect(error.code).toBe("42501");
      expect(error.message).toBe("Your account cannot post reviews yet.");
    },
  );

  it("lets a student review a teacher without assignments using another department's course", async () => {
    expect(
      await scalar<number>(
        "select count(*)::int as value from public.teacher_assignments where person_id = $1",
        [teacher],
      ),
    ).toBe(0);
    expect(await submit()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("combines different courses and semesters into the same teacher rating", async () => {
    await submit(course, semester, 10);
    await submit(course, secondSemester, 6);
    await submit(secondCourse, semester, 8);
    const result = await db.query<{
      review_count: number;
      average_rating: string;
    }>(
      "select review_count, average_rating from public.person_rating_stats where person_id = $1",
      [teacher],
    );
    expect(result.rows).toEqual([{ review_count: 4, average_rating: "8.00" }]);
  });

  it("rejects a repeated student, teacher, course and semester scope", async () => {
    await submit();
    const error = await rejection(submitSql, submitParams());
    expect(error.code).toBe("23505");
    expect(error.message).toContain(
      "already reviewed this course for this semester",
    );
  });

  it.each([
    "foreign",
    "archived",
    "inactive-department",
    "inactive-university",
  ])("rejects a %s course", async (kind) => {
    const selected =
      kind === "foreign"
        ? foreignCourse
        : kind === "archived"
          ? archivedCourse
          : course;
    if (kind.startsWith("inactive")) {
      await db.exec("reset role");
      if (kind === "inactive-department")
        await db.query(
          "update public.departments set is_active = false where id = $1",
          [department],
        );
      else
        await db.query(
          "update public.universities set is_active = false where id = (select university_id from public.departments where id = $1)",
          [department],
        );
      await signIn(ids.student);
    }
    const error = await rejection(submitSql, submitParams(selected));
    expect(error.code).toBe("P0002");
    expect(error.message).toBe("Choose a valid course.");
  });

  it("still rejects unanswered questions without saving a partial review", async () => {
    const error = await rejection(submitSql, [teacher, "[]", course, semester]);
    expect(error.code).toBe("23514");
    expect(error.message).toContain("answer every question");
    expect(
      await scalar<number>(
        "select count(*)::int as value from public.review_authors where author_id = $1",
        [ids.student],
      ),
    ).toBe(0);
  });

  it("keeps semester-only reviews working for non-teaching staff", async () => {
    const staffAnswers = (
      await db.query<{ key: string; kind: string }>(
        "select key, kind from public.review_criteria where category = 'university_staff' and is_active",
      )
    ).rows.map(({ key, kind }) =>
      kind === "star" ? { key, star: 4 } : { key, yes: true },
    );
    const review = await scalar<string>(
      "select public.submit_review($1::uuid, 8::smallint, null, $2::jsonb, null, $3::uuid) as value",
      [staff, JSON.stringify(staffAnswers), semester],
    );
    expect(review).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("admin bulk reference lists", () => {
  it("creates an internal teacher card with exactly one automatic faculty role", async () => {
    await signIn(ids.admin);
    const created = await scalar<string>(
      "select public.admin_create_person('New Internal Teacher Card', 'teacher', null, 'internal', $1, null, null, null) as value",
      [department],
    );
    const roles = (
      await db.query(
        "select category, is_primary, is_active, is_auto from public.person_roles where person_id = $1 order by category",
        [created],
      )
    ).rows;
    expect(roles).toEqual([
      {
        category: "teacher",
        is_primary: true,
        is_active: true,
        is_auto: false,
      },
      {
        category: "faculty",
        is_primary: false,
        is_active: true,
        is_auto: true,
      },
    ]);
    expect(
      await scalar<number>(
        "select count(*)::int as value from public.teacher_assignments where person_id = $1",
        [created],
      ),
    ).toBe(0);
  });

  it("refuses students and anonymous users at the database boundary", async () => {
    const sql = "select * from public.admin_add_course_list($1, $2::jsonb)";
    const params = [department, '[{"title":"Unauthorized course"}]'];
    expect((await rejection(sql, params)).code).toBe("42501");
    expect(
      (
        await rejection(
          "select * from public.admin_add_semester_list($1::jsonb)",
          ['[{"label":"Spring 2091","season":"spring","year":2091}]'],
        )
      ).code,
    ).toBe("42501");
    await db.exec("reset role; set role anon");
    expect((await rejection(sql, params)).code).toBe("42501");
  });

  it("adds a course list once, skips duplicates and preserves archived records", async () => {
    await signIn(ids.admin);
    const before = (
      await db.query("select * from public.courses where id = $1", [
        archivedCourse,
      ])
    ).rows;
    const result = await db.query(
      "select * from public.admin_add_course_list($1, $2::jsonb)",
      [
        department,
        JSON.stringify([
          { title: "New Shared Course", code: "NEW" },
          { title: "new shared course", code: null },
          { title: "catalog test archived", code: "SHOULD-NOT-REPLACE" },
        ]),
      ],
    );
    expect(result.rows).toEqual([{ added: 1, skipped: 2 }]);
    expect(
      (
        await db.query("select * from public.courses where id = $1", [
          archivedCourse,
        ])
      ).rows,
    ).toEqual(before);
    expect(
      await scalar<number>(
        "select count(*)::int as value from public.admin_audit_log where action = 'course.create' and details->>'title' = 'New Shared Course'",
      ),
    ).toBe(1);
  });

  it("rolls back the entire course list if any entry is invalid", async () => {
    await signIn(ids.admin);
    const error = await rejection(
      "select * from public.admin_add_course_list($1, $2::jsonb)",
      [
        department,
        JSON.stringify([
          { title: "Must Roll Back" },
          { title: "x".repeat(161) },
        ]),
      ],
    );
    expect(error.code).toBe("23514");
    expect(
      await scalar<number>(
        "select count(*)::int as value from public.courses where title = 'Must Roll Back'",
      ),
    ).toBe(0);
    expect(
      await scalar<number>(
        "select count(*)::int as value from public.admin_audit_log where details->>'title' = 'Must Roll Back'",
      ),
    ).toBe(0);
  });

  it("preserves the current semester's label and dates when saving shared semesters", async () => {
    await signIn(ids.admin);
    const before = (
      await db.query("select * from public.semesters where id = $1", [semester])
    ).rows;
    const result = await db.query(
      "select * from public.admin_add_semester_list($1::jsonb)",
      [
        JSON.stringify([
          { label: "Spring 2090", season: "spring", year: 2090 },
          { label: "Spring 2091", season: "spring", year: 2091 },
          { label: "Duplicate", season: "spring", year: 2091 },
        ]),
      ],
    );
    expect(result.rows).toEqual([{ added: 1, skipped: 2 }]);
    expect(
      (
        await db.query("select * from public.semesters where id = $1", [
          semester,
        ])
      ).rows,
    ).toEqual(before);
    expect(
      await scalar<string>(
        "select id as value from public.semesters where is_current",
      ),
    ).toBe(semester);
  });

  it("rolls back the entire semester list if a later year is invalid", async () => {
    await signIn(ids.admin);
    const error = await rejection(
      "select * from public.admin_add_semester_list($1::jsonb)",
      [
        JSON.stringify([
          { label: "Winter 2091", season: "winter", year: 2091 },
          { label: "Invalid", season: "spring", year: 2200 },
        ]),
      ],
    );
    expect(error.code).toBe("23514");
    expect(
      await scalar<number>(
        "select count(*)::int as value from public.semesters where season = 'winter' and year = 2091",
      ),
    ).toBe(0);
  });

  it("validates JSON types and the batch limit even for direct RPC calls", async () => {
    await signIn(ids.admin);
    for (const entries of [
      {},
      [],
      [{ title: 42 }],
      [{ title: "Bad code", code: true }],
      Array.from({ length: 201 }, () => ({ title: "Too many" })),
    ]) {
      expect(
        (
          await rejection(
            "select * from public.admin_add_course_list($1, $2::jsonb)",
            [department, JSON.stringify(entries)],
          )
        ).code,
      ).toBe("23514");
    }
    for (const entries of [
      null,
      {},
      [],
      [{ label: "Bad season", season: "monsoon", year: 2091 }],
      [{ label: "Bad year", season: "spring", year: "2091" }],
      Array.from({ length: 201 }, () => ({
        label: "Spring 2091",
        season: "spring",
        year: 2091,
      })),
    ]) {
      expect(
        (
          await rejection(
            "select * from public.admin_add_semester_list($1::jsonb)",
            [JSON.stringify(entries)],
          )
        ).code,
      ).toBe("23514");
    }
  });
});
