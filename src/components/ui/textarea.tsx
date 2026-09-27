import * as React from "react";

import { cn } from "@/lib/utils";

// Multi-line text field. Input jaisa hi visual language (border + focus ring).
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs",
          "transition-[border-color,box-shadow] duration-150 ease-out",
          "placeholder:text-ink-400",
          "hover:border-ink-400",
          "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
          "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/30",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
