import Link from "next/link";

import { Button } from "@/components/ui/button";

/*
  Student CTA - page ka aakhri block, ek hi asli action.

  Button ka label wahi bolta hai jo hoga ("Create account"), koi "Get started"
  jaisa mubham lafz nahi. Neeche ki choti line expectation set karti hai ke
  verification ek hi email hai - signup se pehle hi sach bata dena behtar hai.
*/
export function HomeCta() {
  return (
    <section aria-labelledby="student-cta-heading">
      <div className="container py-14 text-center md:py-16">
        <h2
          id="student-cta-heading"
          className="mx-auto max-w-xl text-2xl font-semibold text-foreground md:text-[1.75rem]"
        >
          Help the next batch know what to expect
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Your review takes a few minutes and stays anonymous. The only thing we check is that you
          study at the university.
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/auth/signup">Create account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          One verification email. No spam, ever.
        </p>
      </div>
    </section>
  );
}
