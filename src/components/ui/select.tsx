import * as React from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/*
  Select - native <select> par bana hai (Radix select is project me available nahi,
  aur native control mobile par behtar bhi hai: OS ka apna picker milta hai).
  Visual language Input jaisa hi hai: patli border, halki shadow, focus ring.
*/
const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "flex h-10 w-full appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-9 text-sm text-foreground shadow-xs",
            "transition-[border-color,box-shadow] duration-150 ease-out",
            "hover:border-ink-400",
            "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
            "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500",
            "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/30",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-500"
        />
      </div>
    );
  },
);
Select.displayName = "Select";

export { Select };
