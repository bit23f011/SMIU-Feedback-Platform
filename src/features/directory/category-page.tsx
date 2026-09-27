import * as React from "react";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { PersonGridSkeleton } from "@/components/common/loading-state";
import { CategoryDirectory } from "@/features/directory/category-directory";
import { CategoryTabs } from "@/features/directory/category-tabs";
import { DirectorySearch } from "@/features/directory/directory-search";
import { DirectoryFilterBar, FilterControlsSkeleton } from "@/features/discovery/filter-bar";
import { readDirectoryFilters, type QueryParams } from "@/features/discovery/types";
import { getCategoryBySlug } from "@/lib/constants";

/*
  Paanchon category routes (/teachers, /lab-instructors, /faculty, /uni-staff,
  /hr-staff) ek hi layout share karte hain. Har page.tsx patla rehta hai aur
  asli structure yahan ek jagah hai - is liye design kabhi pages ke beech
  diverge nahi karta.

  Har category ka apna route hai (§ requirement), ek giant mixed page nahi.
*/

export type CategorySearchParams = QueryParams;

/** searchParams se ek safe string nikaalta hai (array/undefined dono handle). */
export function readSearchTerm(searchParams: CategorySearchParams | undefined): string {
  const raw = searchParams?.q;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

export function buildCategoryMetadata(slug: string): Metadata {
  const meta = getCategoryBySlug(slug);
  if (!meta) return {};

  return {
    title: meta.label,
    description: meta.description,
    alternates: { canonical: `/${meta.slug}` },
  };
}

export function CategoryPageView({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams?: CategorySearchParams;
}) {
  const meta = getCategoryBySlug(slug);
  if (!meta) notFound();

  const filters = readDirectoryFilters(searchParams);

  /*
    Suspense key me poora filter set hai, is liye har nayi query par skeleton
    wapas aata hai (warna purana natija naye filter ke saath thehra rehta).
  */
  const resultKey = JSON.stringify(filters);

  return (
    <div className="container py-10 md:py-12">
      <PageHeader eyebrow="Directory" title={meta.label} description={meta.description}>
        <CategoryTabs active={meta.value} />
      </PageHeader>

      <div className="mt-8 max-w-xl">
        <DirectorySearch
          label={`Search ${meta.label.toLowerCase()} by name`}
          placeholder={`Search ${meta.label.toLowerCase()} by name`}
        />
      </div>

      {/* Filter bar reference data parhti hai, is liye alag stream hoti hai. */}
      <React.Suspense
        fallback={
          <FilterControlsSkeleton count={meta.value === "teacher" ? 6 : 5} className="mt-6" />
        }
      >
        <DirectoryFilterBar className="mt-6" showTeacherType={meta.value === "teacher"} />
      </React.Suspense>

      <div className="mt-8">
        <React.Suspense key={resultKey} fallback={<PersonGridSkeleton />}>
          <CategoryDirectory category={meta.value} filters={filters} />
        </React.Suspense>
      </div>
    </div>
  );
}
