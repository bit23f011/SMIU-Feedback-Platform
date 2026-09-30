import Link from "next/link";

import { ProfAuraLogo } from "@/components/brand/profaura-logo";
import { Button } from "@/components/ui/button";

/*
  404 - root layout ke andar render hota hai (is liye apna header/footer nahi).
  Copy vague nahi rakhi: batati hai kya hua aur aage ka ek saaf raasta deti hai.
  Error/empty screen ka kaam direction dena hai, maatam karna nahi.
*/
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-surface px-6 py-16 text-center">
      <ProfAuraLogo size="lg" href="/" />

      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-coral-600">Error 404</p>
        <h1 className="mt-2 text-display-sm font-semibold text-foreground">
          We couldn&rsquo;t find that page
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          The link may be broken, or the page may have moved. Everything on SMIU Feedback Website starts from the
          home page.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/teachers">Browse teachers</Link>
        </Button>
      </div>
    </div>
  );
}
