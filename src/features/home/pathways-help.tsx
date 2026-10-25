"use client";

import { useId, useState } from "react";
import { Question } from "@/components/ui/icons";

export function PathwaysHelp() {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      className="relative inline-flex shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label="Help choosing where to begin"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex size-9 items-center justify-center rounded-full text-campus-ink hover:bg-campus-soft"
      >
        <Question className="size-6" aria-hidden="true" />
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="pathways-help absolute right-0 top-full z-30 mt-2 w-64 max-w-[calc(100vw-2.5rem)] rounded-lg border border-campus-border bg-campus-soft p-4 text-left text-xs leading-6 text-campus-ink shadow-pop"
        >
          Choose where to begin: explore teaching and courses, read campus staff
          feedback, or compare student rankings and recommendations for your
          next semester.
        </span>
      ) : null}
    </span>
  );
}
