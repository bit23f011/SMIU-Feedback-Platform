"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/*
  Tooltip - hath se likha gaya hai (is project me Radix tooltip package available
  nahi hai). Accessibility rules jo follow kiye gaye hain:
    - trigger par aria-describedby lagta hai, isliye screen reader text sunata hai
    - hover ke sath focus par bhi khulta hai (keyboard users ke liye zaroori)
    - Escape dabane par band ho jata hai
  Tooltip sirf short hint ke liye hai - zaroori information kabhi tooltip me mat rakho.
*/

type TooltipSide = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  content: React.ReactNode;
  side?: TooltipSide;
  /** Sirf ek interactive child do (button/link). */
  children: React.ReactElement;
  className?: string;
  /** Hover ke baad kitni der me khule (ms). */
  delay?: number;
}

const sideClasses: Record<TooltipSide, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 pb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 pt-2",
  left: "right-full top-1/2 -translate-y-1/2 pr-2",
  right: "left-full top-1/2 -translate-y-1/2 pl-2",
};

const motionClasses: Record<TooltipSide, string> = {
  top: "translate-y-1",
  bottom: "-translate-y-1",
  left: "translate-x-1",
  right: "-translate-x-1",
};

export function Tooltip({ content, side = "top", children, className, delay = 120 }: TooltipProps) {
  const id = React.useId();
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  React.useEffect(() => clear, [clear]);

  const show = React.useCallback(
    (immediate = false) => {
      clear();
      if (immediate || delay <= 0) {
        setOpen(true);
        return;
      }
      timer.current = setTimeout(() => setOpen(true), delay);
    },
    [clear, delay],
  );

  const hide = React.useCallback(() => {
    clear();
    setOpen(false);
  }, [clear]);

  const trigger = React.cloneElement(
    React.Children.only(children) as React.ReactElement<{ "aria-describedby"?: string }>,
    { "aria-describedby": id },
  );

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => show()}
      onMouseLeave={hide}
      onFocusCapture={() => show(true)}
      onBlurCapture={hide}
      onKeyDown={(event) => {
        if (event.key === "Escape") hide();
      }}
    >
      {trigger}
      <span
        role="tooltip"
        id={id}
        className={cn("pointer-events-none absolute z-50 hidden sm:block", sideClasses[side])}
      >
        <span
          className={cn(
            "block whitespace-nowrap rounded-md border border-ink-800 bg-ink-900 px-2 py-1 text-xs font-medium text-white shadow-pop",
            "transition-[opacity,transform] duration-150 ease-out",
            open ? "translate-x-0 translate-y-0 opacity-100" : cn("opacity-0", motionClasses[side]),
            className,
          )}
        >
          {content}
        </span>
      </span>
    </span>
  );
}
