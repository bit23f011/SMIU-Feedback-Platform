import * as React from "react";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { RatingStars } from "@/components/common/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonAvatar } from "@/features/people/person-avatar";
import { getPersonBySlug } from "@/features/people/queries";
import { TEACHER_TYPE_LABELS } from "@/features/people/types";
import {
  getFeaturedPersonReviews,
  getPersonCriteriaStats,
  getPersonRatingStats,
  getPersonReviews,
} from "@/features/reviews/queries";
import { RatingSummary } from "@/features/reviews/rating-summary";
import { FeaturedReviews, ReviewList } from "@/features/reviews/review-list";
import { ReviewPanel } from "@/features/reviews/review-panel";
import { REVIEWS_PER_PAGE } from "@/features/reviews/types";
import { ProfileBreakdowns, ProfileBreakdownsSkeleton } from "@/features/discovery/profile-breakdowns";
import { RecordView } from "@/features/discovery/record-view";
import { SaveProfileButton } from "@/features/discovery/save-profile-button";
import { getCategoryMeta } from "@/lib/constants";

/*
  Public profile page.

  Phase 3 se yahan asli reviews aati hain - magar hamesha GUMNAAM. Is page ki
  koi query author tak nahi pahunch sakti: `reviews` table me author ka column
  hi nahi hai, authorship alag private table (`review_authors`) me hai jis par
  RLS sirf apni row deti hai.

  ONE PERSON = ONE PUBLIC PROFILE: agar koi shakhs teacher bhi hai aur faculty
  bhi, to dono roles isi ek page par listed hote hain - do alag profiles nahi.
*/

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const person = await getPersonBySlug(params.slug);
  if (!person) return { title: "Profile not found" };

  return {
    title: person.name,
    description: person.headline ?? `${person.name} at Sindh Madressatul Islam University, Karachi.`,
    alternates: { canonical: `/people/${person.slug}` },
  };
}

export default async function PersonProfilePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { page?: string };
}) {
  const person = await getPersonBySlug(params.slug);
  if (!person) notFound();

  /*
    Page number URL se aata hai, is liye is par bharosa nahi. Ghalat ya bara
    number "1" ban jata hai; DB apni taraf se bhi limit clamp karti hai.
  */
  const requestedPage = Number.parseInt(searchParams?.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [stats, criteriaStats, featured, reviewPage] = await Promise.all([
    getPersonRatingStats(person.id),
    getPersonCriteriaStats(person.id),
    getFeaturedPersonReviews(person.id),
    getPersonReviews(person.id, { page }),
  ]);

  const primaryRole = person.roles.find((role) => role.isPrimary) ?? person.roles[0];
  const backCategory = getCategoryMeta(primaryRole?.category ?? person.primaryCategory ?? "teacher");

  return (
    <div className="container py-10 md:py-12">
      <Link
        href={`/${backCategory.slug}`}
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 transition-colors duration-150 ease-out hover:text-foreground"
      >
        <ArrowLeft
          aria-hidden="true"
          className="size-4 transition-transform duration-150 ease-out group-hover:-translate-x-0.5"
        />
        Back to {backCategory.label}
      </Link>

      <header className="mt-6 flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-start sm:gap-6">
        <PersonAvatar
          name={person.name}
          gender={person.gender}
          photoUrl={person.photoUrl}
          className="h-20 w-20 shrink-0"
        />

        <div className="min-w-0 flex-1">
          <h1 className="text-display-sm font-semibold text-foreground">{person.name}</h1>
          {person.headline ? (
            <p className="mt-1.5 text-sm text-muted-foreground">{person.headline}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {person.roles.map((role) => {
              const meta = getCategoryMeta(role.category);
              return (
                <Badge key={`${role.category}-${role.title ?? "role"}`} variant="category">
                  {role.title ?? meta.singular}
                </Badge>
              );
            })}
            {primaryRole?.department ? (
              <Badge variant="brand">{primaryRole.department}</Badge>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
            <RatingStars value={person.rating} count={person.reviewCount} size="md" />
            {/* Save button apni auth state khud parhta hai (server wrapper). */}
            <SaveProfileButton
              personId={person.id}
              personName={person.name}
              nextPath={`/people/${person.slug}`}
            />
          </div>
        </div>
      </header>

      {/* Recently viewed me darj karo (§46). Kuch render nahi karta. */}
      <RecordView personId={person.id} />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section aria-labelledby="write-review-heading">
            <h2 id="write-review-heading" className="sr-only">
              Write a review
            </h2>
            <ReviewPanel person={person} />
          </section>

          <section aria-labelledby="reviews-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="reviews-heading" className="text-lg font-semibold text-foreground">
                Student reviews
              </h2>
              {stats.reviewCount > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {stats.reviewCount} {stats.reviewCount === 1 ? "review" : "reviews"}
                </p>
              ) : null}
            </div>

            {/*
              Featured sirf pehle page par. Page 2 par dobara wahi reviews
              dikhana sirf shor hai.
            */}
            {page === 1 ? (
              <div className="mt-4">
                <FeaturedReviews reviews={featured} />
              </div>
            ) : null}

            <div className="mt-6">
              <ReviewList
                reviews={reviewPage.reviews}
                total={reviewPage.total}
                page={page}
                perPage={REVIEWS_PER_PAGE}
                baseHref={`/people/${person.slug}`}
              />
            </div>
          </section>

          {/*
            Course-wise aur semester-wise breakdown (§38, §39). Apni DB calls
            karta hai, is liye alag stream hota hai taake reviews us ka intezaar
            na karein. Data kam ho to yeh khud kuch render nahi karta.
          */}
          <section aria-label="Ratings by course and semester">
            <React.Suspense fallback={<ProfileBreakdownsSkeleton />}>
              <ProfileBreakdowns personId={person.id} />
            </React.Suspense>
          </section>
        </div>

        <aside className="space-y-4">
          <RatingSummary stats={stats} criteria={criteriaStats} />

          <Card>
            <CardHeader>
              <CardTitle>Roles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {person.roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roles recorded.</p>
              ) : (
                <ul className="list-none space-y-3">
                  {person.roles.map((role) => {
                    const meta = getCategoryMeta(role.category);
                    return (
                      <li
                        key={`${role.category}-${role.title ?? "role"}-detail`}
                        className="text-sm"
                      >
                        <p className="font-medium text-foreground">{role.title ?? meta.singular}</p>
                        <p className="text-muted-foreground">
                          {meta.label}
                          {role.department ? ` · ${role.department}` : ""}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/*
                README §30. Internal teacher ko DB khud faculty role bhi deti
                hai, isi ek profile par. Yeh line sirf us ka sabab batati hai.
              */}
              {person.teacherType ? (
                <p className="border-t border-border pt-3 text-sm text-muted-foreground">
                  Teacher type:{" "}
                  <span className="font-medium text-foreground">
                    {TEACHER_TYPE_LABELS[person.teacherType]}
                  </span>
                  {person.teacherType === "internal"
                    ? ". Internal teachers are listed under Faculty as well, on this same profile."
                    : "."}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How ratings work</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Ratings are averaged from verified student reviews only. A profile with no
                reviews stays unrated, and is never shown as zero. Every review is posted
                anonymously: the reviewer&apos;s name is never stored next to it.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
