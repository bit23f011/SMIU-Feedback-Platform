import * as React from "react";

import Link from "next/link";
import { Trophy } from "lucide-react";

import { RatingStars } from "@/components/common/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PersonAvatar } from "@/features/people/person-avatar";
import type { PersonSummary } from "@/features/people/types";
import { getCategoryMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";

/*
  TopPersonCard - reusable highlight card.

  Yeh card poori tarah data-driven hai: `person` null ho to imandar empty state
  dikhta hai, warna asli person. Koi hardcoded naam yahan nahi hai aur na kabhi
  aana chahiye - homepage par nakli winner lagana product ka trust todta hai.

  Isi liye card ek alag file me hai: rankings page aur category pages baad me
  yehi card dobara use kar sakte hain.
*/

export interface TopPersonCardProps {
  /** null = abhi koi eligible nahi (empty state dikhega). */
  person: PersonSummary | null;
  /** Empty state me category ka naam, e.g. "teacher". */
  noun?: string;
  /** Empty state ka browse link. */
  browseHref?: string;
  browseLabel?: string;
  className?: string;
}

export function TopPersonCard({
  person,
  noun = "teacher",
  browseHref = "/teachers",
  browseLabel = "Browse teachers",
  className,
}: TopPersonCardProps) {
  if (!person) {
    return (
      <Card className={cn("flex flex-col items-start gap-4 p-6 md:flex-row md:items-center", className)}>
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-ink-50 text-ink-400"
        >
          <Trophy className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold text-foreground">
            No {noun} has taken this spot yet
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Top {noun} rankings will appear here once enough verified reviews are available.
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={browseHref}>{browseLabel}</Link>
        </Button>
      </Card>
    );
  }

  const role = person.roles.find((item) => item.isPrimary) ?? person.roles[0];
  const categoryMeta = getCategoryMeta(role?.category ?? person.primaryCategory ?? "teacher");
  const subtitle = role?.title ?? person.headline ?? categoryMeta.singular;

  return (
    <Card interactive className={cn("group relative flex flex-col gap-4 p-6 sm:flex-row", className)}>
      <PersonAvatar
        name={person.name}
        gender={person.gender}
        photoUrl={person.photoUrl}
        className="size-14 shrink-0"
      />

      <div className="min-w-0 flex-1">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-coral-200 bg-coral-50 px-2 py-0.5 text-xs font-medium text-coral-700 dark:text-coral-300">
          <Trophy aria-hidden="true" className="size-3" />
          Top rated
        </span>

        <h3 className="mt-2.5 font-display text-lg font-semibold leading-snug tracking-tight text-foreground">
          <Link
            href={`/people/${person.slug}`}
            className="rounded-sm outline-none transition-colors duration-150 ease-out after:absolute after:inset-0 after:content-[''] group-hover:text-indigo-700 dark:group-hover:text-indigo-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {person.name}
          </Link>
        </h3>
        <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="category">{categoryMeta.singular}</Badge>
          {role?.department ? <Badge variant="brand">{role.department}</Badge> : null}
        </div>

        <div className="mt-4 border-t border-border/80 pt-3.5">
          <RatingStars value={person.rating} count={person.reviewCount} />
        </div>
      </div>
    </Card>
  );
}
