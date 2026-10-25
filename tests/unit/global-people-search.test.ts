// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: vi.fn(), ratings: vi.fn() }));
vi.mock("react", async (original) => ({
  ...(await original<object>()),
  cache: (fn: unknown) => fn,
}));
vi.mock("@/lib/supabase/public", () => ({
  createSupabasePublicClient: mocks.client,
}));
vi.mock("@/features/reviews/queries", () => ({
  getRatingStatsForPeople: mocks.ratings,
  getPersonRatingStats: vi.fn(),
}));
import { searchAllPeople } from "@/features/people/queries";

function person(id: string, category: string) {
  return {
    id,
    slug: id,
    full_name: id,
    display_name: null,
    gender: null,
    photo_url: null,
    headline: null,
    primary_category: category,
    teacher_type: null,
    person_roles: [
      {
        category,
        is_active: true,
        is_primary: true,
        title_override: null,
        positions: null,
        departments: null,
      },
    ],
  };
}
function queryResult(result: object) {
  const query: Record<string, any> = {
    then: (resolve: (value: object) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  for (const method of ["select", "eq", "order", "range", "or"])
    query[method] = vi.fn(() => query);
  mocks.client.mockReturnValue({ from: vi.fn(() => query) });
  return query;
}
beforeEach(() => {
  mocks.client.mockReset();
  mocks.ratings.mockReset();
  mocks.ratings.mockResolvedValue(new Map());
});

it("returns teacher and staff matches together without adding a category filter", async () => {
  const query = queryResult({
    data: [person("teacher-a", "teacher"), person("staff-a", "hr_staff")],
    count: 2,
    error: null,
  });
  const result = await searchAllPeople({ search: "Ahmed" });
  expect(result.people.map((value) => value.primaryCategory)).toEqual([
    "teacher",
    "hr_staff",
  ]);
  expect(result.total).toBe(2);
  expect(query.eq.mock.calls).toEqual([
    ["is_active", true],
    ["person_roles.is_active", true],
  ]);
  expect(query.or).toHaveBeenCalledWith(
    "full_name.ilike.%Ahmed%,display_name.ilike.%Ahmed%",
  );
});
it("keeps multiple public roles on one result and preserves the paginated total", async () => {
  const row = person("teacher-a", "teacher");
  row.person_roles.push({
    ...row.person_roles[0],
    category: "faculty",
    is_primary: false,
  });
  const query = queryResult({ data: [row], count: 49, error: null });
  const result = await searchAllPeople({ page: 2 });
  expect(result.people).toHaveLength(1);
  expect(result.people[0].roles).toHaveLength(2);
  expect(result.total).toBe(49);
  expect(query.range).toHaveBeenCalledWith(24, 47);
});
it("reports a failed query separately from no matching people", async () => {
  queryResult({
    data: null,
    count: null,
    error: { message: "Internal database error" },
  });
  expect(await searchAllPeople({ search: "Ahmed" })).toEqual({
    people: [],
    total: 0,
    failed: true,
  });
});
