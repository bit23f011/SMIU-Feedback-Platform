import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), path: vi.fn(), log: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.path }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/server/diagnostics", () => ({ logBackendError: mocks.log }));
import { updateWebsiteAction } from "@/features/website-availability/actions";
import {
  DEFAULT_WEBSITE_SETTINGS,
  EMPTY_WEBSITE_ACTION,
  WEBSITE_FIELDS,
} from "@/features/website-availability/types";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ error: null });
});

it.each([true, false])(
  "toggles to %s without overwriting custom messages and refreshes all layouts",
  async (enabled) => {
    const form = new FormData();
    form.set("mode", "toggle");
    form.set("enabled", String(enabled));
    expect(await updateWebsiteAction(EMPTY_WEBSITE_ACTION, form)).toEqual({
      ok: true,
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "admin_update_website_availability",
      { p_is_enabled: enabled },
    );
    expect(mocks.path).toHaveBeenCalledWith("/", "layout");
  },
);
it("saves custom text without reopening a website closed by another admin action", async () => {
  const form = new FormData();
  form.set("mode", "message");
  for (const field of WEBSITE_FIELDS)
    form.set(field.key, DEFAULT_WEBSITE_SETTINGS[field.key]);
  form.set("signature", "");
  expect((await updateWebsiteAction(EMPTY_WEBSITE_ACTION, form)).ok).toBe(true);
  expect(mocks.rpc.mock.calls[0][1].p_is_enabled).toBeUndefined();
  expect(mocks.rpc.mock.calls[0][1].p_signature).toBe("");
});
it("rejects incomplete fields, invalid toggles and oversized text before writing", async () => {
  const form = new FormData();
  form.set("mode", "toggle");
  form.set("enabled", "off");
  expect((await updateWebsiteAction(EMPTY_WEBSITE_ACTION, form)).ok).toBe(
    false,
  );
  form.set("mode", "message");
  for (const field of WEBSITE_FIELDS)
    form.set(field.key, DEFAULT_WEBSITE_SETTINGS[field.key]);
  form.set("title", "x".repeat(181));
  expect((await updateWebsiteAction(EMPTY_WEBSITE_ACTION, form)).ok).toBe(
    false,
  );
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("does not invalidate pages or report success after a rejected write", async () => {
  mocks.rpc.mockResolvedValue({
    error: { message: "You do not have access to this." },
  });
  const form = new FormData();
  form.set("mode", "toggle");
  form.set("enabled", "false");
  expect(await updateWebsiteAction(EMPTY_WEBSITE_ACTION, form)).toEqual({
    ok: false,
    error: "You do not have access to this.",
  });
  expect(mocks.path).not.toHaveBeenCalled();
});
