// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { EMPTY_FEEDBACK_FORM_STATE } from "@/features/feedback/form-state";
import { FEEDBACK_MESSAGE_MAX } from "@/features/admin/feedback/types";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({ rpc: mocks.rpc }),
}));
import { submitWebsiteFeedbackAction } from "@/features/feedback/actions";

beforeEach(() => {
  mocks.rpc.mockReset();
  mocks.rpc.mockResolvedValue({ error: null });
});
function feedback(fields: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    type: "report_bug",
    message:
      "The course filter does not update.\n\nPage / section: /courses\nDevice: Mobile",
    rating: "4",
    contactEmail: "",
    ...fields,
  }))
    data.set(key, value);
  return data;
}

it("submits the chat details and optional rating to the existing admin queue", async () => {
  const data = feedback({ contactEmail: "Student@Example.com" });
  expect(
    await submitWebsiteFeedbackAction(EMPTY_FEEDBACK_FORM_STATE, data),
  ).toEqual({ ok: true });
  expect(mocks.rpc).toHaveBeenCalledWith("submit_website_feedback", {
    p_type: "report_bug",
    p_rating: 4,
    p_message: data.get("message"),
    p_contact_email: "student@example.com",
  });
});
it("keeps skipped rating and contact fields empty", async () => {
  await submitWebsiteFeedbackAction(
    EMPTY_FEEDBACK_FORM_STATE,
    feedback({ rating: "" }),
  );
  expect(mocks.rpc).toHaveBeenCalledWith(
    "submit_website_feedback",
    expect.objectContaining({ p_rating: null, p_contact_email: null }),
  );
});
it("rejects malformed contact details and oversized messages without writing", async () => {
  const result = await submitWebsiteFeedbackAction(
    EMPTY_FEEDBACK_FORM_STATE,
    feedback({
      contactEmail: "not-an-email",
      message: "x".repeat(FEEDBACK_MESSAGE_MAX + 1),
    }),
  );
  expect(result.ok).toBe(false);
  expect(result.fieldErrors).toHaveProperty("message");
  expect(result.fieldErrors).toHaveProperty("contactEmail");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("reports a failed save instead of showing a false success or exposing the database error", async () => {
  mocks.rpc.mockResolvedValue({
    error: { message: "Internal database constraint details" },
  });
  const result = await submitWebsiteFeedbackAction(
    EMPTY_FEEDBACK_FORM_STATE,
    feedback(),
  );
  expect(result.ok).toBe(false);
  expect(result.formError).toBe(
    "We could not send your feedback right now. Please try again.",
  );
});
