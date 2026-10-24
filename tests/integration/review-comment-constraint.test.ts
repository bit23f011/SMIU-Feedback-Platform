// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const repair = readFileSync(
  resolve(
    "supabase/migrations/20261024120000_review_comment_constraint_repair.sql",
  ),
  "utf8",
);
let db: PGlite;

// Repair ki transaction custom constraints aur saved reviews ko mehfooz rakhe.
beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    create table public.reviews (
      id smallint primary key, overall_rating smallint not null, comment text
    );
    insert into public.reviews values
      (1, 4, null), (2, 8, 'Existing review text is preserved.');
  `);
});

afterEach(async () => {
  await db?.close();
});

async function snapshot() {
  return {
    reviews: (await db.query("select * from public.reviews order by id")).rows,
    constraints: (
      await db.query(`
        select conname, pg_get_constraintdef(oid) as definition, convalidated
          from pg_constraint where conrelid = 'public.reviews'::regclass order by conname
      `)
    ).rows,
  };
}

describe("comment constraint repair safety", () => {
  it("repairs short comments when the SQL Editor runs the DO block on its own", async () => {
    await db.exec(`
      alter table public.reviews add constraint reviews_comment_check
        check (comment is null or char_length(btrim(comment)) between 20 and 2000);
    `);
    const before = (await snapshot()).reviews;
    // Separate SQL Editor calls must not rely on a previous session's temp table.
    const atomicRepair = repair.match(/do \$\$[\s\S]*?\$\$;/)?.[0];
    expect(atomicRepair).toBeDefined();
    await db.exec(atomicRepair!);
    const readiness = repair.slice(
      repair.indexOf(atomicRepair!) + atomicRepair!.length,
    );
    expect((await db.exec(readiness)).at(-1)!.rows).toEqual([
      { comment_word_limit_ready: true, legacy_comment_check_removed: true },
    ]);
    expect((await snapshot()).reviews).toEqual(before);
    await db.exec("insert into public.reviews values (3, 8, 'Helpful')");
    expect(
      (
        await db.query(
          "select to_regclass('pg_temp.profaura_review_comment_policy') as helper",
        )
      ).rows,
    ).toEqual([{ helper: null }]);
  });

  it("preserves an unexpected legacy comment rule", async () => {
    await db.exec(`
      alter table public.reviews add constraint reviews_comment_check
        check (comment is null or char_length(btrim(comment)) between 25 and 2000);
    `);
    const before = await snapshot();
    await expect(db.exec(repair)).rejects.toMatchObject({ code: "55000" });
    await db.exec("rollback");
    expect(await snapshot()).toEqual(before);
  });

  it("safely reapplies within an outer migration transaction", async () => {
    await db.exec("begin");
    await db.exec(repair);
    const before = await snapshot();
    expect((await db.exec(repair)).at(-1)!.rows).toEqual([
      { comment_word_limit_ready: true, legacy_comment_check_removed: true },
    ]);
    expect(await snapshot()).toEqual(before);
    await db.exec("commit");
  });

  it("adds a missing rule and enforces word and character boundaries", async () => {
    await db.exec(repair);
    for (const comment of [
      null,
      "Helpful",
      "a".repeat(1500),
      "a ".repeat(150).trim(),
    ]) {
      await db.query("update public.reviews set comment = $1 where id = 1", [
        comment,
      ]);
    }
    for (const comment of [
      "",
      "   ",
      "a".repeat(1501),
      "a ".repeat(151).trim(),
    ]) {
      await expect(
        db.query("update public.reviews set comment = $1 where id = 1", [
          comment,
        ]),
      ).rejects.toMatchObject({
        code: "23514",
        constraint: "reviews_comment_word_limit",
      });
    }
  });

  it("preserves both checks if the current comment rule has a custom definition", async () => {
    await db.exec(`
      alter table public.reviews add constraint reviews_comment_check
        check (comment is null or char_length(btrim(comment)) between 20 and 2000);
      alter table public.reviews add constraint reviews_comment_word_limit
        check (comment is null or char_length(btrim(comment)) between 1 and 1000);
    `);
    const before = await snapshot();
    await expect(db.exec(repair)).rejects.toMatchObject({ code: "55000" });
    await db.exec("rollback");
    expect(await snapshot()).toEqual(before);
  });

  it("rolls back if an existing experience exceeds 150 words without rewriting text or ratings", async () => {
    await db.query("update public.reviews set comment = $1 where id = 2", [
      "helpful ".repeat(151).trim(),
    ]);
    await db.exec(`
      alter table public.reviews add constraint reviews_comment_check
        check (comment is null or char_length(btrim(comment)) between 20 and 2000);
    `);
    const before = await snapshot();
    await expect(db.exec(repair)).rejects.toMatchObject({ code: "23514" });
    await db.exec("rollback");
    expect(await snapshot()).toEqual(before);
  });
});
