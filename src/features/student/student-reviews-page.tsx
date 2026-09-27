import * as React from "react";

import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { RatingStars } from "@/components/common/rating-stars";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PersonCategory } from "@/features/people/types";
import { CommentModerationNote } from "@/features/reviews/comment-moderation-note";
import { getMyReviews } from "@/features/reviews/queries";
import { formatReviewContext, type MyReview } from "@/features/reviews/types";

/*
  Student ke "my reviews" pages ka shared frame.

  Yahan student ko APNI reviews dikhti hain, is liye apna likha hua text hamesha
  dikhta hai - chahe public par abhi approve na hua ho. Public list aur is page
  me yehi farq hai.

  Ek hi banday par ek se zyada review mumkin hai (README §25: scope student +
  person + course + semester hai), is liye har card par course aur semester ka
  chip lagta hai, warna do reviews ek jaisi lagti hain.
*/

export interface StudentReviewsPageProps {
  title: string;
  description: string;
  emptyTitle: string;
  /** Kis category ki reviews is page par aayen. */
  category: PersonCategory;
  /** Us category ka public directory route. */
  browseHref: string;
  browseLabel: string;
}

function formatMonth(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

const STATUS_LABEL: Record<MyReview["status"], string | null> = {
  published: null,
  hidden: "Hidden by a moderator",
  removed: "Deleted",
};

function MyReviewRow({ review }: { review: MyReview }) {
  const context = formatReviewContext(review);
  const statusLabel = STATUS_LABEL[review.status];

  return (
    <li className="rounded-lg border border-border bg-background p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-foreground">
            <Link
              href={`/people/${review.personSlug}`}
              className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {review.personName}
            </Link>
          </h2>
          {context ? (
            <p className="mt-1 text-xs font-medium text-muted-foreground">{context}</p>
          ) : null}
        </div>
        <time dateTime={review.createdAt} className="text-xs text-muted-foreground">
          {formatMonth(review.createdAt)}
        </time>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <RatingStars value={review.overallRating} size="md" />
        {statusLabel ? <Badge variant="outline">{statusLabel}</Badge> : null}
      </div>

      {review.comment ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-800">
          {review.comment}
        </p>
      ) : (
        <p className="mt-3 text-sm italic text-muted-foreground">
          You rated without writing a comment.
        </p>
      )}

      {review.comment ? (
        <div className="mt-4">
          <CommentModerationNote status={review.moderationStatus} />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button asChild variant="outline" size="sm">
          <Link href={`/people/${review.personSlug}`}>Open profile</Link>
        </Button>
        <span className="text-xs text-muted-foreground">
          {review.editsLeft} {review.editsLeft === 1 ? "edit" : "edits"} left
        </span>
      </div>
    </li>
  );
}

export async function StudentReviewsPage({
  title,
  description,
  emptyTitle,
  category,
  browseHref,
  browseLabel,
}: StudentReviewsPageProps) {
  const all = await getMyReviews();
  const reviews = all.filter((review) => review.category === category);

  return (
    <section aria-labelledby="student-section-heading">
      <h1
        id="student-section-heading"
        className="font-display text-xl font-semibold tracking-tight text-foreground"
      >
        {title}
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>

      <div className="mt-6">
        {reviews.length === 0 ? (
          <EmptyState
            icon={<MessageSquare />}
            title={emptyTitle}
            description="Anything you write shows up here, with its current status, and stays editable for a limited number of edits."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href={browseHref}>{browseLabel}</Link>
              </Button>
            }
          />
        ) : (
          <ul className="list-none space-y-4">
            {reviews.map((review) => (
              <MyReviewRow key={review.id} review={review} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
