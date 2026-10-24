import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ appendFileSync: vi.fn() }));
vi.mock("node:fs", () => ({
  appendFileSync: mocks.appendFileSync,
  default: { appendFileSync: mocks.appendFileSync },
}));

import { logBackendError } from "@/lib/server/diagnostics";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.appendFileSync.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("keeps backend error messages and student details out of server diagnostics", () => {
  const logger = vi.spyOn(console, "error").mockImplementation(() => undefined);
  try {
    logBackendError("reviews.submit", {
      code: "23514",
      status: 400,
      message: "private student@example.test",
      details: { password: "private-passphrase", token: "private-token" },
    });
    expect(logger).toHaveBeenCalledWith("[backend]", {
      operation: "reviews.submit",
      code: "23514",
      status: 400,
    });
  } finally {
    logger.mockRestore();
  }
});

it.each([
  "reviews_overall_rating_range",
  "reviews_overall_rating_check",
  "reviews_comment_check",
])(
  "writes only safe development diagnostics for %s when no terminal is attached",
  (constraint) => {
    vi.stubEnv("NODE_ENV", "development");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    logBackendError("reviews.submit", {
      code: "23514",
      message: `private student@example.test violates constraint "${constraint}"`,
      details: { password: "private-passphrase" },
    });
    const [path, line] = mocks.appendFileSync.mock.calls[0]!;
    expect(path).toMatch(/profaura-backend-errors\.jsonl$/);
    expect(JSON.parse(line)).toEqual({
      at: expect.any(String),
      operation: "reviews.submit",
      code: "23514",
      constraint,
    });
    expect(line).not.toContain("student@example.test");
    expect(line).not.toContain("private-passphrase");
  },
);

it("does not log arbitrary constraint names or write diagnostic files in production", () => {
  vi.stubEnv("NODE_ENV", "production");
  const logger = vi.spyOn(console, "error").mockImplementation(() => undefined);
  logBackendError("reviews.submit", {
    code: "23514",
    message: 'constraint "reviews_private_student_123"',
  });
  expect(logger).toHaveBeenCalledWith("[backend]", {
    operation: "reviews.submit",
    code: "23514",
  });
  expect(mocks.appendFileSync).not.toHaveBeenCalled();
});

it("keeps forms working if the optional development log file cannot be written", () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mocks.appendFileSync.mockImplementation(() => {
    throw new Error("read-only directory");
  });
  expect(() =>
    logBackendError("reviews.submit", { code: "42501" }),
  ).not.toThrow();
});

it.each([
  "DYNAMIC_SERVER_USAGE",
  "NEXT_REDIRECT;replace;/student;303;",
  "NEXT_NOT_FOUND",
])("preserves Next control flow (%s)", (digest) => {
  const error = { digest };
  const logger = vi.spyOn(console, "error").mockImplementation(() => undefined);
  expect(() => logBackendError("reviews.submit", error)).toThrow();
  expect(logger).not.toHaveBeenCalled();
  expect(mocks.appendFileSync).not.toHaveBeenCalled();
});
