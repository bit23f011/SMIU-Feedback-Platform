// @vitest-environment node
import * as React from "react";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  reviews: vi.fn(), favorites: vi.fn(), viewed: vi.fn(), session: vi.fn(),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/student", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/features/reviews/queries", () => ({ getMyReviewsResult: mocks.reviews }));
vi.mock("@/features/discovery/queries", () => ({ getMyFavorites: mocks.favorites, getMyRecentlyViewed: mocks.viewed }));
vi.mock("@/features/auth/session", () => ({ requireStudent: mocks.session }));
vi.mock("@/features/auth/actions", () => ({ signOutAction: vi.fn() }));
vi.mock("@/features/notifications/notification-banner", () => ({ NotificationBanner: () => null }));
import StudentHomePage from "@/app/student/page";
import StudentLayout from "@/app/student/layout";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SiteExperienceProvider } from "@/components/layout/site-experience";

const review = {
  id: "review-1", personSlug: "teacher-a", personName: "Teacher A", category: "teacher",
  overallRating: 8, comment: "Helpful explanations.", status: "published", moderationStatus: "pending",
  courseId: "course-a", courseCode: "CS-201", courseTitle: "Data Structures", semesterId: "spring24",
  semesterLabel: "Spring 2024", updatedAt: "2026-10-24T12:00:00Z",
};
beforeEach(() => {
  mocks.reviews.mockResolvedValue({ reviews: [review], failed: false });
  mocks.favorites.mockResolvedValue({ people: [], total: 5, failed: false });
  mocks.viewed.mockResolvedValue([]);
  mocks.session.mockResolvedValue({ profile: { email: "student@example.test", role: "student" } });
});
async function render() {
  const page = await StudentHomePage();
  const shell = await StudentLayout({ children: page });
  return renderToStaticMarkup(<ThemeProvider><SiteExperienceProvider>{shell}</SiteExperienceProvider></ThemeProvider>);
}
it("distinguishes pending written feedback from a published rating and preserves the review scope", async () => {
  const html = await render();
  expect(html).toContain("Written feedback pending approval");
  expect(html).toContain("/student/reviews?status=pending");
  expect(html).toContain("/people/teacher-a?course=course-a&amp;semester=spring24");
  if (process.env.PROFAURA_UI_FIXTURE === "1") {
    mkdirSync(".verify_tmp", { recursive: true });
    const css = readFileSync(".next/static/css/app/layout.css", "utf8");
    const fonts = [...css.matchAll(/\.(__variable_[a-z0-9]+)\s*\{/g)].map(match => match[1]).join(" ");
    writeFileSync(".verify_tmp/student-preview.html", `<!doctype html><html lang="en" class="${fonts}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Student workspace preview</title><link rel="stylesheet" href="http://localhost:3000/_next/static/css/app/layout.css"><style>body{margin:0} .preview-label{font:11px sans-serif;text-align:center;padding:6px;background:#eee8e5;color:#665358}</style></head><body><div class="preview-label">Isolated layout preview with sample data. No live account.</div>${html}</body></html>`);
  }
});
it("shows an unavailable state instead of a false zero when personal data cannot load", async () => {
  mocks.reviews.mockResolvedValue({ reviews: [], failed: true });
  mocks.favorites.mockResolvedValue({ people: [], total: 0, failed: true });
  const html = await render();
  expect(html).toContain("Unavailable");
  expect(html).toContain("Your reviews could not be loaded");
  expect(html).not.toContain("Your first review starts here");
});
