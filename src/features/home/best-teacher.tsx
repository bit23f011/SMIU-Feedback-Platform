import Link from "next/link";
import { getTopPersonByCategory } from "@/features/people/queries";
import { PersonAvatar } from "@/features/people/person-avatar";
import { RatingStars } from "@/components/common/rating-stars";
import { ArrowRight } from "@/components/ui/icons";
export async function BestTeacher() {
  const person = await getTopPersonByCategory({ category: "teacher" });
  return (
    <section
      id="best-teacher"
      className="container"
      aria-labelledby="top-rated-heading"
    >
      <div className="flex flex-col justify-between gap-6 border-y border-border py-8 sm:flex-row sm:items-center">
        <div className="max-w-[340px]">
          <p className="eyebrow">Recognised by students</p>
          <h2 id="top-rated-heading" className="editorial-title mt-3 text-2xl">
            Good teaching leaves a mark.
          </h2>
          <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
            The top spot is earned through student ratings and enough reviews to
            count.
          </p>
        </div>
        {person ? (
          <Link
            href={"/people/" + person.slug}
            className="flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 sm:min-w-[330px]"
          >
            <PersonAvatar
              name={person.name}
              gender={person.gender}
              photoUrl={person.photoUrl}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                Top rated teacher
              </p>
              <h3 className="mt-1 text-sm font-semibold">{person.name}</h3>
              <div className="mt-2">
                <RatingStars value={person.rating} count={person.reviewCount} />
              </div>
            </div>
            <ArrowRight
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
          </Link>
        ) : (
          <div className="max-w-[320px]">
            <p className="text-sm font-medium">
              The next top spot is still being earned.
            </p>
            <Link
              href="/rankings"
              className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-primary"
            >
              Explore rankings
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
