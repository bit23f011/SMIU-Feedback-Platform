"use server";

import { searchAllPeople } from "@/features/people/queries";
import { searchCourses } from "@/features/discovery/queries";

export type SearchSuggestion = {
  id: string;
  label: string;
  detail: string;
  href: string;
};

export async function getSearchSuggestions(
  mode: "people" | "courses",
  query: string,
): Promise<{ suggestions: SearchSuggestion[]; failed: boolean }> {
  const term = query.trim().slice(0, 80);
  if (!term) return { suggestions: [], failed: false };
  if (mode === "courses") {
    const result = await searchCourses({ search: term, perPage: 6 });
    return {
      failed: result.failed,
      suggestions: result.courses.map((course) => ({
        id: course.id,
        label: course.title,
        detail: course.code ?? "Course",
        href: `/courses/${course.slug}`,
      })),
    };
  }
  const result = await searchAllPeople({ search: term });
  return {
    failed: result.failed,
    suggestions: result.people.slice(0, 6).map((person) => ({
      id: person.id,
      label: person.name,
      detail:
        person.roles.find((role) => role.isPrimary)?.department ??
        person.headline ??
        "SMIU",
      href: `/people/${person.slug}`,
    })),
  };
}
