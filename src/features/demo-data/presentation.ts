import type { PersonCategory, PersonSummary } from "@/features/people/types";

function nameWords(person: Pick<PersonSummary, "name" | "slug">): string {
  return `${person.name} ${person.slug}`
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
}

export function isZeeshanSpotlight(person: PersonSummary): boolean {
  const hr =
    person.primaryCategory === "hr_staff" ||
    person.roles.some((role) => role.category === "hr_staff");
  return hr && /\bzeeshan\b/.test(nameWords(person));
}

/** Display placements in an explicitly labelled preview, never a rating override. */
export function orderDemoPeople(
  people: PersonSummary[],
  category: PersonCategory,
): PersonSummary[] {
  const priority = (person: PersonSummary) => {
    const name = nameWords(person);
    if (category === "faculty") {
      if (/\bsarmad\b/.test(name)) return 0;
      if (/\babdul\s+basit\b/.test(name)) return 1;
      if (/\bmansoor\b/.test(name)) return 2;
    }
    if (category === "hr_staff" && isZeeshanSpotlight(person)) return 0;
    if (
      category === "lab_instructor" &&
      /\b(?:rafiuli?|rafiullah|rafi\s+ullah)\b/.test(name)
    )
      return 1000;
    return 100;
  };
  return [...people].sort((a, b) => priority(a) - priority(b));
}
