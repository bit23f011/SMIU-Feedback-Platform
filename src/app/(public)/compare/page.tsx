import * as React from "react";

import type { Metadata } from "next";
import Link from "next/link";
import { GitCompare, Scale } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/common/loading-state";
import { ComparisonTable } from "@/features/discovery/comparison-table";
import { comparePeople } from "@/features/discovery/queries";
import {
  COMPARE_MAX,
  COMPARE_MIN,
  firstParam,
  parseCompareIds,
  parsePersonCategory,
  type QueryParams,
} from "@/features/discovery/types";
import { getCategoryMeta } from "@/lib/constants";

/*
  /compare - README §43.

  Yeh ek public, shareable view hai: sab kuch URL me hai (?ids=a,b,c aur
  ?category=). Isliye ek comparison ka link kisi ko bheja ja sakta hai aur back
  button theek chalta hai.

  Yahan sirf public aggregate ratings dikhti hain. Ids client se aati hain magar
  parseCompareIds unhe shakal aur ginti (2..4) par kaat deta hai, aur
  compare_people khud sirf active, isi category ke profiles wapas deti hai. Koi
  private list ya author-level cheez is raaste se nahi milti.
*/

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare profiles",
  description:
    "Compare verified student ratings for two to four profiles side by side, criterion by criterion.",
  alternates: { canonical: "/compare" },
};

async function ComparisonResult({
  ids,
  category,
}: {
  ids: string[];
  category: ReturnType<typeof parsePersonCategory>;
}) {
  const people = await comparePeople(ids, category);

  // DB ne jo diye wahi maani rakhte hain: ho sakta hai koi id ab active na ho.
  if (people.length < COMPARE_MIN) {
    return (
      <EmptyState
        tone="no-results"
        icon={<Scale />}
        title="These profiles cannot be compared right now"
        description={`At least ${COMPARE_MIN} available profiles of the same type are needed. One of the chosen profiles may have been removed. Pick again from your favourites.`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/student/favorites">Open favourites</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Every value comes from verified student ratings. A criterion stays blank until at least three
        students have answered it, so no single answer can identify anyone.
      </p>
      <ComparisonTable people={people} />
    </div>
  );
}

export default function ComparePage({ searchParams }: { searchParams?: QueryParams }) {
  const ids = parseCompareIds(firstParam(searchParams, "ids"));
  const category = parsePersonCategory(firstParam(searchParams, "category"));
  const meta = getCategoryMeta(category);

  const hasEnough = ids.length >= COMPARE_MIN;
  const resultKey = `${category}|${ids.join(",")}`;

  return (
    <div className="container py-8 md:py-10">
      <PageHeader
        eyebrow="Explore"
        title="Compare profiles"
        description={`Put ${COMPARE_MIN} to ${COMPARE_MAX} ${meta.label.toLowerCase()} next to each other and read every criterion in one place.`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/student/favorites">Choose from favourites</Link>
          </Button>
        }
      />

      <div className="mt-8">
        {hasEnough ? (
          <React.Suspense key={resultKey} fallback={<LoadingState label="Building comparison…" />}>
            <ComparisonResult ids={ids} category={category} />
          </React.Suspense>
        ) : (
          <EmptyState
            icon={<GitCompare />}
            title="Pick a few profiles to compare"
            description={`Save the ${meta.label.toLowerCase()} you are deciding between, then select ${COMPARE_MIN} to ${COMPARE_MAX} of them from your favourites to line them up here.`}
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/student/favorites">Open favourites</Link>
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
