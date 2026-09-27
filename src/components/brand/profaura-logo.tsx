"use client";

import * as React from "react";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { ProfAuraMark } from "@/components/brand/profaura-mark";
import { cn } from "@/lib/utils";

/*
  ProfAuraLogo = official mark + wordmark "ProfAura" + ek chhota sign glyph.

  Wordmark asli logo jaisa hai: "Prof" neutral ink me, "Aura" coral me.

  Sign glyph brand identity ka hissa hai: minus se plus aur wapas. Yeh ishaara
  hai ke rating ki poori range use ki ja sakti hai (sirf tareef nahi). Yeh ek
  hi jagah hai jahan logo me harkat hoti hai, is liye woh subtle rehti hai.

  prefers-reduced-motion par sign static plus rehta hai.
*/

const SIZE_MAP = {
  sm: { mark: "h-6", word: "text-[0.9375rem]", sign: "text-[0.9375rem]" },
  md: { mark: "h-7", word: "text-[1.0625rem]", sign: "text-[1.0625rem]" },
  lg: { mark: "h-10", word: "text-[1.5rem]", sign: "text-[1.5rem]" },
} as const;

/** Minus se plus banne wala sign. Vertical bar hi scale hoti hai. */
function AnimatedSign({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <svg
      viewBox="0 0 12 12"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={cn("inline-block size-[0.62em] shrink-0", className)}
    >
      {/* Horizontal bar - hamesha mojood (minus) */}
      <rect x="1.4" y="5.4" width="9.2" height="1.2" rx="0.6" fill="currentColor" />
      {/* Vertical bar - scaleY se minus "plus" ban jata hai */}
      <motion.rect
        x="5.4"
        y="1.4"
        width="1.2"
        height="9.2"
        rx="0.6"
        fill="currentColor"
        style={{ originX: 6, originY: 6 }}
        initial={false}
        animate={reduce ? { scaleY: 1 } : { scaleY: [0, 0, 1, 1, 0] }}
        transition={
          reduce
            ? { duration: 0 }
            : {
                duration: 4.2,
                times: [0, 0.24, 0.4, 0.76, 0.92],
                ease: [0.22, 1, 0.36, 1],
                repeat: Infinity,
                repeatDelay: 0.6,
              }
        }
      />
    </svg>
  );
}

export interface ProfAuraLogoProps {
  className?: string;
  size?: keyof typeof SIZE_MAP;
  /** null do to plain element banega (jab parent khud link ho). */
  href?: string | null;
  withSign?: boolean;
  /** Mark ka entry animation. Repeating chrome me isay band kiya ja sakta hai. */
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

  const content = (
    <>
      <ProfAuraMark animate={animateMark} className={cn(sizes.mark, "w-auto")} />
      <span
        className={cn(
          "font-display font-bold leading-none tracking-tight text-foreground",
          sizes.word,
        )}
      >
        Prof<span className="text-coral-600 dark:text-coral-400">Aura</span>
      </span>
      {withSign ? (
        <AnimatedSign className={cn("text-coral-600 dark:text-coral-400", sizes.sign)} />
      ) : null}
    </>
  );

  const shell = "group/logo inline-flex items-center gap-2";

  if (href === null) {
    return <span className={cn(shell, className)}>{content}</span>;
  }

  return (
    <Link
      href={href}
      aria-label="ProfAura home"
      className={cn(
        shell,
        "rounded-md outline-none transition-opacity duration-150 ease-out hover:opacity-90",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {content}
    </Link>
  );
}
