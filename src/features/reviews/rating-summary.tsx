import * as React from "react";

import { RatingStars } from "@/components/common/rating-stars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  OVERALL_MAX,
  OVERALL_VALUES_DESC,
  type PersonCriterionStat,
  type PersonRatingStats,
} from "@/features/reviews/types";

/*
  Ratings ka summary - distribution bars + har sawal ka average.

  PRIVACY BRAKE: agar kisi cheez par 3 se kam jawab hon to hum us ka number
  nahi dikhate. Chhote sample me "1 banday ne No kaha" se banda pehchana ja
  sakta hai, khaas kar chhote department me. Yeh aggregate view ka sabse aam
  de-anonymisation ka raasta hai.
*/
const MIN_RESPONSES_TO_SHOW = 3;

function Bar({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {label}
      </span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
        <span
          className="block h-full rounded-full bg-coral-400"
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {value}
      </span>
    </div>
  );
}

export function RatingSummary({
  stats,
  criteria,
}: {
  stats: PersonRatingStats;
  criteria: PersonCriterionStat[];
}) {
  if (stats.reviewCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rating breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This profile has no reviews yet, so it stays unrated instead of being shown as zero.
          </p>
        </CardContent>
      </Card>
    );
  }

  const visibleCriteria = criteria.filter((criterion) =>
    criterion.kind === "star"
      ? criterion.starResponses >= MIN_RESPONSES_TO_SHOW
      : criterion.boolResponses >= MIN_RESPONSES_TO_SHOW,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rating breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          {/*
            Average null ho to number ki jagah saaf lafz. Pehle yahan dash tha,
            jo screen reader par bhi kuch nahi batata tha.
          */}
          {stats.averageRating === null ? (
            <p className="text-sm text-muted-foreground">Not rated yet</p>
          ) : (
            <p className="font-display text-3xl font-semibold tabular-nums text-foreground">
              {stats.averageRating.toFixed(1)}
              <span className="ml-1 text-base font-normal text-muted-foreground">
                / {OVERALL_MAX}
              </span>
            </p>
          )}
          <div className="mt-1.5">
            <RatingStars value={stats.averageRating} count={stats.reviewCount} />
          </div>
        </div>

        {/*
          Dus buckets - README §15 ka overall paimana 1 se 10 hai. Tarteeb
          10 se 1 tak hai, warna sabse achhi rating sabse neeche chali jati.
        */}
        <div className="space-y-1.5">
          {OVERALL_VALUES_DESC.map((score) => (
            <Bar
              key={score}
              label={String(score)}
              value={stats.distribution[score]}
              total={stats.reviewCount}
            />
          ))}
        </div>

        {visibleCriteria.length > 0 ? (
          <div className="space-y-2.5 border-t border-border pt-4">
            {visibleCriteria.map((criterion) => (
              <div key={criterion.criterionId} className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-700">{criterion.label}</span>
                <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                  {criterion.kind === "star"
                    ? criterion.averageStar === null
                      ? "Not rated"
                      : `${criterion.averageStar.toFixed(1)}/5`
                    : `${Math.round((criterion.yesCount / criterion.boolResponses) * 100)}% yes`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            The question-by-question breakdown appears once at least {MIN_RESPONSES_TO_SHOW}{" "}
            students have answered.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
