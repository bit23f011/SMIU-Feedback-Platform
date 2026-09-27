import * as React from "react";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/*
  Pagination - server-rendered, plain links (README §84).

  Kyun links aur client state nahi:
  - Har page ek asli URL hai, is liye share aur back button dono theek chalte hain.
  - Browser me 200 reviews ya 500 profiles load karne ki zaroorat nahi rehti.
  - JavaScript band ho to bhi kaam karta hai.

  Yeh component sirf navigation hai. Kitna data mil sakta hai, uski had DB me
  lagi hui hai (har list function apni limit ko 1..60 me clamp karti hai), is liye
  URL me bara page number likh dene se kuch nahi hota.
*/

export type PaginationQuery = Record<string, string | number | null | undefined>;

export interface PaginationProps {
  page: number;
  totalPages: number;
  pathname: string;
  /** Baqi filters, taake page badalne par wo na khoyein. */
  query?: PaginationQuery;
  className?: string;
}

/** Ek page ka href. page 1 par `page` param likhte hi nahi (saaf URL). */
export function pageHref(pathname: string, query: PaginationQuery | undefined, page: number): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) params.set(key, text);
  }

  if (page > 1) params.set("page", String(page));

  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

type Slot = number | "gap";

/*
  Numbers ki window: pehla, aakhri, aur current ke aas paas wale. Beech me "..."
  Mobile par 7 se zyada chips ek line me nahi aate, is liye had 7 hi rakhi hai.
*/
function pageSlots(page: number, total: number): Slot[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const slots = new Set<number>([1, total, page]);
  if (page - 1 > 1) slots.add(page - 1);
  if (page + 1 < total) slots.add(page + 1);
  if (page <= 3) {
    slots.add(2);
    slots.add(3);
  }
  if (page >= total - 2) {
    slots.add(total - 1);
    slots.add(total - 2);
  }

  const ordered = [...slots].filter((value) => value >= 1 && value <= total).sort((a, b) => a - b);

  const out: Slot[] = [];
  let previous = 0;
  for (const value of ordered) {
    if (previous && value - previous > 1) out.push("gap");
    out.push(value);
    previous = value;
  }
  return out;
}

const chip =
  "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-md border px-3 text-[0.8125rem] font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function Pagination({ page, totalPages, pathname, query, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const current = Math.min(Math.max(page, 1), totalPages);
  const slots = pageSlots(current, totalPages);

  return (
    <nav aria-label="Pagination" className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {current > 1 ? (
        <Link
          href={pageHref(pathname, query, current - 1)}
          rel="prev"
          className={cn(chip, "border-input bg-background text-ink-700 hover:border-ink-400 hover:bg-ink-50")}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Previous
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(chip, "border-transparent text-ink-400")}>
          <ChevronLeft className="size-4" />
          Previous
        </span>
      )}

      <ol className="flex list-none items-center gap-1.5">
        {slots.map((slot, index) =>
          slot === "gap" ? (
            <li
              key={`gap-${index}`}
              aria-hidden="true"
              className="px-1 text-[0.8125rem] text-ink-400"
            >
              ...
            </li>
          ) : (
            <li key={slot}>
              {slot === current ? (
                <span
                  aria-current="page"
                  className={cn(chip, "border-primary bg-primary text-primary-foreground")}
                >
                  {slot}
                </span>
              ) : (
                <Link
                  href={pageHref(pathname, query, slot)}
                  aria-label={`Page ${slot}`}
                  className={cn(
                    chip,
                    "border-input bg-background text-ink-700 hover:border-ink-400 hover:bg-ink-50",
                  )}
                >
                  {slot}
                </Link>
              )}
            </li>
          ),
        )}
      </ol>

      {current < totalPages ? (
        <Link
          href={pageHref(pathname, query, current + 1)}
          rel="next"
          className={cn(chip, "border-input bg-background text-ink-700 hover:border-ink-400 hover:bg-ink-50")}
        >
          Next
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(chip, "border-transparent text-ink-400")}>
          Next
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
