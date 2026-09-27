import type { MetadataRoute } from "next";

import { publicEnv } from "@/lib/env";

// robots.txt route. Public site index/follow allowed, magar private/app areas
// (admin, student, api) crawl se bahar. Ye SEO hint hai - asli access control
// hamesha server/RLS par hota hai, robots par nahi.
export default function robots(): MetadataRoute.Robots {
  const base = publicEnv.siteUrl.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/student", "/auth", "/api"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
