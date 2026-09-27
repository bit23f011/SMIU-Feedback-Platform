"use client";

import * as React from "react";

import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

/*
  Form label. Radix Label ke upar bana hai taake click karne par input focus ho.
  Disabled peer input ke sath label bhi faded ho jata hai.
*/
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none text-ink-800",
      "peer-disabled:cursor-not-allowed peer-disabled:text-ink-400",
      className,
    )}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
