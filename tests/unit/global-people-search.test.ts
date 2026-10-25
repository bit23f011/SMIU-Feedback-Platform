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
    total_count: 2,
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
  const rpc = vi.fn().mockResolvedValue(result);
  mocks.client.mockReturnValue({ rpc });
  return rpc;
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
  expect(query).toHaveBeenCalledWith("search_all_people", {
    p_search: "Ahmed",
    p_limit: 24,
    p_offset: 0,
  });
});
it("keeps multiple public roles on one result and preserves the paginated total", async () => {
  const row = person("teacher-a", "teacher");
  row.total_count = 49;
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
  expect(query).toHaveBeenCalledWith("search_all_people", {
    p_search: null,
    p_limit: 24,
    p_offset: 24,
  });
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
