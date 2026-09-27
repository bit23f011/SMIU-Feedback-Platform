import * as React from "react";

import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, MessageSquare, PencilLine, Star, X } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { RatingStars } from "@/components/common/rating-stars";
import { Badge } from "@/components/ui/badge";
import {
  formatReviewContext,
  type PublicReview,
  type ReviewAnswer,
} from "@/features/reviews/types";

/*
  Public review list.

  YAAD RAHE: yahan koi author field hai hi nahi - na naam, na initials, na
  koi "student #123" jaisa stable id. Aisa id bhi anonymity torh deta hai
  kyunki us se ek hi banday ki saari reviews jorhi ja sakti hain. Har review
  bas "Anonymous student" hai.

  Tareekh bhi sirf mahina aur saal dikhate hain. Poora timestamp + department
  + course mila kar chhote department me banda pehchana ja sakta hai.

  TEXT KA MASLA (README §22): `comment` null ho sakta hai do wajah se - ya
  student ne kuch likha hi nahi, ya text abhi approve nahi hua. Public ke liye
  dono ek jaise hain. Is card me JAAN BOOJH KAR "pending review" jaisa koi
  lafz nahi hai, warna log ginne lag jate ke kis banday par kitna text ruka
  hua hai. Rating dono soorton me poori ginti hai.
*/

function formatMonth(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function AnswerChip({ answer }: { answer: ReviewAnswer }) {
  if (answer.kind === "star") {
    if (answer.star === null) return null;
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-ink-50 px-2 py-0.5 text-xs text-ink-700">
        <span>{answer.label}</span>
        <span className="font-semibold tabular-nums text-foreground">{answer.star}/5</span>
      </span>
    );
  }

  if (answer.yes === null) return null;

  return (
    <span
      className={
        answer.yes
          ? "inline-flex items-center gap-1 rounded-md border border-state-success/25 bg-state-success-soft px-2 py-0.5 text-xs font-medium text-state-success"
          : "inline-flex items-center gap-1 rounded-md border border-ink-200 bg-ink-50 px-2 py-0.5 text-xs font-medium text-ink-600"
      }
    >
      {answer.yes ? (
        <Check aria-hidden="true" className="size-3" />
      ) : (
        <X aria-hidden="true" className="size-3" />
      )}
      {answer.label}
    </span>
  );
}

export function ReviewCard({ review }: { review: PublicReview }) {
  /*
    Course + semester dikhana isi liye hai ke review ka sandarbh samajh aaye:
    "kis class ki baat ho rahi hai". Yeh identity nahi kholta - ek class me
    bohat se students hote hain, aur review par is ke ilawa koi nishani nahi.
    Purani reviews me yeh khali ho sakta hai, tab chip aati hi nahi.
  */
  const context = formatReviewContext(review);

  return (
    <article className="rounded-lg border border-border bg-background p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Badge variant="default">Anonymous student</Badge>
          {review.isFeatured ? (
            /* Coral = signature highlight, wahi jo "Top rated" par chalta hai. */
            <Badge variant="accent">
              <Star aria-hidden="true" />
              Featured
            </Badge>
          ) : null}
          {review.wasEdited ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <PencilLine aria-hidden="true" className="size-3" />
              Edited
            </span>
          ) : null}
        </div>
        <time dateTime={review.createdAt} className="text-xs text-muted-foreground">
          {formatMonth(review.createdAt)}
        </time>
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
        <p className="mt-3 text-sm italic leading-relaxed text-muted-foreground">
          This student submitted a rating without a written comment.
        </p>
      )}

      {review.answers.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
          {review.answers.map((answer) => (
            <AnswerChip key={answer.key} answer={answer} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

/** Upar dikhne wali chuni hui reviews (README §24). Admin hi feature karta hai. */
export function FeaturedReviews({ reviews }: { reviews: PublicReview[] }) {
  if (reviews.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Highlighted reviews
      </h3>
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}

/*
  Pagination links.

  Server-side pagination hai: har page ki reviews alag request me aati hain,
  is liye browser me kabhi 200+ review texts nahi aate (README §23). Links
  asli <a> hain, taake JavaScript band ho to bhi chalein, aur search engine
  har page tak pahunch sake.
*/
function ReviewPagination({
  page,
  pageCount,
  baseHref,
}: {
  page: number;
  pageCount: number;
  baseHref: string;
}) {
  if (pageCount <= 1) return null;

  const hrefFor = (target: number) =>
    `${baseHref}${baseHref.includes("?") ? "&" : "?"}page=${target}#reviews-heading`;

  const linkClass =
    "inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-ink-700 transition-colors duration-150 ease-out hover:border-indigo-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  const disabledClass =
    "inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-border/60 px-3 py-1.5 text-sm font-medium text-muted-foreground/60";

  return (
    <nav aria-label="Review pages" className="flex items-center justify-between gap-3 pt-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={linkClass} rel="prev">
          <ChevronLeft aria-hidden="true" className="size-4" />
          Previous
        </Link>
      ) : (
        <span className={disabledClass} aria-hidden="true">
          <ChevronLeft className="size-4" />
          Previous
        </span>
      )}

      <p className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
        Page {page} of {pageCount}
      </p>

      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={linkClass} rel="next">
          Next
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <span className={disabledClass} aria-hidden="true">
          Next
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}

export function ReviewList({
  reviews,
  total,
  page = 1,
  perPage,
  baseHref,
}: {
  reviews: PublicReview[];
  total?: number;
  page?: number;
  perPage?: number;
  baseHref?: string;
}) {
  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare />}
        title="No reviews yet"
        description="Be the first verified student to share an honest, respectful experience."
      />
    );
  }

  const pageCount =
    total && perPage && perPage > 0 ? Math.max(Math.ceil(total / perPage), 1) : 1;

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}

      {baseHref ? (
        <ReviewPagination page={page} pageCount={pageCount} baseHref={baseHref} />
      ) : null}
    </div>
  );
}
