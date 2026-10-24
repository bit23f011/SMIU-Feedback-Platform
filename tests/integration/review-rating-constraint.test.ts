// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const repair = readFileSync(
  resolve(
    "supabase/migrations/20261024110000_review_rating_constraint_repair.sql",
  ),
  "utf8",
);
let db: PGlite;

// Har test ka apna PostgreSQL; repair ki transaction aur data preservation asli SQL se check ho.
beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    create table public.reviews (id smallint primary key, overall_rating smallint not null);
    insert into public.reviews values (1, 4), (2, 8);
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

describe("rating constraint repair safety", () => {
  it("preserves an unexpected legacy constraint instead of replacing custom validation", async () => {
    await db.exec(`
      alter table public.reviews add constraint reviews_overall_rating_check
        check (overall_rating between 1 and 6) not valid;
    `);
    const before = await snapshot();
    await expect(db.exec(repair)).rejects.toMatchObject({ code: "55000" });
    await db.exec("rollback");
    expect(await snapshot()).toEqual(before);
  });

  it("preserves both checks when the current range has an unexpected definition", async () => {
    await db.exec(`
      alter table public.reviews add constraint reviews_overall_rating_check
        check (overall_rating between 1 and 5) not valid;
      alter table public.reviews add constraint reviews_overall_rating_range
        check (overall_rating between 1 and 9);
    `);
    const before = await snapshot();
    await expect(db.exec(repair)).rejects.toMatchObject({ code: "55000" });
    await db.exec("rollback");
    expect(await snapshot()).toEqual(before);
  });

  it("rolls back the whole repair if saved data is outside one to ten without rewriting ratings", async () => {
    await db.exec(`
      update public.reviews set overall_rating = 12 where id = 2;
      alter table public.reviews add constraint reviews_overall_rating_check
        check (overall_rating between 1 and 5) not valid;
    `);
    const before = await snapshot();
    await expect(db.exec(repair)).rejects.toMatchObject({ code: "23514" });
    await db.exec("rollback");
    expect(await snapshot()).toEqual(before);
  });
});
