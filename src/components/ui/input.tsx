import * as React from "react";

import { cn } from "@/lib/utils";

/*
  Input - patli border, halki shadow, focus par border + ring dono badalte hain.
  Focus transition chhoti (150ms) hai taake snappy lage.
*/
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs",
          "transition-[border-color,box-shadow] duration-150 ease-out",
          "placeholder:text-ink-400",
          "hover:border-ink-400",
          "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/30",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
