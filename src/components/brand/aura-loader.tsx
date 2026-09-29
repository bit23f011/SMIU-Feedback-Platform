"use client";

import * as React from "react";

import { ProfAuraMark } from "@/components/brand/profaura-mark";
import { useSmiuHistory } from "@/components/brand/smiu-history";
import { cn } from "@/lib/utils";

/*
  AuraLoader = SMIU ka apna loader. Generic spinner nahi - imarat ke emblem ke
  saath tareekhi count-up:

      SMI
      1885 · SCHOOL   ...ginti...   2026 · UNIVERSITY (settle)

  Mount hote hi ek dafa 1885 se mojooda saal tak chalta hai, phir current +
  UNIVERSITY par ruk jata hai. Load lamba ho to neeche ek halka progress track
  chalta rehta hai (spinner nahi) - taake "abhi ho raha hai" ka ehsaas rahe.

  Accessibility:
   - role="status" + aria-live="polite" + sr-only "Loading…" (SR ko ek hi baar
     matlab wali baat milti hai, chahe visual kuch bhi kare)
   - animated visual aria-hidden hai, warna har saal bola jata
   - prefers-reduced-motion: koi ginti/pulse nahi - seedha mojooda saal + UNIVERSITY

  export naam (AuraLoader) aur props wahi hain taake loading.tsx ko haath na lagana pare.
*/

type LoaderSize = "sm" | "md" | "lg";

const LOADER_SIZE: Record<
  LoaderSize,
  { mark: string; name: string; meta: string; track: string }
> = {
  sm: { mark: "h-8", name: "text-lg", meta: "text-[0.5rem]", track: "w-12" },
  md: { mark: "h-12", name: "text-2xl", meta: "text-[0.625rem]", track: "w-16" },
  lg: { mark: "h-16", name: "text-4xl", meta: "text-[0.8125rem]", track: "w-20" },
};

export interface AuraLoaderProps {
  className?: string;
  size?: LoaderSize;
  label?: string;
}

export function AuraLoader({ className, size = "md", label = "Loading" }: AuraLoaderProps) {
  const { year, label: stage, play, reduce } = useSmiuHistory();
  const sizes = LOADER_SIZE[size];

  // Mount par ek dafa poora safar chala do (reduced-motion par kuch nahi hota).
  React.useEffect(() => {
    if (!reduce) play(2600);
  }, [reduce, play]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("inline-flex flex-col items-center justify-center gap-3", className)}
    >
      <span className="sr-only">{label}…</span>

      <ProfAuraMark animate={!reduce} className={cn(sizes.mark, "w-auto")} />

      <div aria-hidden="true" className="flex flex-col items-center leading-none">
        <span
          className={cn(
            "font-display font-bold leading-none tracking-tight text-[#8a1f2b] dark:text-[#e7b3b9]",
            sizes.name,
          )}
        >
          SMI
        </span>
        <span className={cn("mt-[0.35em] flex items-baseline gap-[0.45em] font-medium", sizes.meta)}>
          <span className="tabular-nums text-muted-foreground">{year}</span>
          {/* Sabse lambe label jitni jagah reserve - centre par jhilmilahat na ho. */}
          <span className="inline-block min-w-[7.4em] text-left">
            <span className="whitespace-nowrap border-b border-[#1f7a46]/40 pb-[0.05em] font-semibold uppercase tracking-[0.12em] text-[#1f7a46] dark:border-[#5fce90]/40 dark:text-[#5fce90]">
              {stage}
            </span>
          </span>
        </span>
      </div>

      {reduce ? null : (
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 block h-[3px] overflow-hidden rounded-full bg-[#8a1f2b]/10 dark:bg-[#e7b3b9]/15",
            sizes.track,
          )}
        >
          <span className="block h-full w-1/2 animate-pulse rounded-full bg-[#8a1f2b]/60 dark:bg-[#e7b3b9]/60" />
        </span>
      )}
    </div>
  );
}
