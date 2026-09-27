"use client";

import * as React from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";

/*
  Route-level error boundary (client). Root layout ke andar render hota hai.

  SECURITY:
   - User ko sirf ek safe generic message dikhta hai. error.message, stack,
     SQL ya file path kabhi screen par nahi aata.
   - `digest` Next.js ka apna opaque hash hai (message se derive nahi hota),
     is liye isko dikhana mehfooz hai aur support ke liye kaam ka hai.
   - console.error sirf development me. Production build me debug logging nahi
     chhodte - browser console se bhi detail leak ho sakti hai.
   - Asli error server logs / monitoring (Phase 7) me jayega.
*/
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    // TODO (Phase 7): yahan error monitoring (e.g. Sentry) ko report karo.
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-surface px-6 py-16 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-coral-600">
          Something went wrong
        </p>
        <h1 className="mt-2 text-display-sm font-semibold text-foreground">
          This page didn&rsquo;t load
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          An unexpected error stopped the page from loading. You can try again, or head back to the
          home page.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>

      {error.digest ? (
        <p className="text-xs text-ink-500">
          Reference code: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
    </div>
  );
}
