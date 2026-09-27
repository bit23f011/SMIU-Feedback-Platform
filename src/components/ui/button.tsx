import * as React from "react";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
  Button - ProfAura design system.

  Rules:
   - Radius restrained (rounded-md). Koi giant pill nahi.
   - Har variant ke paas hover + active(press) + focus-visible state hai.
   - Solid variants sirf un colours par jinka white text contrast AA pass karta hai
     (indigo #4858A3 = 6.5:1, coral ink #D23F37 = 4.7:1).
   - Koi gradient nahi.
*/
const buttonVariants = cva(
  [
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md",
    "text-sm font-medium",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:translate-y-px",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        // Primary action - indigo.
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-indigo-600 active:bg-indigo-700 active:shadow-press",
        // Signature accent - coral. Sirf ek screen par ek dafa use karo.
        accent:
          "bg-coral-600 text-white shadow-xs hover:bg-coral-700 active:bg-coral-800 active:shadow-press",
        // Outlined - sabse zyada use hone wala secondary action.
        outline:
          "border border-input bg-background text-foreground shadow-xs hover:border-ink-400 hover:bg-ink-50 active:bg-ink-100 active:shadow-press",
        // Halka tinted fill - toolbars/filters ke liye.
        subtle:
          "bg-secondary text-secondary-foreground hover:bg-indigo-100 active:bg-indigo-200/70",
        // Chrome ke andar (nav, icon buttons).
        ghost: "text-ink-700 hover:bg-ink-100 hover:text-foreground active:bg-ink-200/70",
        // Inline text action.
        link: "h-auto p-0 text-primary underline-offset-4 hover:underline active:translate-y-0",
        // Destructive - system state colour, brand accent nahi.
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-coral-800 active:shadow-press",
      },
      size: {
        sm: "h-8 px-3 text-[0.8125rem]",
        default: "h-10 px-4",
        lg: "h-11 px-5 text-[0.9375rem]",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  // asChild se koi bhi element (jaise next/link) button styling le sakta hai.
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        // Default type="button" - warna form ke andar galti se submit ho jata hai.
        type={asChild ? undefined : (type ?? "button")}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
