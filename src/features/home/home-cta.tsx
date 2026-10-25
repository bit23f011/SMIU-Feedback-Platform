import Link from "next/link";
import { Button } from "@/components/ui/button";
export function HomeCta() {
  return (
    <section
      className="container py-12 md:py-16"
      aria-labelledby="student-cta-heading"
    >
      <div className="contribute-panel flex flex-col justify-between gap-6 rounded-lg px-6 py-8 sm:px-10 md:flex-row md:items-center md:py-10">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
            From one batch to the next
          </p>
          <h2
            id="student-cta-heading"
            className="editorial-title mt-3 text-[1.8rem] leading-tight text-white md:text-[2.2rem]"
          >
            Someone starts where you left off.
          </h2>
          <p className="mt-3 max-w-[430px] text-[13px] leading-6 text-white/75">
            A fresher, a senior or a graduate. Your experience can make their
            next step a little clearer.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Button
            asChild
            className="border border-white/80 bg-white text-[#70232e] hover:bg-white/90"
          >
            <Link href="/auth/signup">Share your experience</Link>
          </Button>
          <Button asChild className="soft-green-action">
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
