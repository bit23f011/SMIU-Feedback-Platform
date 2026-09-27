import * as React from "react";

import { cn } from "@/lib/utils";

/*
  PageHeader - har inner page ka top block. Eyebrow (chhota label) + title +
  ek line ka description + optional actions. Isko consistent rakhna zaroori hai,
  warna har page apni alag rhythm bana leta hai.
*/
export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  children,
}: PageHeaderProps) {
  return (
    <header className={cn("border-b border-border pb-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-display-sm font-semibold text-foreground">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </header>
  );
}
