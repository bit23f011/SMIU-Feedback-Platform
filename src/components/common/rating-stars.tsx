import * as React from "react";

import { Star } from "lucide-react";

import { cn, clampRating, formatCompactNumber } from "@/lib/utils";
import { OVERALL_MAX } from "@/features/reviews/types";

/*
  RatingStars - sirf DISPLAY structure hai, koi data yahan generate nahi hota.
  value null ho (abhi koi review nahi) to "Not rated yet" dikhta hai - zero stars
  nahi, kyunke 0 rating aur "no rating" do alag cheezein hain.

  SCALE: yeh component OVERALL rating dikhata hai, jo README §15 ke mutabiq
  1 se 10 tak hai. Number hamesha "X.X" 10 me se hai. Stars sirf ek tasveeri
  ishara hain: 5 stars ko value/2 se bharte hain, taake ek nazar me andaza ho
  jaye. Asli aur mustanad cheez number hai, is liye screen reader ko bhi hum
  "out of 10" hi batate hain.
*/
export interface RatingStarsProps {
  /** 0-10 (overall scale). null/undefined = abhi koi rating nahi. */
  value?: number | null;
  /** Kitne reviews par based hai. */
  count?: number | null;
  size?: "sm" | "md";
  /** Number aur review count hide karke sirf stars dikhao. */
  starsOnly?: boolean;
  className?: string;
}

export function RatingStars({
  value,
  count,
  size = "sm",
  starsOnly = false,
  className,
}: RatingStarsProps) {
  const hasRating = typeof value === "number" && Number.isFinite(value);
  const rating = hasRating ? clampRating(value, 0, OVERALL_MAX) : 0;
  // 5 stars par 10 ka paimana dikhane ke liye aadha kar lo.
  const stars = rating / 2;
  const starSize = size === "md" ? "size-[1.125rem]" : "size-4";
  const textSize = size === "md" ? "text-sm" : "text-[0.8125rem]";

  const label = hasRating
    ? `Rated ${rating.toFixed(1)} out of ${OVERALL_MAX}${
        typeof count === "number" ? ` from ${count} reviews` : ""
      }`
    : "Not rated yet";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => {
          const filled = hasRating && stars >= index + 0.5;
          return (
            <Star
              key={index}
              className={cn(
                starSize,
                filled ? "fill-coral-400 text-coral-500" : "fill-transparent text-ink-300",
              )}
              strokeWidth={1.75}
            />
          );
        })}
      </span>

      {starsOnly ? null : hasRating ? (
        <span className={cn("font-medium text-foreground", textSize)}>
          {rating.toFixed(1)}
          <span className="font-normal text-muted-foreground">/{OVERALL_MAX}</span>
          {typeof count === "number" ? (
            <span className="ml-1 font-normal text-muted-foreground">
              ({formatCompactNumber(count)})
            </span>
          ) : null}
        </span>
      ) : (
        <span className={cn("text-muted-foreground", textSize)}>Not rated yet</span>
      )}

      <span className="sr-only">{label}</span>
    </span>
  );
}
