import type { Metadata } from "next";
import Link from "next/link";
import { getMyReviewsResult } from "@/features/reviews/queries";
import { MyReviewRow } from "@/features/student/student-reviews-page";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export const metadata: Metadata = {
  title: "Your reviews",
  robots: { index: false, follow: false },
};
export default async function AllStudentReviews({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const result = await getMyReviewsResult();
  const pending = searchParams?.status === "pending";
  const reviews = result.reviews
    .filter(
      (r) =>
        r.status !== "removed" &&
        (!pending || Boolean(r.comment && r.moderationStatus === "pending")),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Your contribution</p>
          <h1 className="editorial-title mt-3 text-3xl">Your reviews.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The experiences you shared, with their current status.
          </p>
        </div>
        <Button asChild>
          <Link href="/teachers">Write a review</Link>
        </Button>
      </div>
      <nav
        aria-label="Review status"
        className="mt-7 flex gap-6 border-b border-border"
      >
        <Link
          href="/student/reviews"
          aria-current={!pending ? "page" : undefined}
          className={cn(
            "border-b-2 py-3 text-xs font-semibold",
            !pending
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground",
          )}
        >
          All reviews
        </Link>
        <Link
          href="/student/reviews?status=pending"
          aria-current={pending ? "page" : undefined}
          className={cn(
            "border-b-2 py-3 text-xs font-semibold",
            pending
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground",
          )}
        >
          Awaiting text approval
        </Link>
      </nav>
      <div className="mt-6">
        {result.failed ? (
          <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            Your reviews could not be loaded. Please refresh in a moment.
          </p>
        ) : reviews.length ? (
          <ul className="space-y-4">
            {reviews.map((review) => (
              <MyReviewRow key={review.id} review={review} />
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-border bg-card px-6 py-12">
            <h2 className="editorial-title text-2xl">
              {pending ? "All caught up." : "A fresh page for your experience."}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {pending
                ? "You have no written feedback awaiting approval."
                : "Your reviews will appear here once you share your first experience."}
            </p>
            <Link
              href="/teachers"
              className="mt-5 inline-block text-sm font-medium text-primary"
            >
              Explore teachers
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
