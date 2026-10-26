// @vitest-environment node
import * as React from "react";
import { mkdirSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ClosureNotice } from "@/features/website-availability/closure-notice";
import { DEFAULT_WEBSITE_SETTINGS } from "@/features/website-availability/types";
it("renders the custom greeting and farewell as plain text with an admin recovery link", () => {
  const html = renderToStaticMarkup(
    <ClosureNotice
      settings={{
        ...DEFAULT_WEBSITE_SETTINGS,
        message: "Hello <script>alert('x')</script>\nThank you.",
      }}
    />,
  );
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("<script>");
  expect(html).toContain("Administrator sign in");
  expect(html).toContain("Goodbye, and thank you");
  mkdirSync(".verify_tmp", { recursive: true });
  const defaultHtml = renderToStaticMarkup(
    <ClosureNotice settings={DEFAULT_WEBSITE_SETTINGS} />,
  );
  writeFileSync(
    ".verify_tmp/closure-preview.html",
    `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>__CSS__</style></head><body style="font-family:Arial,sans-serif;background:#f8f9fc"><main class="flex min-h-dvh items-center justify-center px-4 py-10">${defaultHtml}</main></body></html>`,
  );
});
it("distinguishes service failure from the owner's official closure message", () => {
  const html = renderToStaticMarkup(
    <ClosureNotice settings={DEFAULT_WEBSITE_SETTINGS} unavailable />,
  );
  expect(html).toContain("Currently unavailable");
  expect(html).not.toContain("officially closed");
});
