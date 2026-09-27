import type { MetadataRoute } from "next";

import { PERSON_CATEGORIES } from "@/lib/constants";
import { publicEnv } from "@/lib/env";

/*
  sitemap.xml route.

  Sirf PUBLIC aur indexable routes yahan aate hain. /auth/*, /student/* aur
  /admin/* jaan boojh kar bahar hain (woh noindex hain aur robots.txt me bhi
  disallowed).

  Individual person profiles (/people/[slug]) abhi list nahi kiye ja rahe:
  unki list DB se aati hai aur sitemap generate karte waqt DB hit karna is
  phase me zaroori nahi. Reviews live hone par yeh add honge.
*/
export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicEnv.siteUrl.replace(/\/$/, "");
  const now = new Date();

  const categoryRoutes: MetadataRoute.Sitemap = PERSON_CATEGORIES.map((category) => ({
    url: `${base}/${category.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const exploreRoutes: MetadataRoute.Sitemap = ["rankings", "courses", "recommendations"].map(
    (path) => ({
      url: `${base}/${path}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }),
  );

  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    ...categoryRoutes,
    ...exploreRoutes,
  ];
}
