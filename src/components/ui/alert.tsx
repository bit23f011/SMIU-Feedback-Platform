import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/*
  Alert - inline message block (form error, system notice, banner).
  Rang sirf 4 hain aur sab bohot halke tint par hain; dark block nahi banate.
  Icon default tone se aata hai, magar override bhi kiya ja sakta hai.
*/
const alertVariants = cva(
  ["relative flex w-full gap-3 rounded-lg border px-4 py-3 text-sm", "[&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0"],
  {
    variants: {
      tone: {
        info: "border-indigo-200 bg-indigo-50 text-indigo-800 [&_svg]:text-indigo-600",
        success:
          "border-state-success/25 bg-state-success-soft text-state-success [&_svg]:text-state-success",
        warning:
          "border-state-warning/25 bg-state-warning-soft text-state-warning [&_svg]:text-state-warning",
        danger:
          "border-state-danger/25 bg-state-danger-soft text-state-danger [&_svg]:text-state-danger",
        neutral: "border-border bg-ink-50 text-ink-700 [&_svg]:text-ink-500",
      },
    },
    defaultVariants: {
      tone: "info",
    },
  },
);

const toneIcon = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  neutral: Info,
} as const;

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: React.ReactNode;
  /** false karo to koi icon nahi aayega. */
  showIcon?: boolean;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, tone = "info", icon, showIcon = true, children, ...props }, ref) => {
    const Icon = toneIcon[tone ?? "info"];

    return (
      <div
        ref={ref}
        // danger/warning ko assertive nahi rakha - page load par screen reader ko
        // interrupt karna zaroori nahi; live region wahan use hoga jahan value badalti hai.
        role={tone === "danger" ? "alert" : "status"}
        className={cn(alertVariants({ tone }), className)}
        {...props}
      >
        {showIcon ? (icon ?? <Icon aria-hidden="true" />) : null}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    );
  },
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("font-medium leading-snug", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("mt-0.5 leading-relaxed opacity-90", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription, alertVariants };
