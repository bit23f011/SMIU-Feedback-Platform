import { cn } from "@/lib/utils";

/*
  Skeleton = loading placeholder block.
  Reduced-motion me pulse animation apne aap ruk jati hai (globals.css handle karta hai).
*/
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-ink-100", className)}
      {...props}
    />
  );
}

export { Skeleton };
