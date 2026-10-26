import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { Card } from "@/components/ui/card";
import { PersonAvatar } from "@/features/people/person-avatar";
import type { PersonCategory, PersonSummary } from "@/features/people/types";
import { getCategoryMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { isZeeshanSpotlight } from "@/features/demo-data/presentation";
import { SpotlightBadge, SpotlightCelebration } from "./spotlight-accent";
export interface PersonCardProps {
  person: PersonSummary;
  contextCategory?: PersonCategory;
  className?: string;
  tabIndex?: number;
}
export function PersonCard({
  person,
  contextCategory,
  className,
  tabIndex,
}: PersonCardProps) {
  const role =
    (contextCategory
      ? person.roles.find((r) => r.category === contextCategory)
      : undefined) ??
    person.roles.find((r) => r.isPrimary) ??
    person.roles[0];
  const category = role?.category ?? person.primaryCategory ?? "teacher";
  const meta = getCategoryMeta(category);
  const spotlight = isZeeshanSpotlight(person);
  const rated =
    typeof person.rating === "number" && Number.isFinite(person.rating);
  return (
    <Card
      interactive
      className={cn(
        "group relative flex flex-col overflow-visible p-5",
        spotlight && "spotlight-surface border-amber-200",
        className,
      )}
    >
      {spotlight ? <SpotlightCelebration /> : null}
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.11em] text-muted-foreground">
          {meta.singular}
        </p>
        {spotlight ? (
          <SpotlightBadge demo={person.demoMode} />
        ) : (
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-primary/45"
          />
        )}
      </div>
      <div className="flex items-center gap-3.5">
        <PersonAvatar
          name={person.name}
          gender={person.gender}
          photoUrl={person.photoUrl}
          className="size-12 shrink-0"
        />
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-snug">
            <Link
              href={"/people/" + person.slug}
              tabIndex={tabIndex}
              className="outline-none after:absolute after:inset-0 after:content-[''] group-hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
              {person.name}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {role?.department ?? role?.title ?? person.headline ?? "SMIU"}
          </p>
        </div>
      </div>
      <div className="mt-6 flex items-end justify-between gap-3 border-t border-border pt-4">
        <div>
          {rated ? (
            <p className="text-[24px] font-semibold leading-none tabular-nums text-primary">
              {person.rating!.toFixed(1)}
              <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                /10
              </span>
            </p>
          ) : (
            <p className="text-[13px] font-medium text-muted-foreground">
              Not rated yet
            </p>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">
            {person.reviewCount
              ? person.reviewCount +
                (person.demoMode ? " " : " student ") +
                (person.reviewCount === 1 ? "review" : "reviews")
              : "Be the first to share"}
          </p>
          {person.demoMode && person.reviewCount ? (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Reviews
            </p>
          ) : null}
        </div>
        <span className="inline-flex items-center gap-2 pb-0.5 text-[11px] font-medium text-primary">
          View feedback
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </span>
      </div>
    </Card>
  );
}
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
    <ul
      className={cn(
        "grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {people.map((person) => (
        <li key={person.id} className="flex">
          <PersonCard
            person={person}
            contextCategory={contextCategory}
            className="w-full"
          />
        </li>
      ))}
    </ul>
  );
}
