import * as React from "react";

import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { ListSkeleton } from "@/components/common/loading-state";
import { getFilterOptions } from "@/features/discovery/queries";
import { RankingControls } from "@/features/discovery/ranking-controls";
import {
  MostReviewedSection,
  RankingsResult,
  TrendingSection,
} from "@/features/discovery/rankings-sections";
import {
  firstParam,
  parseId,
  parsePersonCategory,
  parseRankingScope,
  type QueryParams,
} from "@/features/discovery/types";
import { getCategoryMeta } from "@/lib/constants";

/*
  /rankings - README §40, §41, §42.

  Teen alag concept, teen alag sections: Best (scoped ranking), Most Reviewed,
  aur Trending. Copy §121 ke mutabiq chhoti hai; ranking ka asli hisaab DB me
  hai (deterministic, admin-configurable threshold), UI usay sirf dikhata hai.
*/

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rankings",
  description:
    "Rankings on SMIU Feedback Website are based on verified student ratings and the minimum review threshold, with separate Most Reviewed and Trending sections.",
  alternates: { canonical: "/rankings" },
};

async function RankingControlsBar() {
  const options = await getFilterOptions();
  return <RankingControls options={options} />;
}

export default function RankingsPage({ searchParams }: { searchParams?: QueryParams }) {
  const category = parsePersonCategory(firstParam(searchParams, "category"));
  const scope = parseRankingScope(firstParam(searchParams, "scope"));
  const departmentId = parseId(firstParam(searchParams, "dept"));
  const courseId = parseId(firstParam(searchParams, "course"));
  const semesterId = parseId(firstParam(searchParams, "semester"));

  const meta = getCategoryMeta(category);
  const resultKey = `${category}|${scope}|${departmentId}|${courseId}|${semesterId}`;

  return (
    <div className="container py-8 md:py-10">
      <PageHeader
        eyebrow="Explore"
        title="Rankings"
        description="Based on verified student ratings and the minimum review threshold."
      />

      <div className="mt-6">
        {/* Controls reference data parhte hain, is liye alag stream. */}
        <React.Suspense fallback={<div className="h-9 w-full animate-pulse rounded-md bg-ink-100" />}>
          <RankingControlsBar />
        </React.Suspense>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <section aria-labelledby="best-heading" className="lg:col-span-3">
          <h2 id="best-heading" className="text-lg font-semibold text-foreground">
            Best {meta.label.toLowerCase()}
          </h2>
          <div className="mt-4">
            <React.Suspense key={resultKey} fallback={<ListSkeleton rows={5} />}>
              <RankingsResult
                category={category}
                scope={scope}
                departmentId={departmentId}
                courseId={courseId}
                semesterId={semesterId}
              />
            </React.Suspense>
          </div>
        </section>

        <div className="lg:col-span-3">
          <div className="grid gap-6 lg:grid-cols-2">
            <React.Suspense key={`mr-${category}`} fallback={<ListSkeleton rows={4} />}>
              <MostReviewedSection category={category} />
            </React.Suspense>
            <React.Suspense key={`tr-${category}`} fallback={<ListSkeleton rows={4} />}>
              <TrendingSection category={category} />
            </React.Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
