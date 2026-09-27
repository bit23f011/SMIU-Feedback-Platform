import type { MetadataRoute } from "next";

import { SITE } from "@/lib/constants";

// Web app manifest (PWA basics). Icons official mark se aate hain (icon.svg
// vector, apple-icon raster). Next.js is file ko automatic <link rel="manifest">
// me jodta hai.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name}: ${SITE.tagline}`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1f2a52",
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  };
}
