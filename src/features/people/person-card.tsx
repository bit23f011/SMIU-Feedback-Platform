import * as React from "react";

import Link from "next/link";

import { RatingStars } from "@/components/common/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PersonAvatar } from "@/features/people/person-avatar";
import type { PersonCategory, PersonSummary } from "@/features/people/types";
import { getCategoryMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";

/*
  PersonCard - public directory ka basic unit.

  Structure (Phase 1 requirement): name, avatar, category/type, department,
  overall rating ka structure, review count ka structure.

  IMPORTANT: yahan koi demo rating ya fake review count nahi bharna. Phase 1 me
  rating/reviewCount null aate hain aur RatingStars khud "Not rated yet" dikhata
  hai. Fake numbers production me trust todte hain.
*/

export interface PersonCardProps {
  person: PersonSummary;
  /** Kis category page par dikh raha hai - wohi role upar aata hai. */
  contextCategory?: PersonCategory;
  className?: string;
}

export function PersonCard({ person, contextCategory, className }: PersonCardProps) {
  // Pehle current page wala role, warna primary role, warna jo pehla mile.
  const role =
    (contextCategory ? person.roles.find((item) => item.category === contextCategory) : undefined) ??
    person.roles.find((item) => item.isPrimary) ??
    person.roles[0];

  const category = role?.category ?? person.primaryCategory ?? "teacher";
  const categoryMeta = getCategoryMeta(category);

  // Role ka title mile to wahi, warna person ki headline, warna category ka naam.
  const subtitle = role?.title ?? person.headline ?? categoryMeta.singular;

  return (
    <Card interactive className={cn("group relative flex flex-col p-5", className)}>
      <div className="flex items-start gap-3.5">
        <PersonAvatar name={person.name} gender={person.gender} photoUrl={person.photoUrl} />

        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold leading-snug tracking-tight text-foreground">
            {/* Poora card clickable hai (stretched link) magar keyboard ke liye
                asli link yehi anchor hai. */}
            <Link
              href={`/people/${person.slug}`}
              className="rounded-sm outline-none transition-colors duration-150 ease-out after:absolute after:inset-0 after:content-[''] group-hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {person.name}
            </Link>
          </h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Badge variant="category">{categoryMeta.singular}</Badge>
        {role?.department ? <Badge variant="brand">{role.department}</Badge> : null}
      </div>

      <div className="mt-4 border-t border-border/80 pt-3.5">
        <RatingStars value={person.rating} count={person.reviewCount} />
      </div>
    </Card>
  );
}

/** Directory grid - card ki responsive layout ek hi jagah define ki hai. */
export function PersonGrid({
  people,
  contextCategory,
  className,
}: {
  people: PersonSummary[];
  contextCategory?: PersonCategory;
  className?: string;
}) {
  return (
    <ul className={cn("grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {people.map((person) => (
        <li key={person.id} className="flex">
          <PersonCard person={person} contextCategory={contextCategory} className="w-full" />
        </li>
      ))}
    </ul>
  );
}
