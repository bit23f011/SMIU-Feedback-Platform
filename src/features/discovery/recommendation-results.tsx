import * as React from "react";

import Link from "next/link";
import { CheckCircle2, SearchX } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { RatingStars } from "@/components/common/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PersonAvatar } from "@/features/people/person-avatar";
import { getRecommendations } from "@/features/discovery/queries";
import type { Recommendation, RecommendationInput } from "@/features/discovery/types";
import { getCategoryMeta } from "@/lib/constants";

/*
  RecommendationResults - README §44.

  Har card: profile, rating ka structure, review count, key strengths (sirf wo
  criteria jo asal me achhi rahin), aur "why suggested" (sirf wahi wajah jo lagi).
  Score jaan boojh kar chhupaya hai: raw 0..100 number user ke liye shor hai aur
  ek jhooti "precision" deta hai. Model ka faisla reasons ke zariye samjhaya jata
  hai, number ke zariye nahi.

  Koi ranking number nahi banaya jata yahan: list usi tarteeb me hai jo DB ne di
  (score se sorted, deterministic). Frontend sirf dikhata hai.
*/

const MAX_STRENGTHS = 3;

function RecommendationCard({ person }: { person: Recommendation }) {
  const meta = getCategoryMeta(person.primaryCategory ?? "teacher");
  const role = person.roles.find((item) => item.isPrimary) ?? person.roles[0];

  // Sirf wahi strengths jinka average nikla (threshold se upar). Top teen.
  const strengths = person.strengths
    .filter((strength) => strength.averageStar !== null)
    .slice(0, MAX_STRENGTHS);

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3.5">
        <PersonAvatar name={person.name} gender={person.gender} photoUrl={person.photoUrl} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold leading-snug tracking-tight text-foreground">
            <Link
              href={`/people/${person.slug}`}
              className="rounded-sm outline-none transition-colors duration-150 ease-out hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {person.name}
            </Link>
          </h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {role?.title ?? person.headline ?? meta.singular}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Badge variant="category">{meta.singular}</Badge>
        {role?.department ? <Badge variant="brand">{role.department}</Badge> : null}
      </div>

      <div className="mt-4 border-t border-border/80 pt-3.5">
        <RatingStars value={person.rating} count={person.reviewCount} />
      </div>

      {strengths.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Key strengths</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {strengths.map((strength) => (
              <Badge key={strength.key} variant="accent">
                {strength.label}
                {strength.averageStar !== null ? (
                  <span className="tabular-nums">{strength.averageStar.toFixed(1)}</span>
                ) : null}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {person.reasons.length > 0 ? (
        <div className="mt-4 border-t border-border/80 pt-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Why suggested</p>
          <ul className="mt-2 space-y-1.5">
            {person.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2 text-sm text-ink-700">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-indigo-500"
                />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

export async function RecommendationResults({ input }: { input: RecommendationInput }) {
  const recommendations = await getRecommendations(input);

  if (recommendations.length === 0) {
    return (
      <EmptyState
        tone="no-results"
        icon={<SearchX />}
        title="No eligible matches for these choices"
        description="A profile only appears here once it has enough verified reviews for that context. Try a wider choice, for example a department instead of a single course."
        action={
          <Button asChild>
            <Link href="/teachers">Browse the directory</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Suggestions use verified student ratings, how closely each profile matches your choices, and
        recent review activity. Nothing here is paid or promoted.
      </p>
      <ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((person) => (
          <li key={person.id} className="flex">
            <div className="w-full">
              <RecommendationCard person={person} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
