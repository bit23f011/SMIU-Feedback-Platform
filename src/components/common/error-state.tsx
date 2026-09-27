"use client";

import * as React from "react";

import { AlertTriangle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*
  ErrorState - user ko sirf safe, samajh aane wala message dikhata hai.
  SECURITY: yahan kabhi stack trace, SQL, file path ya database detail mat dikhao.
  Technical detail sirf server logs me jati hai, browser me nahi.
*/
export interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Retry button tab aata hai jab yeh diya ho. */
  onRetry?: () => void;
  retryLabel?: string;
  action?: React.ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We could not load this section right now. Please try again in a moment.",
  onRetry,
  retryLabel = "Try again",
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-state-danger/20 bg-state-danger-soft px-6 py-12 text-center",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-state-danger/20 bg-white text-state-danger"
      >
        <AlertTriangle className="size-5" />
      </div>
      <p className="font-display text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-600">{description}</p>
      {onRetry || action ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCw aria-hidden="true" />
              {retryLabel}
            </Button>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}
