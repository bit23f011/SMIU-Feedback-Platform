"use client";

import * as React from "react";

import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/*
  AuraLoader - brand ka apna loader. Typing jaisa mehsoos hota hai:

     A → Au → Aur → Aura → Aura- → Aura+ → Aura- → Aura+ → (dobara A se)

  Do hisse hain: pehle naam "type" hota hai, phir sign minus/plus ke darmiyan
  do baar jhulta hai - wohi ishaara jo logo me hai.

  Accessibility:
   - role="status" + aria-live="polite" + sr-only "Loading…" (screen reader ko
     ek hi baar matlab wali baat milti hai)
   - animated text aria-hidden hai, warna har frame par harf bolay jate
   - prefers-reduced-motion: koi typing, koi blink - sirf static "Aura+"

  Layout stability: sign ke liye hamesha ek fixed-width jagah reserve hai, is
  liye text aage-peeche nahi hilta.
*/

interface Frame {
  text: string;
  sign: "" | "-" | "+";
  /** Is frame ko kitni der dikhana hai (ms). */
  hold: number;
}

const FRAMES: readonly Frame[] = [
  { text: "A", sign: "", hold: 190 },
  { text: "Au", sign: "", hold: 190 },
  { text: "Aur", sign: "", hold: 190 },
  { text: "Aura", sign: "", hold: 320 },
  { text: "Aura", sign: "-", hold: 420 },
  { text: "Aura", sign: "+", hold: 420 },
  { text: "Aura", sign: "-", hold: 420 },
  // Aakhri frame thoda lamba - phir cycle dobara "A" se shuru hota hai.
  { text: "Aura", sign: "+", hold: 900 },
] as const;

type LoaderSize = "sm" | "md" | "lg";

const TEXT_SIZE: Record<LoaderSize, string> = {
  sm: "text-xl",
  md: "text-3xl",
  lg: "text-5xl",
};

export interface AuraLoaderProps {
  className?: string;
  size?: LoaderSize;
  label?: string;
}

export function AuraLoader({ className, size = "md", label = "Loading" }: AuraLoaderProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (reduce) return;

    const frame = FRAMES[index]!;
    const timer = setTimeout(() => {
      setIndex((previous) => (previous + 1) % FRAMES.length);
    }, frame.hold);

    return () => clearTimeout(timer);
  }, [index, reduce]);

  // Reduced motion par seedha aakhri (settled) frame.
  const frame = reduce ? FRAMES[FRAMES.length - 1]! : FRAMES[index]!;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center justify-center", className)}
    >
      <span className="sr-only">{label}…</span>

      <span
        aria-hidden="true"
        className={cn(
          "inline-flex items-baseline font-display font-semibold tracking-tight",
          TEXT_SIZE[size],
        )}
      >
        <span className="text-ink-900">{frame.text}</span>

        {/* Sign ki jagah hamesha reserved hai taake width na badle. */}
        <span className="inline-block w-[0.62em] text-center text-coral-600">{frame.sign}</span>

        {reduce ? null : (
          <span
            aria-hidden="true"
            className="ml-[0.06em] inline-block h-[0.78em] w-[0.08em] animate-caret-blink self-center rounded-full bg-ink-400"
          />
        )}
      </span>
    </div>
  );
}
