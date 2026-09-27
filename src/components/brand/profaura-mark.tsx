"use client";

import * as React from "react";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/*
  ProfAuraMark = official ProfAura logo ka mark (wordmark ke baghair).

  Geometry project owner ke asli logo se li gayi hai, hath se SVG me banayi gayi:
    1) location/speech pin  -> deep navy, neeche baayein taraf tail
    2) graduation cap       -> pin ke andar, tassel ke sath
    3) student silhouette   -> cap ke neeche sar + kandhe
    4) orbit swoosh         -> coral se orange, pin ke peeche se guzarti hai
    5) 4-point sparkle      -> pin ke upar daayein kone par

  ANIMATION KA USOOL: sirf usi geometry ko harkat di hai jo logo me pehle se
  mojood hai. Orbit ek dafa khud ko draw karti hai, sparkle uske baad halka sa
  aata hai, aur cap 1.5px upar uthta hai. Koi bouncing, koi random scaling, koi
  loop chalne wala spinner. Hover par orbit sirf 5 degree ghoomti hai.

  prefers-reduced-motion par sab kuch seedha apni FINAL halat me render hota
  hai - koi entry animation nahi, magar logo poora dikhta hai.

  Colours CSS variables se aate hain (--logo-pin / --logo-glyph) taake dark
  theme me pin light ho jaye aur glyph dark - warna navy par navy chhup jata.
*/

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export interface ProfAuraMarkProps {
  className?: string;
  /** Entry animation. Navbar/hero par true, chhoti jagahon par false rakho. */
  animate?: boolean;
}

export function ProfAuraMark({ className, animate = true }: ProfAuraMarkProps) {
  const reduce = useReducedMotion();
  // useId me colon aata hai, SVG id ke liye usay saaf karna zaroori hai.
  const gradientId = `profaura-orbit-${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const play = animate && !reduce;

  return (
    <svg
      viewBox="0 0 64 60"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={cn("h-7 w-auto shrink-0", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#f4675e" />
          <stop offset="100%" stopColor="#f59f4a" />
        </linearGradient>
      </defs>

      {/* 4) Orbit swoosh - pin ke peeche, is liye sabse pehle draw hoti hai. */}
      <motion.ellipse
        cx="32"
        cy="30"
        rx="29.4"
        ry="13.2"
        transform="rotate(-22 32 30)"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="3.4"
        strokeLinecap="round"
        initial={play ? { pathLength: 0, opacity: 0 } : false}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ pathLength: { duration: 1.1, ease: EASE_OUT }, opacity: { duration: 0.3 } }}
        className="origin-center transition-transform duration-500 ease-out motion-safe:group-hover/logo:rotate-[5deg]"
      />

      {/* 1) Pin body */}
      <path
        d="M25 10h16a9 9 0 0 1 9 9v16a9 9 0 0 1-9 9H27l-10 7.6 2.6-7.6a9 9 0 0 1-3.6-9V19a9 9 0 0 1 9-9Z"
        className="fill-logo-pin"
      />

      {/* 2) + 3) Cap, tassel aur student silhouette */}
      <motion.g
        className="fill-logo-glyph"
        initial={play ? { opacity: 0, y: 1.5 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.16, ease: EASE_OUT }}
      >
        <path d="M32 15.4 43 20l-11 4.6L21 20l11-4.6Z" />
        <path d="M41.1 20.9c.5 0 .9.4.9.9v4.9a.9.9 0 0 1-1.8 0v-4.9c0-.5.4-.9.9-.9Z" />
        <circle cx="41.1" cy="28.1" r="1.5" />
        <circle cx="32" cy="29.6" r="4.1" />
        <path d="M32 34.4c4.4 0 7.9 2.6 7.9 7.2v2.4H24.1v-2.4c0-4.6 3.5-7.2 7.9-7.2Z" />
      </motion.g>

      {/* 5) Sparkle */}
      <motion.path
        d="M56 6.5 57.7 11.3 62.5 13 57.7 14.7 56 19.5 54.3 14.7 49.5 13 54.3 11.3Z"
        fill="#f4675e"
        initial={play ? { opacity: 0, scale: 0.6 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.5, ease: EASE_OUT }}
        style={{ transformOrigin: "56px 13px" }}
      />
    </svg>
  );
}
