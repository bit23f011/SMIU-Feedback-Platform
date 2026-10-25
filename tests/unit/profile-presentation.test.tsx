// @vitest-environment node
import * as React from "react";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { PersonProfileView } from "@/features/people/person-profile-view";
import { PersonGrid } from "@/features/people/person-card";
import type { PersonProfileData } from "@/features/people/profile-data";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteExperienceProvider } from "@/components/layout/site-experience";
import { ThemeProvider } from "@/components/theme/theme-provider";

vi.mock("next/navigation", () => ({
  usePathname: () => "/teachers",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("react", async (original) => ({
  ...(await original<object>()),
  cache: (fn: unknown) => fn,
}));

const data: PersonProfileData = {
  person: {
    id: "person",
    slug: "qasim-rana",
    name: "Sir Qasim Rana",
    gender: "male",
    photoUrl: null,
    headline: "Visiting Faculty, Computer Science",
    primaryCategory: "teacher",
    teacherType: "external",
    roles: [
      {
        category: "teacher",
        title: "Professor",
        department: "CS",
        isPrimary: true,
      },
    ],
    rating: 10,
    reviewCount: 1,
  },
  page: 1,
  context: {},
  stats: {
    reviewCount: 1,
    averageRating: 10,
    distribution: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
      9: 0,
      10: 1,
    },
  },
  criteriaStats: [],
  featured: [],
  reviewPage: {
    total: 1,
    reviews: [
      {
        id: "review",
        overallRating: 10,
        comment: null,
        createdAt: "2026-10-25T12:00:00Z",
        updatedAt: "2026-10-25T12:00:00Z",
        wasEdited: false,
        isFeatured: false,
        courseCode: null,
        courseTitle: null,
        semesterLabel: null,
        answers: [
          {
            key: "knowledge",
            label: "Course knowledge",
            kind: "star",
            star: 5,
            yes: null,
          },
        ],
      },
    ],
  },
  courses: [],
  semesters: [],
  canSave: false,
  saved: false,
  reviewPanel: { status: "signed-out" },
};

it("keeps the short sign-in prompt in the profile header and removes extra card details", () => {
  const html = renderToStaticMarkup(<PersonProfileView data={data} />);
  const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
  expect(header).toContain("Sign in to write a review.");
  expect(html).not.toContain("How ratings work");
  expect(html).not.toContain(">Roles<");
  expect(html).not.toContain("without a written comment");
  expect(html).not.toContain("question-by-question breakdown");
  const cards = renderToStaticMarkup(<PersonGrid people={[data.person]} />);
  expect(cards).not.toContain("Search courses");
  expect(cards).not.toContain("Search semesters");
  if (process.env.PROFAURA_UI_FIXTURE === "1") {
    mkdirSync(".verify_tmp", { recursive: true });
    const css = readdirSync(".next-verify/static/css")
      .filter((name) => name.endsWith(".css"))
      .map((name) => readFileSync(`.next-verify/static/css/${name}`, "utf8"))
      .join("\n");
    const fonts = [...css.matchAll(/\.(__variable_[a-z0-9]+)\s*\{/g)]
      .map((match) => match[1])
      .join(" ");
    const headerHtml = renderToStaticMarkup(
      <ThemeProvider>
        <SiteExperienceProvider>
          <SiteHeader
            account={{ email: "student@example.test", isAdmin: false }}
          />
        </SiteExperienceProvider>
      </ThemeProvider>,
    );
    writeFileSync(
      ".verify_tmp/profile-preview.html",
      `<!doctype html><html lang="en" class="${fonts}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css.replaceAll("/_next/", "file:///C:/ProfAura/.next-verify/")}</style></head><body class="bg-background font-sans text-foreground">${headerHtml}${html}<div class="container pb-10">${cards}</div></body></html>`,
    );
  }
});
