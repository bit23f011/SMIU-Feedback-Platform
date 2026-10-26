import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  tag: vi.fn(),
  path: vi.fn(),
  log: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidateTag: mocks.tag,
  revalidatePath: mocks.path,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/server/diagnostics", () => ({ logBackendError: mocks.log }));

import { setDemoDataAction } from "@/features/demo-data/actions";
import { EMPTY_DEMO_DATA_ACTION } from "@/features/demo-data/types";
import { PUBLIC_DATA_TAG } from "@/lib/supabase/public";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ error: null });
});

describe("demo toggle action", () => {
  it.each([true, false])(
    "refreshes public data and layouts after switching to %s",
    async (enabled) => {
      const form = new FormData();
      form.set("enabled", String(enabled));
      expect(await setDemoDataAction(EMPTY_DEMO_DATA_ACTION, form)).toEqual({
        ok: true,
      });
      expect(mocks.rpc).toHaveBeenCalledWith("admin_set_demo_data", {
        p_enabled: enabled,
      });
      expect(mocks.tag).toHaveBeenCalledWith(PUBLIC_DATA_TAG);
      expect(mocks.path).toHaveBeenCalledWith("/", "layout");
    },
  );

  it("rejects missing and malformed toggle values without writing", async () => {
    for (const value of [null, "on", "1", ""]) {
      const form = new FormData();
      if (value !== null) form.set("enabled", value);
      expect((await setDemoDataAction(EMPTY_DEMO_DATA_ACTION, form)).ok).toBe(
        false,
      );
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("preserves errors without reporting success or invalidating data after a rejected write", async () => {
    mocks.rpc.mockResolvedValue({
      error: { message: "You do not have access to this." },
    });
    const form = new FormData();
    form.set("enabled", "true");
    expect(await setDemoDataAction(EMPTY_DEMO_DATA_ACTION, form)).toEqual({
      ok: false,
      error: "You do not have access to this.",
    });
    expect(mocks.tag).not.toHaveBeenCalled();
    expect(mocks.path).not.toHaveBeenCalled();
  });
});
