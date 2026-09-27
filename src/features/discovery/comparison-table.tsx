import * as React from "react";

import Link from "next/link";

import { PersonAvatar } from "@/features/people/person-avatar";
import { OVERALL_MAX } from "@/features/reviews/types";
import {
  yesPercent,
  type ComparisonPerson,
  type CriterionAggregate,
} from "@/features/discovery/types";
import { getCategoryMeta } from "@/lib/constants";
import { cn, formatCompactNumber } from "@/lib/utils";

/*
  Comparison table - README §43.

  Do se chaar profiles ek saath, criteria row-by-row. Tarteeb §43 se aayi hai:
  Overall, Course Knowledge, Teaching Way, Nature, Strictness, Communication,
  Grading, Helpfulness, Review Count, Freshers, Other Courses.

  PRIVACY BRAKE (wahi jo rating-summary me hai): agar kisi criterion par 3 se kam
  jawab hon to us ka number nahi dikhate. Chhote sample me ek banda pehchana ja
  sakta hai. Yahan cell khali (middot) reh jata hai, sath sr-only wajah.

  LEADER: sirf un rows par halka highlight jahan "zyada = behtar" saaf hai
  (overall, star criteria, review count). Yes/No rows (strictness waghera) par
  koi "best" nahi, kyunke zyada "yes" hamesha behtar nahi hota.

  Yeh sirf public aggregates ka view hai; koi private ya author-level cheez yahan
  nahi aati.
*/

const MIN_RESPONSES_TO_SHOW = 3;

type Row =
  | { kind: "overall" }
  | { kind: "reviewCount" }
  | { kind: "criterion"; key: string; fallbackLabel: string };

/** §43 ki exact tarteeb. */
const ROWS: Row[] = [
  { kind: "overall" },
  { kind: "criterion", key: "course_knowledge", fallbackLabel: "Course knowledge" },
  { kind: "criterion", key: "teaching_way", fallbackLabel: "Teaching way" },
  { kind: "criterion", key: "nature", fallbackLabel: "Nature" },
  { kind: "criterion", key: "strictness", fallbackLabel: "Strictness" },
  { kind: "criterion", key: "communication", fallbackLabel: "Communication" },
  { kind: "criterion", key: "grading", fallbackLabel: "Grading and marking" },
  { kind: "criterion", key: "helpfulness", fallbackLabel: "Helpfulness and student support" },
  { kind: "reviewCount" },
  { kind: "criterion", key: "recommend_freshers", fallbackLabel: "Recommend for freshers" },
  {
    kind: "criterion",
    key: "recommend_other_courses",
    fallbackLabel: "Recommend for other courses",
  },
];

interface Cell {
  /** Screen par dikhne wala text. Chhupa hua ho to middot. */
  text: string;
  /** middot ke sath sr-only wajah. */
  hiddenReason?: string;
  /** Leader compare ke liye numeric value. null = compare se bahar. */
  value: number | null;
}

const HIDDEN: Cell = { text: "·", hiddenReason: "Not enough responses yet", value: null };

function criterionCell(criterion: CriterionAggregate | undefined): Cell {
  if (!criterion) return HIDDEN;

  if (criterion.kind === "star") {
    if (criterion.starResponses < MIN_RESPONSES_TO_SHOW || criterion.averageStar === null) {
      return HIDDEN;
    }
    return { text: `${criterion.averageStar.toFixed(1)}/5`, value: criterion.averageStar };
  }

  // yes_no: value leader compare me shamil nahi (isliye null), sirf dikhane ke liye.
  const percent = yesPercent(criterion);
  if (criterion.boolResponses < MIN_RESPONSES_TO_SHOW || percent === null) return HIDDEN;
  return { text: `${percent}% yes`, value: null };
}

/** Ek person ke criteria ko key -> aggregate map me badlo. */
function criteriaMap(person: ComparisonPerson): Map<string, CriterionAggregate> {
  const map = new Map<string, CriterionAggregate>();
  for (const criterion of person.criteria) map.set(criterion.key, criterion);
  return map;
}

