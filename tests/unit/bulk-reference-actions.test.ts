import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
  log: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/server/diagnostics", () => ({ logBackendError: mocks.log }));

import {
  addCourseListAction,
  addSemesterListAction,
} from "@/features/admin/reference/bulk-actions";
import { EMPTY_BULK_STATE } from "@/features/admin/reference/bulk-list";

const department = "10000000-0000-4000-8000-000000000001";
const form = (entries: string, departmentId = department) => {
  const data = new FormData();
  data.set("departmentId", departmentId);
  data.set("entries", entries);
  return data;
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({
    data: [{ added: 1, skipped: 1 }],
    error: null,
  });
});

describe("saving shared reference lists", () => {
  it("saves normalized courses atomically and refreshes cards and forms", async () => {
    expect(
      await addCourseListAction(
        EMPTY_BULK_STATE,
        form("AI\nAI\nCS-301 | Computer Networks"),
      ),
    ).toEqual({ ok: true, added: 1, skipped: 2 });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_add_course_list", {
      p_department_id: department,
      p_courses: [
        { title: "AI", code: null },
        { title: "Computer Networks", code: "CS-301" },
      ],
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("saves compact semester labels without marking one current", async () => {
    await addSemesterListAction(EMPTY_BULK_STATE, form("spring24\nfall24"));
    expect(mocks.rpc).toHaveBeenCalledWith("admin_add_semester_list", {
      p_semesters: [
        { label: "Spring 2024", season: "spring", year: 2024 },
        { label: "Fall 2024", season: "fall", year: 2024 },
      ],
    });
  });

  it("keeps invalid or empty input from reaching the RPC", async () => {
    expect(
      (await addCourseListAction(EMPTY_BULK_STATE, form("AI", ""))).ok,
    ).toBe(false);
    expect((await addSemesterListAction(EMPTY_BULK_STATE, form(""))).ok).toBe(
      false,
    );
    expect(
      (await addSemesterListAction(EMPTY_BULK_STATE, form("Invalid semester")))
        .ok,
    ).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("reports admin authorization failures without pretending a list saved", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "You do not have access to this." },
    });
    expect(await addCourseListAction(EMPTY_BULK_STATE, form("AI"))).toEqual({
      ok: false,
      error: "You do not have access to this.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("keeps raw database messages out of the form response", async () => {
    const error = {
      code: "PGRST202",
      message: "Internal private database value",
    };
    mocks.rpc.mockResolvedValue({ data: null, error });
    const result = await addSemesterListAction(
      EMPTY_BULK_STATE,
      form("spring24"),
    );
    expect(result.ok).toBe(false);
    expect(result.error).not.toContain(error.message);
    expect(mocks.log).toHaveBeenCalledWith("admin.semesters.bulk", error);
  });
});
