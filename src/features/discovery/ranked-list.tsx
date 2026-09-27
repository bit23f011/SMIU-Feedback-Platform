import * as React from "react";

import Link from "next/link";

import { RatingStars } from "@/components/common/rating-stars";
import { Badge } from "@/components/ui/badge";
import { PersonAvatar } from "@/features/people/person-avatar";
import type { PersonSummary } from "@/features/people/types";
import { getCategoryMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";

/*
  RankedList - rankings, most reviewed aur trending, teeno ka ek hi shakl.

  Har row: rank number (ya bullet), avatar, naam (profile link), category +
  department badge, overall rating, aur ek optional metric (jaise "42 reviews"
  ya "12 recent reviews").

  Rating hamesha PersonSummary se aati hai jahan 0 review = null rating, is liye
  yahan koi jhoota 0 nahi dikhta.
*/

export interface RankedListItem {
  person: PersonSummary;
  /** 1-based rank. Undefined ho to number ki jagah bullet. */
  rank?: number;
  /** Dayeen taraf ka metric, jaise "42 reviews". */
  metric?: string;
}

function RankBadge({ rank }: { rank: number }) {
  // Top 3 ko halka sa numaya karte hain, baaki quiet.
  const highlight = rank <= 3;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-semibold tabular-nums",
        highlight
          ? "bg-coral-100 text-coral-700"
          : "bg-ink-100 text-ink-600",
      )}
    >
      {rank}
    </span>
  );
}

export function RankedList({ items }: { items: RankedListItem[] }) {
  return (
    <ol className="list-none space-y-2">
      {items.map(({ person, rank, metric }) => {
        const role = person.roles[0];
        const meta = role ? getCategoryMeta(role.category) : null;

        return (
          <li key={person.id}>
            <div className="group relative flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-[border-color,box-shadow] duration-150 ease-out hover:border-ink-300 hover:shadow-sm focus-within:border-primary sm:gap-4 sm:p-4">
              {typeof rank === "number" ? (
                <RankBadge rank={rank} />
              ) : (
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-ink-300" />
              )}

              <PersonAvatar
                name={person.name}
                gender={person.gender}
                photoUrl={person.photoUrl}
                className="h-11 w-11 shrink-0"
              />

              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-sm font-semibold leading-snug tracking-tight text-foreground">
                  <Link href={`/people/${person.slug}`} className="outline-none">
                    <span aria-hidden="true" className="absolute inset-0 rounded-lg" />
                    {person.name}
                  </Link>
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {role ? (
                    <Badge variant="category">{role.title ?? meta?.singular ?? "Role"}</Badge>
                  ) : null}
                  {role?.department ? <Badge variant="brand">{role.department}</Badge> : null}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <RatingStars value={person.rating} count={person.reviewCount} />
                {metric ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{metric}</p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
