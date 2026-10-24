import { describe, expect, it } from "vitest";
import {
  parseCourseList,
  parseSemesterList,
} from "@/features/admin/reference/bulk-list";

describe("pasted admin reference lists", () => {
  it("accepts numbered courses, optional codes and blank lines", () => {
    expect(
      parseCourseList(
        "1. Artificial Intelligence\n\n- CS-301 | Computer Networks\n• Data Structures",
      ),
    ).toEqual({
      items: [
        { title: "Artificial Intelligence", code: null },
        { title: "Computer Networks", code: "CS-301" },
        { title: "Data Structures", code: null },
      ],
      duplicates: 0,
    });
  });

  it("skips repeated titles using the same rule as the course RPC", () => {
    expect(parseCourseList("AI\nai\nCS-201 | AI")).toEqual({
      items: [{ title: "AI", code: null }],
      duplicates: 2,
    });
  });

  it("reports an invalid course's original line and rejects the whole pasted list", () => {
    const result = parseCourseList("Valid Course\n\nCODE | Title | Extra");
    expect(result.error).toContain("Line 3");
    expect(result.items).toEqual([]);
    expect(parseCourseList("x".repeat(161)).error).toBeDefined();
  });

  it("normalizes compact semesters and skips repeated season/year pairs", () => {
    expect(
      parseSemesterList("spring24\nSpring 2024\nAutumn-2025\nWinter 2026"),
    ).toEqual({
      items: [
        { label: "Spring 2024", season: "spring", year: 2024 },
        { label: "Fall 2025", season: "fall", year: 2025 },
        { label: "Winter 2026", season: "winter", year: 2026 },
      ],
      duplicates: 1,
    });
  });

  it("rejects ambiguous or out-of-range semesters", () => {
    for (const text of [
      "Spring",
      "2024",
      "Spring 1999",
      "Fall 2101",
      "Spring 2024 extra",
    ])
      expect(parseSemesterList(text).error).toBeDefined();
  });

  it("limits each save to 200 pasted entries", () => {
    expect(
      parseCourseList(
        Array.from({ length: 201 }, (_, index) => `Course ${index}`).join("\n"),
      ).error,
    ).toContain("200");
    expect(
      parseSemesterList(
        Array.from({ length: 201 }, () => "Spring 2024").join("\n"),
      ).error,
    ).toContain("200");
  });
});
