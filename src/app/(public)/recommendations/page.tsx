import * as React from "react";

import type { Metadata } from "next";
import { Compass } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PersonGridSkeleton } from "@/components/common/loading-state";
import { getFilterOptions } from "@/features/discovery/queries";
import { RecommendationForm } from "@/features/discovery/recommendation-form";
import { RecommendationResults } from "@/features/discovery/recommendation-results";
import {
  firstParam,
  hasRecommendationInput,
  parseId,
  parsePersonCategory,
  type QueryParams,
  type RecommendationInput,
} from "@/features/discovery/types";

/*
  /recommendations - README §44.

  Deterministic model DB me hai (recommend_teachers), koi LLM nahi. Yeh page sirf
  choices leta hai aur natija dikhata hai. Kuch bhi paid ya promoted nahi.

  Inputs URL me hain, isliye ek suggestion shareable hai. Result tabhi banta hai
  jab kam se kam ek matlab-khez choice ho (course/department/program), warna hum
  poora catalog nahi manga bethte - §84 (browser me bara data nahi).
*/

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recommendations",
  description:
    "Recommendations on ProfAura are based on your course, department, program and verified student reviews.",
  alternates: { canonical: "/recommendations" },
};

async function RecommendationFormBar() {
  const options = await getFilterOptions();
  return <RecommendationForm options={options} />;
}

export default function RecommendationsPage({ searchParams }: { searchParams?: QueryParams }) {
  const input: RecommendationInput = {
    category: parsePersonCategory(firstParam(searchParams, "category")),
    courseId: parseId(firstParam(searchParams, "course")),
    departmentId: parseId(firstParam(searchParams, "dept")),
    programId: parseId(firstParam(searchParams, "program")),
    semesterId: parseId(firstParam(searchParams, "semester")),
    section: (firstParam(searchParams, "section") ?? "").trim().slice(0, 12),
  };

  const ready = hasRecommendationInput(input);
  const resultKey = `${input.category}|${input.courseId}|${input.departmentId}|${input.programId}|${input.semesterId}|${input.section}`;

  return (
    <div className="container py-8 md:py-10">
      <PageHeader
        eyebrow="Explore"
        title="Recommendations"
        description="Choose a course, department or program and see which teachers verified students rate highest for it. Nothing here is paid or promoted."
      />

      <div className="mt-6">
        <React.Suspense
          fallback={<div className="h-64 w-full animate-pulse rounded-lg bg-ink-100" />}
        >
          <RecommendationFormBar />
        </React.Suspense>
      </div>

      <div className="mt-8">
        {ready ? (
          <React.Suspense key={resultKey} fallback={<PersonGridSkeleton count={3} />}>
            <RecommendationResults input={input} />
          </React.Suspense>
        ) : (
          <EmptyState
            icon={<Compass />}
            title="Tell us what you are planning"
            description="Pick at least a course, a department or a program above, then choose Show recommendations. The more you add, the closer the match."
          />
        )}
      </div>
    </div>
  );
}
