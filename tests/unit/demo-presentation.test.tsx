import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import {
  isZeeshanSpotlight,
  orderDemoPeople,
} from "@/features/demo-data/presentation";
import {
  SpotlightBadge,
  SpotlightCelebration,
} from "@/features/people/spotlight-accent";
import type { PersonCategory, PersonSummary } from "@/features/people/types";

function person(name: string, category: PersonCategory): PersonSummary {
  return {
    id: name,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    primaryCategory: category,
    roles: [{ category, title: null, department: null, isPrimary: true }],
    teacherType: null,
    gender: "male",
    photoUrl: null,
    headline: null,
    rating: 8,
    reviewCount: 5,
  };
}
it("arranges faculty preview placements while preserving every rating and the input list", () => {
  const people = [
    person("Sir Mansoor", "faculty"),
    person("Other Faculty", "faculty"),
    person("Dr. Abdul Basit", "faculty"),
    person("Sir Sarmad", "faculty"),
  ];
  const before = structuredClone(people);
  expect(orderDemoPeople(people, "faculty").map((p) => p.name)).toEqual([
    "Sir Sarmad",
    "Dr. Abdul Basit",
    "Sir Mansoor",
    "Other Faculty",
  ]);
  expect(people).toEqual(before);
  expect(orderDemoPeople(people, "teacher")).toEqual(before);
});
it("places the requested lab profile at the end without lowering its rating", () => {
  const rafiuli = person("Sir Rafiuli", "lab_instructor");
  const people = [rafiuli, person("Other Instructor", "lab_instructor")];
  expect(orderDemoPeople(people, "lab_instructor").at(-1)).toEqual(rafiuli);
  expect(rafiuli.rating).toBe(8);
});
it("limits the Zeeshan spotlight to HR and matches complete name tokens", () => {
  expect(isZeeshanSpotlight(person("Sir Zeeshan Ahmed", "hr_staff"))).toBe(
    true,
  );
  expect(isZeeshanSpotlight(person("Sir Zeeshan", "teacher"))).toBe(false);
  expect(isZeeshanSpotlight(person("Zeeshana", "hr_staff"))).toBe(false);
});
it("labels the configured overall placement as demo and keeps decorative animation out of accessibility", () => {
  expect(renderToStaticMarkup(<SpotlightBadge demo />)).toContain(
    "Demo #1 overall",
  );
  expect(renderToStaticMarkup(<SpotlightBadge />)).toContain(
    "Featured spotlight",
  );
  const html = renderToStaticMarkup(<SpotlightCelebration />);
  expect(html).toContain('aria-hidden="true"');
  expect(html.match(/animation-delay/g) ?? []).toHaveLength(12);
});
