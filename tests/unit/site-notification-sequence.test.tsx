import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  GuideButton,
  SiteExperienceProvider,
} from "@/components/layout/site-experience";
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
  localStorage.clear();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function render(notifications: NotificationRow[]) {
  await act(async () =>
    root.render(
      <SiteExperienceProvider>
        <NotificationBannerClient notifications={notifications} />
        <GuideButton>Replay tour</GuideButton>
      </SiteExperienceProvider>,
    ),
  );
}
async function click(label: string) {
  const button = [...document.querySelectorAll("button")].find(
    (item) => item.textContent?.trim() === label,
  );
  expect(button).toBeDefined();
  await act(async () => button!.click());
}

it("shows all notices with Next and Done, then the instructions", async () => {
  await render([notice("1"), notice("2")]);
  expect(document.body.textContent).toContain("Notice 1");
  expect(document.body.textContent).not.toContain("Explore campus feedback");
  await click("Next");
  expect(document.body.textContent).toContain("Notice 2");
  expect(document.body.textContent).not.toContain("Notice 1");
  await click("Done");
  expect(document.body.textContent).toContain("Explore campus feedback");
  await click("Skip");
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
  expect(document.body.textContent).toContain("Explore campus feedback");
});

it("remembers Skip across visits and allows Help to replay from the start", async () => {
  await render([]);
  await click("Next");
  expect(document.body.textContent).toContain("Compare student ratings");
  await click("Skip");
  await act(async () => root.unmount());
  root = createRoot(container);
  await render([]);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await click("Replay tour");
  expect(document.body.textContent).toContain("Explore campus feedback");
  expect(document.body.textContent).toContain("1 of 4");
});

it("supports Back and Finish and remembers completion across visits", async () => {
  await render([]);
  await click("Next");
  await click("Back");
  expect(document.body.textContent).toContain("Explore campus feedback");
  await click("Next");
  await click("Next");
  expect(document.body.textContent).toContain("Your name stays hidden.");
  await click("Next");
  expect(document.body.textContent).toContain("Help is always here");
  await click("Finish");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await act(async () => root.unmount());
  root = createRoot(container);
  await render([]);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
