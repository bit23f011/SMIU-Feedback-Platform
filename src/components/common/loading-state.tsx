import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/*
  Loading states. Do tarah ke hain:
    1) Spinner  -> chhote inline actions ke liye (button ke andar, small panel)
    2) Skeleton -> list/card layout ke liye, taake layout jump na kare
  Skeleton hamesha us shape ka hona chahiye jo baad me aayegi, warna page hilta hai.
*/

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-ink-200 border-t-primary",
        className,
      )}
    />
  );
}

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = "Loading…", className }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center justify-center gap-2.5 px-6 py-12", className)}
    >
      <Spinner />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

/** Person/teacher card ki shape ka skeleton. */
export function PersonCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-5", className)}>
      <div className="flex items-start gap-3">
        <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-5 w-24 rounded-md" />
      </div>
    </div>
  );
}

/** Grid of person cards ka skeleton. */
export function PersonGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}
    >
      <span className="sr-only">Loading results…</span>
      {Array.from({ length: count }).map((_, index) => (
        <PersonCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** Simple text rows ka skeleton (list/table placeholder). */
export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("space-y-3", className)}>
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-lg border border-border p-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
