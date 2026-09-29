"use client";

import * as React from "react";

import { useReducedMotion } from "framer-motion";

/*
  SMIU ka tareekhi safar - founding se aaj tak. Yeh logic yahan EK jagah rakhi hai
  taake logo (hover par) aur loader (chalte waqt) dono bilkul ek jaisa sequence
  dikhaayen. Isi liye yeh chhota module banaya - do jagah copy-paste se behtar.

    1885 -> 1943 : SCHOOL      (Sindh Madressatul Islam - madrasa/school)
    1943 -> 2012 : COLLEGE     (SMI College)
    2012 -> aaj  : UNIVERSITY  (SMI University)

  AHEM QAAYDA: mojooda saal kabhi hardcode NAHI hota. Hamesha
  new Date().getFullYear() se aata hai, warna har naye saal me galat dikhega.
*/

export const SMIU_FOUNDING_YEAR = 1885;
export const SMIU_FINAL_LABEL = "UNIVERSITY";

/*
  Har break "is saal se pehle" wala label deta hai. 1943 par pahunchte hi COLLEGE,
  2012 par pahunchte hi UNIVERSITY - bilkul spec ke mutabiq.
*/
const STAGE_BREAKS = [
  { until: 1943, label: "SCHOOL" },
  { until: 2012, label: "COLLEGE" },
] as const;

export function smiuCurrentYear(): number {
  return new Date().getFullYear();
}

export function smiuStageLabel(year: number): string {
  for (const stage of STAGE_BREAKS) {
    if (year < stage.until) return stage.label;
  }
  return SMIU_FINAL_LABEL;
}

export interface SmiuHistory {
  /** Abhi jo saal dikhana hai (calm/rest = current year). */
  year: number;
  /** Us saal ka stage label (SCHOOL / COLLEGE / UNIVERSITY). */
  label: string;
  /** prefers-reduced-motion on hai ya nahi. */
  reduce: boolean;
  /** Mojooda saal (settled/rest state). */
  finalYear: number;
  /** 1885 se current year tak count karao (ek dafa), phir current par ruk jao. */
  play: (durationMs?: number) => void;
  /** Foran calm/rest state par wapas (current year + UNIVERSITY). */
  reset: () => void;
}

/*
  Count-up engine. requestAnimationFrame par chalta hai taake range chhoti ho ya
  bari, ginti smooth rahe aur har device par theek chale. Rest state hamesha
  current year + UNIVERSITY hai - yehi reduced-motion ka bhi final state hai.
*/
export function useSmiuHistory(): SmiuHistory {
  // useReducedMotion boolean | null deta hai (null = abhi maloom nahi / SSR).
  // Humein pakka boolean chahiye - null ko false (motion allowed) mano.
  const reduce = useReducedMotion() ?? false;
  // Ek hi baar compute - render ke beech saal na badle.
  const finalYear = React.useMemo(() => smiuCurrentYear(), []);
  const [year, setYear] = React.useState(finalYear);
  const rafRef = React.useRef<number | null>(null);

  const stop = React.useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const play = React.useCallback(
    (durationMs = 2200) => {
      // Reduced motion: koi ginti nahi - seedha final state.
      if (reduce) {
        setYear(finalYear);
        return;
      }
      stop();

      const from = SMIU_FOUNDING_YEAR;
      const span = finalYear - from;
      if (span <= 0) {
        setYear(finalYear);
        return;
      }

      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        // easeInOutQuad - shuru aur aakhir narm, beech me tez.
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        setYear(Math.round(from + span * eased));

        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          // Aakhir me theek current year par settle - koi restart nahi.
          rafRef.current = null;
          setYear(finalYear);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [reduce, finalYear, stop],
  );

  const reset = React.useCallback(() => {
    stop();
    setYear(finalYear);
  }, [stop, finalYear]);

  // Unmount par frame band karo - warna setState-after-unmount.
  React.useEffect(() => stop, [stop]);

  return { year, label: smiuStageLabel(year), reduce, finalYear, play, reset };
}
