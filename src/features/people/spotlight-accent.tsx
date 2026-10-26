import * as React from "react";
import { Trophy } from "@/components/ui/icons";

export function SpotlightCelebration() {
  return (
    <div
      aria-hidden="true"
      className="spotlight-confetti pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={index}
          style={{
            left: `${5 + ((index * 19) % 90)}%`,
            animationDelay: `${-index * 0.57}s`,
            animationDuration: `${5 + (index % 3)}s`,
            backgroundColor: ["#d6a442", "#6366f1", "#ef907c"][index % 3],
          }}
        />
      ))}
    </div>
  );
}

export function SpotlightBadge({ demo = false }: { demo?: boolean }) {
  return (
    <span className="relative inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
      <Trophy aria-hidden="true" className="size-3.5" />
      {demo ? "#1 Ranked" : "Featured spotlight"}
    </span>
  );
}
