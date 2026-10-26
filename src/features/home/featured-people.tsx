import Link from "next/link";
import { listPeopleByCategory } from "@/features/people/queries";
import { ProfileMarquee } from "@/features/home/profile-marquee";
import { ArrowRight } from "@/components/ui/icons";
import { ErrorState } from "@/components/common/error-state";
import { isDemoDataEnabled } from "@/features/demo-data/queries";
export async function FeaturedPeople() {
  const [teachers, labs, staff, demo] = await Promise.all([
    listPeopleByCategory({ category: "teacher", limit: 10 }),
    listPeopleByCategory({ category: "lab_instructor", limit: 10 }),
    listPeopleByCategory({ category: "university_staff", limit: 10 }),
    isDemoDataEnabled(),
  ]);
  const campus = [...labs.people, ...staff.people]
    .filter(
      (person, index, all) =>
        all.findIndex((p) => p.id === person.id) === index,
    )
    .slice(0, 10);
  return (
    <section
      id="profiles"
      className="py-12 md:py-16"
      aria-labelledby="profiles-heading"
    >
      <div className="container mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">People behind the experience</p>
          <h2
            id="profiles-heading"
            className="editorial-title mt-3 text-3xl md:text-[2.4rem]"
          >
            Get to know your campus.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {demo ? "Campus profiles with labelled sample ratings." : "Real profiles. Student ratings. A clearer picture."}
          </p>
        </div>
        <Link
          href="/teachers"
          className="flex items-center gap-2 text-sm font-semibold text-primary"
        >
          View the directory
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      {teachers.failed ? (
        <div className="container">
          <ErrorState
            title="Profiles are temporarily unavailable"
            description="Please try again shortly."
          />
        </div>
      ) : teachers.people.length ? (
        <ProfileMarquee
          people={teachers.people}
          category="teacher"
          label="Teaching at SMIU"
        />
      ) : (
        <div className="container">
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            Teacher profiles will appear here as the directory grows.{" "}
            <Link href="/teachers" className="font-medium text-primary">
              Explore the directory
            </Link>
          </div>
        </div>
      )}
      {campus.length ? (
        <div className="mt-7">
          <ProfileMarquee
            people={campus}
            category="university_staff"
            reverse
            label="Labs & campus support"
          />
        </div>
      ) : null}
      {teachers.people.length > 1 && !campus.length ? (
        <div className="mt-7">
          <ProfileMarquee
            people={[...teachers.people].reverse()}
            category="teacher"
            reverse
            label="Discover more perspectives"
          />
        </div>
      ) : null}
    </section>
  );
}
