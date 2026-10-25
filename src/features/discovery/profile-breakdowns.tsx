import {
  getPersonCourseRatings,
  getPersonSemesterRatings,
} from "@/features/discovery/queries";
import { ProfileBreakdownsView } from "@/features/discovery/profile-breakdowns-view";

export async function ProfileBreakdowns({ personId }: { personId: string }) {
  const [courses, semesters] = await Promise.all([
    getPersonCourseRatings(personId),
    getPersonSemesterRatings(personId),
  ]);
  return <ProfileBreakdownsView courses={courses} semesters={semesters} />;
}

/** Fallback jab breakdown data stream ho raha ho. */
export function ProfileBreakdownsSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-lg border border-border bg-card p-5"
    >
      <div className="h-4 w-36 rounded bg-ink-200/70" />
      <div className="mt-4 space-y-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="h-3.5 w-48 rounded bg-ink-100" />
            <div className="h-3.5 w-16 rounded bg-ink-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
