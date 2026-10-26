import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { PersonAvatar } from "@/features/people/person-avatar";
import { listPeopleByCategory } from "@/features/people/queries";
import {
  SpotlightBadge,
  SpotlightCelebration,
} from "@/features/people/spotlight-accent";
import { isZeeshanSpotlight } from "@/features/demo-data/presentation";
import { isDemoDataEnabled } from "@/features/demo-data/queries";

export async function FeaturedSpotlight() {
  const [result, demo] = await Promise.all([
    listPeopleByCategory({
      category: "hr_staff",
      search: "Zeeshan",
      limit: 10,
    }),
    isDemoDataEnabled(),
  ]);
  const matches = result.people.filter(isZeeshanSpotlight);
  // Don't feature an arbitrary person when the directory has ambiguous matches.
  if (matches.length !== 1) return null;
  const person = matches[0];
  return (
    <section
      className="container py-6"
      aria-labelledby="featured-spotlight-heading"
    >
      <Link
        href={`/people/${person.slug}`}
        className="spotlight-surface relative block overflow-hidden rounded-xl border border-amber-200 bg-card p-6 shadow-sm sm:p-8"
      >
        <SpotlightCelebration />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-4">
            <PersonAvatar
              name={person.name}
              gender={person.gender}
              photoUrl={person.photoUrl}
              className="size-16 shrink-0 ring-4 ring-amber-100"
            />
            <div className="min-w-0">
              <SpotlightBadge demo={demo} />
              <h2
                id="featured-spotlight-heading"
                className="mt-3 font-display text-2xl font-semibold"
              >
                {person.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                HR · Campus spotlight
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            View profile <ArrowRight aria-hidden="true" className="size-4" />
          </span>
        </div>
      </Link>
    </section>
  );
}
