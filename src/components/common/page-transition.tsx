"use client";

import * as React from "react";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

/*
  PageTransition - route badalne par bohot halka fade + 4px rise.
  Rule: transition itni chhoti honi chahiye ke user ko "smooth" lage, "intezaar" na lage.
  prefers-reduced-motion on ho to bilkul koi motion nahi (sirf render).
*/
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
