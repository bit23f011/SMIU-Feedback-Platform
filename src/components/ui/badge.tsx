import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
  Badge / tag - chhota, patli border, bohot halka tinted background.
  Rainbow badges nahi: sirf neutral + teen brand accents ke tints.
*/
const badgeVariants = cva(
  [
    "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5",
    "text-xs font-medium leading-5",
    "transition-colors duration-150 ease-out",
    "[&_svg]:size-3 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        // Default = quiet neutral. 90% jagah yehi use hota hai.
        default: "border-ink-200 bg-ink-50 text-ink-700 hover:border-ink-300 hover:bg-ink-100",
        // Indigo = primary/structural meta (department, semester).
        brand:
          "border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100",
        // Coral = signature highlight (ratings, "Top rated").
        accent:
          "border-coral-200 bg-coral-50 text-coral-700 hover:border-coral-300 hover:bg-coral-100",
        // Magenta = category chips.
        category:
          "border-magenta-200 bg-magenta-50 text-magenta-700 hover:border-magenta-300 hover:bg-magenta-100",
        // Sirf border, koi fill nahi.
        outline: "border-input bg-transparent text-ink-700 hover:border-ink-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
