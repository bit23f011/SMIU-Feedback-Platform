// @vitest-environment node
import * as React from "react";
import { mkdirSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type { PersonSummary } from "@/features/people/types";

const mocks = vi.hoisted(() => ({ people: vi.fn(), demo: vi.fn() }));
vi.mock("@/features/people/queries", () => ({
  listPeopleByCategory: mocks.people,
}));
vi.mock("@/features/demo-data/queries", () => ({
  isDemoDataEnabled: mocks.demo,
}));
import { FeaturedSpotlight } from "@/features/home/featured-spotlight";
import { PersonCard } from "@/features/people/person-card";

const zeeshan: PersonSummary = {
  id: "spotlight",
  name: "Sir Zeeshan",
  slug: "sir-zeeshan",
  primaryCategory: "hr_staff",
  gender: "male",
  teacherType: null,
  photoUrl: null,
  headline: null,
  roles: [
    { category: "hr_staff", title: null, department: null, isPrimary: true },
  ],
  rating: null,
  reviewCount: null,
  demoMode: true,
};
beforeEach(() => {
  mocks.people.mockResolvedValue({ people: [zeeshan], failed: false });
  mocks.demo.mockResolvedValue(true);
});

it("features the existing HR profile with a demo placement and animation without inventing a score", async () => {
  const html = renderToStaticMarkup(await FeaturedSpotlight());
  expect(html).toContain("/people/sir-zeeshan");
  expect(html).toContain("Demo #1 overall");
  expect(html).toContain("spotlight-confetti");
  expect(html).not.toContain("Highest rated");
  mkdirSync(".verify_tmp", { recursive: true });
  const card = renderToStaticMarkup(
    <PersonCard person={{ ...zeeshan, rating: 8, reviewCount: 12 }} />,
  );
  expect(card).toContain("Demo #1 overall");
  expect(card).toContain("Includes demo samples");
  writeFileSync(
    ".verify_tmp/spotlight-preview.html",
    `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>__CSS__</style></head><body style="background:#f8f9fc;padding:24px"><main>${html}<div style="max-width:360px;margin:20px auto">${card}</div></main></body></html>`,
  );
});
it("keeps the editorial feature when demo mode is OFF, without a fabricated rank badge", async () => {
  mocks.demo.mockResolvedValue(false);
  const html = renderToStaticMarkup(await FeaturedSpotlight());
  expect(html).toContain("Featured spotlight");
  expect(html).not.toContain("#1 overall");
});
it("does not invent or arbitrarily select a profile when the directory match is missing or ambiguous", async () => {
  mocks.people.mockResolvedValue({ people: [], failed: false });
  expect(await FeaturedSpotlight()).toBeNull();
  mocks.people.mockResolvedValue({
    people: [
      zeeshan,
      {
        ...zeeshan,
        id: "other",
        slug: "zeeshan-ahmed",
        name: "Sir Zeeshan Ahmed",
      },
    ],
    failed: false,
  });
  expect(await FeaturedSpotlight()).toBeNull();
});
