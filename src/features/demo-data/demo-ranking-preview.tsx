import * as React from "react";
import Link from "next/link";
import { listPeopleByCategory } from "@/features/people/queries";
import { PersonAvatar } from "@/features/people/person-avatar";
import {
  SpotlightBadge,
  SpotlightCelebration,
} from "@/features/people/spotlight-accent";
import type { PersonCategory } from "@/features/people/types";
import { isZeeshanSpotlight, orderDemoPeople } from "./presentation";

export async function DemoRankingPreview({
  category,
}: {
  category: PersonCategory;
}) {
  const result = await listPeopleByCategory({ category, limit: 100 });
  if (result.failed || !result.people.length) return null;
  const people = orderDemoPeople(result.people, category);
  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">
         Display order · manually arranged preview placements.
      </p>
      <ol className="grid list-none gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((person, index) => {
          const spotlight = isZeeshanSpotlight(person);
          return (
            <li key={person.id}>
              <Link
                href={`/people/${person.slug}`}
                className={`relative flex h-full items-center gap-3 overflow-hidden rounded-lg border bg-card p-4 ${spotlight ? "spotlight-surface border-amber-200" : "border-border"}`}
              >
                {spotlight ? <SpotlightCelebration /> : null}
                <PersonAvatar
                  name={person.name}
                  gender={person.gender}
                  photoUrl={person.photoUrl}
                  className="relative size-11 shrink-0"
                />
                <div className="relative min-w-0">
                  <span className="text-[11px] font-semibold text-primary">
                    Ranked by Students #{index + 1}
                  </span>
                  <h3 className="mt-1 text-sm font-semibold">{person.name}</h3>
                  {spotlight ? (
                    <div className="mt-2">
                      <SpotlightBadge demo />
                    </div>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
