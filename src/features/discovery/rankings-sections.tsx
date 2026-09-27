import * as React from "react";

import Link from "next/link";
import { Flame, MessageSquareText, MousePointerClick, Trophy } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMostReviewed,
  getRankings,
  getRankingThreshold,
  getTrending,
} from "@/features/discovery/queries";
import { RankedList, type RankedListItem } from "@/features/discovery/ranked-list";
import type { RankingScope } from "@/features/discovery/types";
import type { PersonCategory } from "@/features/people/types";
import { getCategoryMeta } from "@/lib/constants";

/*
  Rankings, Most Reviewed aur Trending - teeno alag concept hain (README §40, §41,
  §42), is liye teen alag sections. Copy §121 ke mutabiq chhoti aur factual hai:
  koi lamba "yeh spot kaise milta hai" wala block nahi.
*/

const SCOPE_NEEDS_ID: Record<RankingScope, "department" | "course" | "semester" | null> = {
  university: null,
  department: "department",
  course: "course",
  semester: "semester",
};

export async function RankingsResult({
  category,
  scope,
  departmentId,
  courseId,
  semesterId,
}: {
  category: PersonCategory;
  scope: RankingScope;
  departmentId: string | null;
  courseId: string | null;
  semesterId: string | null;
}) {
  const meta = getCategoryMeta(category);
  const needs = SCOPE_NEEDS_ID[scope];
  const scopeId =
    needs === "department" ? departmentId : needs === "course" ? courseId : needs === "semester" ? semesterId : null;

  // Scope ke liye id chahiye magar chuni nahi: pehle wo maango, khali list nahi.
  if (needs && !scopeId) {
    return (
      <EmptyState
        tone="no-results"
        icon={<MousePointerClick />}
        title={`Choose a ${needs} to see its ranking`}
        description={`Pick a ${needs} above and the top ${meta.label.toLowerCase()} for it will appear here.`}
      />
    );
  }

  const [ranked, threshold] = await Promise.all([
    getRankings({ category, scope, departmentId, courseId, semesterId, limit: 10 }),
    getRankingThreshold(),
  ]);

  if (ranked.length === 0) {
    return (
      <EmptyState
        icon={<Trophy />}
        title="Rankings are not open here yet"
        description={`A profile joins the ranking once it has at least ${threshold} verified reviews. Until then, you can browse the full directory.`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/${meta.slug}`}>Browse {meta.label.toLowerCase()}</Link>
          </Button>
        }
      />
    );
  }

  const items: RankedListItem[] = ranked.map((person) => ({ person, rank: person.rank }));

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Ranked by verified student ratings. Profiles need at least {threshold} reviews to appear.
      </p>
      <RankedList items={items} />
    </div>
  );
}

export async function MostReviewedSection({ category }: { category: PersonCategory }) {
  const people = await getMostReviewed({ category, limit: 10 });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareText aria-hidden="true" className="size-4 text-indigo-600" />
          Most reviewed
        </CardTitle>
      </CardHeader>
      <CardContent>
        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reviews have been collected yet. This list fills in as students post verified reviews.
          </p>
        ) : (
          <RankedList
            items={people.map((person) => ({
              person,
              metric: person.reviewCount
                ? `${person.reviewCount} ${person.reviewCount === 1 ? "review" : "reviews"}`
                : undefined,
            }))}
          />
        )}
      </CardContent>
    </Card>
  );
}

export async function TrendingSection({ category }: { category: PersonCategory }) {
  const people = await getTrending({ category, limit: 10 });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame aria-hidden="true" className="size-4 text-coral-600" />
          Trending
        </CardTitle>
      </CardHeader>
      <CardContent>
        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing is trending right now. This list reflects recent verified review activity.
          </p>
        ) : (
          <RankedList
            items={people.map((person) => ({
              person,
              metric: `${person.recentReviews} in the last ${person.windowDays} days`,
            }))}
          />
        )}
      </CardContent>
    </Card>
  );
}
