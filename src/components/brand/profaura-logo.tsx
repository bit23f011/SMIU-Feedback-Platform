"use client";

import * as React from "react";

import Link from "next/link";

import { ProfAuraMark } from "@/components/brand/profaura-mark";
import { SMIU_FINAL_LABEL, useSmiuHistory } from "@/components/brand/smiu-history";
import { cn } from "@/lib/utils";

/*
  ProfAuraLogo = SMIU emblem + do-satri wordmark:

      SMI
      1885 · SCHOOL       (hover ke doraan ginti)
      2026 · UNIVERSITY   (calm / rest state)

  Shakl asli SMIU logo jaisi hai (bara "SMI", neeche "UNIVERSITY"), magar is me ek
  tareekhi count-up shaamil hai:
    - Calm: mojooda saal + UNIVERSITY (sthir, professional).
    - Hover (desktop) / focus (keyboard): 1885 se mojooda saal tak ginti, saath hi
      label SCHOOL -> COLLEGE -> UNIVERSITY. Ek dafa chal kar current par ruk jata
      hai (baar baar restart nahi). Pointer/focus hatte hi calm par wapas.
    - Touch (jahan hover nahi): interactive instance mount par ek dafa khud chalta.
    - prefers-reduced-motion: seedha mojooda saal + UNIVERSITY - koi ginti/hover nahi.

  export naam aur props JAAN BOOJH KAR wahi rakhe hain (ProfAuraLogo / size / href /
  withSign / animateMark) taake koi bhi istemaal karne wali file badalni na pare.
*/

const SIZE_MAP = {
  sm: { mark: "h-6", name: "text-[0.875rem]", meta: "text-[0.5rem]" },
  md: { mark: "h-7", name: "text-[1.0625rem]", meta: "text-[0.5625rem]" },
  lg: { mark: "h-10", name: "text-[1.5rem]", meta: "text-[0.6875rem]" },
} as const;

export interface ProfAuraLogoProps {
  className?: string;
  size?: keyof typeof SIZE_MAP;
  /** null do to plain element banega (jab parent khud link ho). */
  href?: string | null;
  /** Tareekhi saal + stage wali doosri satar dikhaye. */
  withSign?: boolean;
  /** Interactive instance? true = entry + hover replay + touch autoplay. */
  animateMark?: boolean;
}

export function ProfAuraLogo({
  className,
  size = "md",
  href = "/",
  withSign = true,
  animateMark = true,
}: ProfAuraLogoProps) {
  const sizes = SIZE_MAP[size];
  const { year, label, play, reset, reduce, finalYear } = useSmiuHistory();

  // Touch devices par hover nahi hota. Interactive instance ko ek dafa chala do.
  const [isTouch, setIsTouch] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    setIsTouch(window.matchMedia("(hover: none)").matches);
  }, []);
  React.useEffect(() => {
    if (animateMark && isTouch && !reduce) play(2600);
  }, [animateMark, isTouch, reduce, play]);

  // Interactive = live ginti; warna hamesha settled (current year + UNIVERSITY).
  const showYear = animateMark ? year : finalYear;
  const showLabel = animateMark ? label : SMIU_FINAL_LABEL;

  // Hover/focus replay sirf desktop (hover) par aur jab motion allowed ho.
  const interactive = animateMark && !isTouch && !reduce;
  const hoverHandlers = interactive
    ? {
        onMouseEnter: () => play(2200),
        onMouseLeave: reset,
        onFocus: () => play(2200),
        onBlur: reset,
      }
    : {};

  const content = (
    <>
      <ProfAuraMark animate={animateMark} className={cn(sizes.mark, "w-auto")} />

      {/* href null par plain span banta hai - us soorat me SR ke liye naam chahiye. */}
      {href === null ? <span className="sr-only">SMIU Feedback Platform</span> : null}

      {/* Poora text block decorative hai (animate hota hai). Accessible naam link ke
          aria-label se ya upar wale sr-only se aata hai. */}
      <span aria-hidden="true" className="flex flex-col justify-center leading-none">
        <span
          className={cn(
            "font-display font-bold leading-none tracking-tight text-[#8a1f2b] dark:text-[#e7b3b9]",
            sizes.name,
          )}
        >
          SMI
        </span>

        {withSign ? (
          <span className={cn("mt-[0.3em] flex items-baseline gap-[0.4em] font-medium", sizes.meta)}>
            <span className="tabular-nums text-muted-foreground">{showYear}</span>
            {/* Sabse lambe label (UNIVERSITY) jitni jagah reserve - warna hover par
                text aage-peeche hilta. */}
            <span className="inline-block min-w-[7.2em] text-left">
              <span className="whitespace-nowrap border-b border-[#1f7a46]/40 pb-[0.05em] font-semibold uppercase tracking-[0.1em] text-[#1f7a46] dark:border-[#5fce90]/40 dark:text-[#5fce90]">
                {showLabel}
              </span>
            </span>
          </span>
        ) : null}
      </span>
    </>
  );

  const shell = "group/logo inline-flex items-center gap-2";

  if (href === null) {
    return (
      <span className={cn(shell, className)} {...hoverHandlers}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label="SMIU Feedback Platform home"
      className={cn(
        shell,
        "rounded-md outline-none transition-opacity duration-150 ease-out hover:opacity-90",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      {...hoverHandlers}
    >
      {content}
    </Link>
  );
}
