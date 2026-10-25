import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SiteExperienceProvider } from "@/components/layout/site-experience";
import { NotificationBannerClient } from "@/features/notifications/notification-banner-client";
import type { NotificationRow } from "@/features/notifications/types";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

let container: HTMLDivElement;
let root: Root;
const notice = (id: string): NotificationRow => ({
  id,
  title: `Notice ${id}`,
  message: `Message ${id}`,
  priority: "info",
  href: null,
  cta_label: null,
  starts_at: null,
  ends_at: null,
});
beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  sessionStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
async function render(notifications: NotificationRow[]) {
  await act(async () =>
    root.render(
      <SiteExperienceProvider>
        <NotificationBannerClient notifications={notifications} />
      </SiteExperienceProvider>,
    ),
  );
}
async function click(label: string) {
  const button = [...document.querySelectorAll("button")].find(
    (item) => item.textContent === label,
  );
  expect(button).toBeDefined();
  await act(async () => button!.click());
}

it("shows all notices with Next and Done, then the instructions", async () => {
  await render([notice("1"), notice("2")]);
  expect(document.body.textContent).toContain("Notice 1");
  expect(document.body.textContent).not.toContain("Welcome to SMIU feedback.");
  await click("Next");
  expect(document.body.textContent).toContain("Notice 2");
  expect(document.body.textContent).not.toContain("Notice 1");
  await click("Done");
  expect(document.body.textContent).toContain("Welcome to SMIU feedback.");
  await click("Start exploring");
  await render([notice("1"), notice("2")]);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it("waits for notice loading before showing instructions and handles an empty list", async () => {
  await act(async () =>
    root.render(
      <SiteExperienceProvider>
        <div>Page</div>
      </SiteExperienceProvider>,
    ),
  );
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await render([]);
  expect(document.body.textContent).toContain("Welcome to SMIU feedback.");
});
