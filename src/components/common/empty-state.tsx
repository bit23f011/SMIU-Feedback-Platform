import * as React from "react";

import { cn } from "@/lib/utils";

/*
  EmptyState - do kaam karta hai:
    tone="empty"      => abhi yahan kuch hai hi nahi (pehli dafa wali screen)
    tone="no-results" => data to hai magar filter/search se kuch nahi mila
  Dono ka visual same rakha hai taake product consistent lage; sirf copy aur
  action alag hota hai. Empty screen ek invitation honi chahiye, dead-end nahi.
*/
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: "empty" | "no-results";
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "empty",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center justify-center rounded-lg border border-dashed border-ink-200 bg-ink-50/60 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div
          aria-hidden="true"
          className={cn(
            "mb-4 flex h-11 w-11 items-center justify-center rounded-full border [&_svg]:size-5",
            tone === "no-results"
              ? "border-ink-200 bg-card text-ink-500"
              : "border-indigo-100 bg-indigo-50 text-primary",
          )}
        >
          {icon}
        </div>
      ) : null}
      <p className="font-display text-base font-semibold text-foreground">
        {title}
      </p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? (
        <div className="mt-5 max-w-full [&_a]:h-auto [&_a]:min-h-8 [&_a]:whitespace-normal [&_a]:py-1.5">
          {action}
        </div>
      ) : null}
    </div>
  );
}
