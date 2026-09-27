"use client";

import * as React from "react";

import { PencilLine } from "lucide-react";

import { RatingStars } from "@/components/common/rating-stars";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteReviewButton } from "@/features/reviews/delete-review-button";
import { CommentModerationNote } from "@/features/reviews/comment-moderation-note";
import { ReviewForm } from "@/features/reviews/review-form";
import {
  formatReviewContext,
  type MyReviewDetail,
  type ReviewCriterion,
  type ReviewLimits,
} from "@/features/reviews/types";

/*
  Student ko apni review dikhane wala card (sirf usi ko dikhta hai).

  Edit form yahin toggle hota hai taake page badalna na pare. Agar edits khatam
  ho chuki hain to edit ka button hi nahi aata - magar asli rok DB me hai
  (update_my_review edit_count check karta hai), yeh sirf UI ki shaistagi hai.
*/

export function MyReviewCard({
  review,
  criteria,
  limits,
  personName,
}: {
  review: MyReviewDetail;
  criteria: ReviewCriterion[];
  limits: ReviewLimits;
  personName: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const context = formatReviewContext(review);

  if (review.status === "removed") {
    return (
      <Alert tone="neutral">
        <AlertDescription>
          You deleted this review. Deleting is permanent, so this course and semester cannot
          be reviewed again.
        </AlertDescription>
      </Alert>
    );
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-base font-semibold text-foreground">
            Edit your review
          </h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
        <ReviewForm
          personId={review.personId}
          personSlug={review.personSlug}
          personName={personName}
          criteria={criteria}
          limits={limits}
          existing={review}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {review.status === "hidden" ? (
        <Alert tone="warning">
          <AlertDescription>
            A moderator has hidden this review, so it is not visible on the public profile.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="brand">Your review</Badge>
          <span className="text-xs text-muted-foreground">
            {review.editsLeft} of {limits.maxEdits}{" "}
            {limits.maxEdits === 1 ? "edit" : "edits"} left
          </span>
        </div>

        <div className="mt-3">
          <RatingStars value={review.overallRating} size="md" />
        </div>

        {context ? (
          <p className="mt-2 text-xs font-medium text-muted-foreground">{context}</p>
        ) : null}

        {review.comment ? (
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-800">
            {review.comment}
          </p>
        ) : (
          <p className="mt-3 text-sm italic text-muted-foreground">
            You rated without writing a comment.
          </p>
        )}

        {/*
          Apna text hamesha dikhta hai, chahe abhi approve na hua ho. Public par
          kya dikh raha hai, wo yeh note batata hai.
        */}
        {review.comment ? (
          <div className="mt-4">
            <CommentModerationNote status={review.moderationStatus} />
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-indigo-200/70 pt-4">
          {review.editsLeft > 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
              <PencilLine aria-hidden="true" />
              Edit review
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              You have used all your edits for this review.
            </p>
          )}
          <DeleteReviewButton reviewId={review.id} personSlug={review.personSlug} />
        </div>
      </div>
    </div>
  );
}
