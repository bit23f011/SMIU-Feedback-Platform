import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { PersonGrid } from "@/features/people/person-card";
import {
  getMyFavorites,
  getMyRecentlyViewed,
} from "@/features/discovery/queries";
import { getMyReviewsResult } from "@/features/reviews/queries";
import { formatReviewContext } from "@/features/reviews/types";
import { getCategoryMeta } from "@/lib/constants";
import { GuideButton } from "@/components/layout/site-experience";
import { reviewProfileHref } from "@/features/reviews/review-context";
export const metadata: Metadata = {
  title: "Your student workspace",
  description: "Your reviews, saved profiles and campus activity.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function StudentHomePage() {
  const [recentlyViewed, result, favorites] = await Promise.all([
    getMyRecentlyViewed(3),
    getMyReviewsResult(),
    getMyFavorites({ perPage: 3 }),
  ]);
  const reviews = result.reviews.filter((r) => r.status !== "removed");
  const pending = reviews.filter(
    (r) => r.comment && r.moderationStatus === "pending",
  );
  const recent = [...reviews]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);
  const stats = [
    {
      label: "Your reviews",
      value: result.failed ? "Unavailable" : String(reviews.length),
      href: "/student/reviews",
    },
    {
      label: "Text awaiting approval",
      value: result.failed ? "Unavailable" : String(pending.length),
      href: "/student/reviews?status=pending",
    },
    {
      label: "Saved profiles",
      value: favorites.failed ? "Unavailable" : String(favorites.total),
      href: "/student/favorites",
    },
  ];
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="eyebrow">Your student workspace</p>
          <h1 className="editorial-title mt-3 text-3xl sm:text-[2.5rem]">
            Your campus notebook.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Keep track of what you shared and what you want to explore.
          </p>
        </div>
        <Button asChild>
          <Link href="/teachers">
            Write a review
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </header>
      <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-border bg-card sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="border-b border-border px-6 py-5 last:border-0 hover:bg-secondary sm:border-b-0 sm:border-r"
          >
            <p className="text-[11px] font-medium text-muted-foreground">
              {stat.label}
            </p>
            <p
              className={
                stat.value === "Unavailable"
                  ? "mt-3 text-sm text-muted-foreground"
                  : "mt-2 text-3xl font-medium tabular-nums"
              }
            >
              {stat.value}
            </p>
          </Link>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section
          className="self-start rounded-lg border border-border bg-card"
          aria-labelledby="recent-review-heading"
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 id="recent-review-heading" className="text-sm font-semibold">
              Your recent reviews
            </h2>
            <Link
              href="/student/reviews"
              className="text-xs font-medium text-primary"
            >
              View all
            </Link>
          </div>
          {result.failed ? (
            <p className="p-6 text-sm text-muted-foreground">
              Your reviews could not be loaded. Please refresh in a moment.
            </p>
          ) : recent.length ? (
            <ul className="divide-y divide-border">
              {recent.map((review) => (
                <li key={review.id}>
                  <Link
                      href={reviewProfileHref(review)}
                    className="flex items-start justify-between gap-4 p-5 hover:bg-secondary/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {review.personName}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatReviewContext(review) ||
                          getCategoryMeta(review.category).label}
                      </p>
                      <p className="mt-3 text-[10px] font-medium text-primary">
                        {review.status === "hidden"
                          ? "Hidden by moderator"
                          : review.comment &&
                              review.moderationStatus === "pending"
                            ? "Written feedback pending approval"
                            : review.comment &&
                                review.moderationStatus === "rejected"
                              ? "Written feedback not approved"
                              : "Rating published"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-sm font-semibold tabular-nums">
                      {review.overallRating}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {" "}
                        /10
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-10">
              <p className="editorial-title text-2xl">
                Your first review starts here.
              </p>
              <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                Find a teacher or campus staff member and share an experience
                you know first-hand.
              </p>
              <Link
                href="/teachers"
                className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-primary"
              >
                Find a profile
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>
        <section
          className="rounded-lg border border-border bg-surface p-6"
          aria-labelledby="next-step-heading"
        >
          <p className="eyebrow">Before your next course</p>
          <h2 id="next-step-heading" className="editorial-title mt-3 text-2xl">
            A little context goes a long way.
          </h2>
          <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
            Browse course feedback, save profiles and compare experiences before
            registration.
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <Link
              href="/courses"
              className="flex justify-between text-xs font-semibold text-primary"
            >
              Explore courses
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/rankings"
              className="flex justify-between text-xs font-semibold text-primary"
            >
              See student rankings
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/student/favorites"
              className="flex justify-between text-xs font-semibold text-primary"
            >
              Open saved profiles
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
      {recentlyViewed.length ? (
        <section aria-labelledby="recently-viewed-heading">
          <div className="mb-5 flex items-center justify-between">
            <h2
              id="recently-viewed-heading"
              className="text-base font-semibold"
            >
              Pick up where you left off
            </h2>
            <span className="text-[11px] text-muted-foreground">
              Recently viewed
            </span>
          </div>
          <PersonGrid people={recentlyViewed} />
        </section>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <p className="text-[11px] text-muted-foreground">
          Written feedback is checked before it becomes public. Your identity
          stays private.
        </p>
        <GuideButton className="text-xs">Review guidelines</GuideButton>
      </div>
    </div>
  );
}
