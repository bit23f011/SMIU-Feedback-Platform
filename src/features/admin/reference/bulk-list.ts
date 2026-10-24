import {
  SEMESTER_SEASON_LABELS,
  type SemesterSeason,
} from "@/features/admin/reference/types";

export const BULK_LIST_LIMIT = 200;
export interface BulkCourse {
  title: string;
  code: string | null;
}
export interface BulkSemester {
  label: string;
  season: SemesterSeason;
  year: number;
}
export interface BulkReferenceState {
  ok: boolean;
  error?: string;
  added?: number;
  skipped?: number;
}
export const EMPTY_BULK_STATE: BulkReferenceState = { ok: false };
type ParsedList<T> = { items: T[]; duplicates: number; error?: string };

// Pasted numbered/bulleted lists bhi chalti hain; har entry apni line par ho.
function lines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line, index) => ({
      value: line.trim().replace(/^(?:[-*•]|\d+[.)])\s+/, ""),
      number: index + 1,
    }))
    .filter((line) => line.value);
}

export function parseCourseList(text: string): ParsedList<BulkCourse> {
  const entries = lines(text);
  if (text.length > 40000 || entries.length > BULK_LIST_LIMIT)
    return {
      items: [],
      duplicates: 0,
      error: `Add up to ${BULK_LIST_LIMIT} courses at a time.`,
    };
  const items: BulkCourse[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  for (const entry of entries) {
    const parts = entry.value.split("|").map((part) => part.trim());
    const title = parts.length === 1 ? parts[0]! : parts[1]!;
    const code = parts.length === 1 ? null : parts[0] || null;
    if (
      parts.length > 2 ||
      !title ||
      title.length > 160 ||
      (code?.length ?? 0) > 32
    ) {
      return {
        items: [],
        duplicates: 0,
        error: `Line ${entry.number}: enter a course name, or CODE | Course name (name up to 160 characters, code up to 32).`,
      };
    }
    const key = title.toLowerCase();
    if (seen.has(key)) duplicates++;
    else {
      seen.add(key);
      items.push({ title, code });
    }
  }
  return { items, duplicates };
}

export function parseSemesterList(text: string): ParsedList<BulkSemester> {
  const entries = lines(text);
  if (text.length > 8000 || entries.length > BULK_LIST_LIMIT)
    return {
      items: [],
      duplicates: 0,
      error: `Add up to ${BULK_LIST_LIMIT} semesters at a time.`,
    };
  const items: BulkSemester[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  for (const entry of entries) {
    const match = entry.value.match(
      /^(spring|summer|fall|autumn|winter)[\s_-]*(\d{4}|\d{2})$/i,
    );
    if (!match)
      return {
        items: [],
        duplicates: 0,
        error: `Line ${entry.number}: use a season and year, for example Spring 2024 or spring24.`,
      };
    const season = (
      match[1]!.toLowerCase() === "autumn" ? "fall" : match[1]!.toLowerCase()
    ) as SemesterSeason;
    const year = Number(match[2]) + (match[2]!.length === 2 ? 2000 : 0);
    if (year < 2000 || year > 2100)
      return {
        items: [],
        duplicates: 0,
        error: `Line ${entry.number}: enter a year between 2000 and 2100.`,
      };
    const key = `${season}|${year}`;
    if (seen.has(key)) duplicates++;
    else {
      seen.add(key);
      items.push({
        season,
        year,
        label: `${SEMESTER_SEASON_LABELS[season]} ${year}`,
      });
    }
  }
  return { items, duplicates };
}
