"use client";

import * as React from "react";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/*
  ProfAuraMark = SMIU ka emblem (wordmark ke baghair): Sindh Madressatul Islam ki
  tareekhi imarat - beech me clock-tower jis par gumbad aur finial, dono taraf
  kone ke chhote burj (turrets), aur neeche mehraabon (arches) ki qatar.

  Geometry hath se banayi gayi hai project owner ke diye SMIU logo se milta-julta.
  Choti size (navbar) par bhi imarat ki pehchan rahe, is liye ek "mask" use kiya:
    - safed shapes = imarat (dikhti hai)
    - kaali shapes = mehraabein/khidkiyan (kaat di jati hain -> asli transparency)
  Poori imarat currentColor se bharti hai, is liye dark theme me sirf text color
  badalne se maroon halka ho jata hai (koi alag SVG nahi chahiye).

  ANIMATION KA USOOL: emblem hamesha shaant rehta hai. Sirf halka entry (fade +
  1-2px upar) aur hover par 1px ki lift - koi spin, koi loop. Asli tareekhi
  count-up wordmark (ProfAuraLogo) me hoti hai, emblem us daoraan bhi sthir rehta.

  prefers-reduced-motion par koi entry nahi - emblem seedha apni poori halat me.
*/

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export interface ProfAuraMarkProps {
  className?: string;
  /** Entry animation. Navbar/hero par true, chhoti/repeating jagahon par false. */
  animate?: boolean;
}

export function ProfAuraMark({ className, animate = true }: ProfAuraMarkProps) {
  const reduce = useReducedMotion();
  // useId me colon aata hai; SVG/mask id ke liye saaf karna zaroori hai.
  const maskId = `smiu-mark-${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const play = animate && !reduce;

  return (
    <motion.svg
      viewBox="0 0 64 50"
      role="img"
      aria-hidden="true"
      focusable="false"
      initial={play ? { opacity: 0, y: 2 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className={cn(
        "h-7 w-auto shrink-0 text-[#8a1f2b] dark:text-[#e2a7ae]",
        "transition-transform duration-300 ease-out motion-safe:group-hover/logo:-translate-y-px",
        className,
      )}
    >
      <defs>
        <mask id={maskId}>
          {/* Sab kuch pehle se hidden (siyah). Safed = imarat dikhao. */}

          {/* Base / plinth */}
          <rect x="5" y="43" width="54" height="4" fill="white" />

          {/* Do manzila facade (dono baazu) */}
          <rect x="10" y="27" width="44" height="16" fill="white" />

          {/* Baayan kone ka burj + gumbad + finial */}
          <rect x="10" y="21" width="6" height="22" fill="white" />
          <path d="M9.2 21.5 Q13 16.5 16.8 21.5 Z" fill="white" />
          <rect x="12.4" y="16" width="1.2" height="4" fill="white" />

          {/* Daayan kone ka burj + gumbad + finial */}
          <rect x="48" y="21" width="6" height="22" fill="white" />
          <path d="M47.2 21.5 Q51 16.5 54.8 21.5 Z" fill="white" />
          <rect x="50.4" y="16" width="1.2" height="4" fill="white" />

          {/* Markazi clock-tower */}
          <rect x="27" y="13" width="10" height="30" fill="white" />
          {/* Tower ka gable/chhat */}
          <path d="M25 13 L32 7 L39 13 Z" fill="white" />
          {/* Tower ka gumbad (cupola) */}
          <path d="M28.6 7 Q32 1.5 35.4 7 Z" fill="white" />
          {/* Finial (upar spire + gola) */}
          <rect x="31.4" y="0.5" width="1.2" height="6" fill="white" />
          <circle cx="32" cy="0.9" r="1" fill="white" />

          {/* MEHRAABEIN / KHIDKIYAN (siyah = kaat do) */}
          {/* Markazi darwaza (bara arch) */}
          <path d="M29 43 V33 A3 3 0 0 1 35 33 V43 Z" fill="black" />
          {/* Tower ki oopar wali khidki */}
          <path d="M30.4 25 V21 A1.6 1.6 0 0 1 33.6 21 V25 Z" fill="black" />
          {/* Baayen baazu ki do mehraabein */}
          <path d="M17 42 V38 A2.2 2.2 0 0 1 21.4 38 V42 Z" fill="black" />
          <path d="M22.4 42 V38 A2.2 2.2 0 0 1 26.8 38 V42 Z" fill="black" />
          {/* Daayen baazu ki do mehraabein */}
          <path d="M37.2 42 V38 A2.2 2.2 0 0 1 41.6 38 V42 Z" fill="black" />
          <path d="M42.6 42 V38 A2.2 2.2 0 0 1 47 38 V42 Z" fill="black" />
        </mask>
      </defs>

      <rect width="64" height="50" fill="currentColor" mask={`url(#${maskId})`} />
    </motion.svg>
  );
}
