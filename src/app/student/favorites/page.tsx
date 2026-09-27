import * as React from "react";

import type { Metadata } from "next";
import Link from "next/link";
import { Heart, TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/features/discovery/pagination";
import { FavoritesBrowser } from "@/features/discovery/favorites-browser";
import { getMyFavorites } from "@/features/discovery/queries";
import {
  FAVORITES_PER_PAGE,
  firstParam,
  parsePage,
  totalPages,
  type QueryParams,
} from "@/features/discovery/types";

export const metadata: Metadata = {
  title: "Your favourites",
  description: "Profiles you saved on ProfAura.",
  robots: { index: false, follow: false },
};

/*
  Favourites - README §45. Ek private list.

  "Sirf mere favourites" ka faisla kabhi frontend nahi karta: my_favorites
  SECURITY INVOKER hai aur RLS sirf isi student ki rows deti hai. Yahan hum bas
  wahi list dikhate hain jo DB ne di.

  Yeh page per-user aur cookie par mabni hai, isliye dynamic. Paging server-side
  hai (asli URLs, §84), taake browser me saikron rows na aayein.
*/
export const dynamic = "force-dynamic";

export default async function FavoritesPage({ searchParams }: { searchParams?: QueryParams }) {
  const page = parsePage(firstParam(searchParams, "page"));
  const { people, total, failed } = await getMyFavorites({ page, perPage: FAVORITES_PER_PAGE });
  const pageCount = totalPages(total, FAVORITES_PER_PAGE);

  return (
    <section aria-labelledby="favorites-heading">
      <h1
        id="favorites-heading"
        className="font-display text-xl font-semibold tracking-tight text-foreground"
      >
        Your favourites
      </h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Profiles you saved while browsing. This list is private to you and is never shown on any
        public page. Select two to four to compare them side by side.
      </p>

      <div className="mt-6">
        {failed ? (
          <EmptyState
            tone="no-results"
            icon={<TriangleAlert />}
            title="Your favourites could not be loaded"
            description="Something went wrong while reading your saved list. Please refresh the page in a moment."
          />
        ) : total === 0 ? (
          <EmptyState
            icon={<Heart />}
            title="Nothing saved yet"
            description="Open any profile and use Save to keep it here. Your saved list stays private to you."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/teachers">Browse the directory</Link>
              </Button>
            }
          />
        ) : people.length === 0 ? (
          // total > 0 magar is page par kuch nahi: page range se bahar hai.
          <EmptyState
            tone="no-results"
            icon={<Heart />}
            title="Nothing on this page"
            description="That page is past the end of your saved list."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/student/favorites">Back to the first page</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-6">
            <FavoritesBrowser people={people} />
            <Pagination page={page} totalPages={pageCount} pathname="/student/favorites" />
          </div>
        )}
      </div>
    </section>
  );
}