/** Row ka label: DB label (agar mile) warna §43 wala fallback. */
function rowLabel(
  key: string,
  fallbackLabel: string,
  maps: Map<string, CriterionAggregate>[],
): string {
  for (const map of maps) {
    const label = map.get(key)?.label;
    if (label) return label;
  }
  return fallbackLabel;
}

function CellText({ cell }: { cell: Cell }) {
  if (cell.hiddenReason) {
    return (
      <span className="text-ink-300">
        <span aria-hidden="true">{cell.text}</span>
        <span className="sr-only">{cell.hiddenReason}</span>
      </span>
    );
  }
  return <span>{cell.text}</span>;
}

export function ComparisonTable({ people }: { people: ComparisonPerson[] }) {
  const maps = people.map(criteriaMap);

  // Har person ka header cell (sabse upar).
  const headers = people.map((person) => {
    const meta = getCategoryMeta(person.primaryCategory ?? "teacher");
    return { person, categoryLabel: meta.singular };
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Comparison of the selected profiles across every rating criterion.
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 min-w-[9rem] border-b border-border bg-card px-4 py-3 text-left align-bottom"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-ink-500">
                Criteria
              </span>
            </th>
            {headers.map(({ person, categoryLabel }) => (
              <th
                key={person.id}
                scope="col"
                className="min-w-[10rem] border-b border-l border-border bg-card px-4 py-3 text-center align-bottom"
              >
                <span className="mx-auto flex w-full flex-col items-center gap-1.5">
                  <PersonAvatar
                    name={person.name}
                    gender={person.gender}
                    photoUrl={person.photoUrl}
                    className="h-10 w-10"
                  />
                  <Link
                    href={`/people/${person.slug}`}
                    className="rounded-sm font-display text-sm font-semibold leading-snug tracking-tight text-foreground outline-none hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {person.name}
                  </Link>
                  <span className="text-xs font-normal text-muted-foreground">{categoryLabel}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {ROWS.map((row, rowIndex) => {
            const zebra = rowIndex % 2 === 1;

            // Har row ke cells.
            const cells: Cell[] = people.map((person, personIndex) => {
              if (row.kind === "overall") {
                return person.rating === null
                  ? { text: "·", hiddenReason: "Not rated yet", value: null }
                  : { text: `${person.rating.toFixed(1)}/${OVERALL_MAX}`, value: person.rating };
              }
              if (row.kind === "reviewCount") {
                const count = person.reviewCount ?? 0;
                return { text: formatCompactNumber(count), value: count };
              }
              return criterionCell(maps[personIndex]!.get(row.key));
            });

            // Leader sirf "zyada behtar" rows par (yes_no value null deta hai).
            const numericValues = cells
              .map((cell) => cell.value)
              .filter((value): value is number => value !== null);
            const leader =
              people.length > 1 && numericValues.length > 1 ? Math.max(...numericValues) : null;

            const label =
              row.kind === "overall"
                ? "Overall rating"
                : row.kind === "reviewCount"
                  ? "Review count"
                  : rowLabel(row.key, row.fallbackLabel, maps);

            return (
              <tr key={label} className={cn(zebra && "bg-ink-50/40")}>
                <th
                  scope="row"
                  className={cn(
                    "sticky left-0 z-10 border-b border-border px-4 py-3 text-left font-medium text-ink-700",
                    zebra ? "bg-[#fbfbfc]" : "bg-card",
                  )}
                >
                  {label}
                </th>
                {cells.map((cell, personIndex) => {
                  const isLeader = leader !== null && cell.value === leader;
                  return (
                    <td
                      key={people[personIndex]!.id}
                      className={cn(
                        "border-b border-l border-border px-4 py-3 text-center tabular-nums",
                        isLeader
                          ? "bg-indigo-50/70 font-semibold text-foreground"
                          : "text-ink-700",
                      )}
                    >
                      <CellText cell={cell} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
