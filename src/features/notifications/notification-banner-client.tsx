"use client";

import * as React from "react";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import type { NotificationPriority } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { NotificationRow } from "@/features/notifications/types";

/*
  Announcement ab ek FLOATING toast hai - navbar ke neeche chipki hui poori-chaurai
  patti nahi. Screen ke neeche-daayen kone se (mobile par neeche-beech) halke se
  upar aata hai: card jaisa, border + shadow ke saath. User X se band kar sakta hai.

  Rang priority ke hisaab se wahi state tokens hain jo pehle the (info = indigo,
  baqi teen system states) - sirf jagah aur shakl badli hai, matlab nahi.

  Accessibility:
   - aria-live="polite" region taake screen-reader ko announcement mile magar
     focus na chheena jaye
   - band karne ka button (aria-label ke saath)
   - prefers-reduced-motion: slide off, sirf halka fade - koi upar-neeche harkat nahi
*/
const PRIORITY_STYLE: Record<NotificationPriority, { wrap: string; icon: React.ElementType }> = {
  info: { wrap: "border-indigo-200 bg-indigo-50 text-indigo-900", icon: Info },
  success: {
    wrap: "border-state-success/30 bg-state-success-soft text-state-success",
    icon: CheckCircle2,
  },
  warning: {
    wrap: "border-state-warning/30 bg-state-warning-soft text-state-warning",
    icon: AlertTriangle,
  },
  critical: {
    wrap: "border-state-danger/30 bg-state-danger-soft text-state-danger",
    icon: ShieldAlert,
  },
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function NotificationBannerClient({ notification }: { notification: NotificationRow }) {
  const [open, setOpen] = React.useState(true);
  const reduce = useReducedMotion();

  const conf = PRIORITY_STYLE[notification.priority] ?? PRIORITY_STYLE.info;
  const Icon = conf.icon;

  return (
    <div
      role="region"
      aria-label="Site announcement"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4",
        "sm:inset-x-auto sm:bottom-6 sm:right-6 sm:justify-end sm:px-0 sm:pb-0",
      )}
    >
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg shadow-black/5",
              conf.wrap,
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="flex-1 text-sm leading-relaxed">
              {notification.title ? (
                <span className="font-semibold">{notification.title} </span>
              ) : null}
              <span className="opacity-90">{notification.message}</span>
              {notification.href && notification.cta_label ? (
                <Link
                  href={notification.href}
                  className="ml-1.5 inline-block whitespace-nowrap rounded-sm font-medium underline underline-offset-2 outline-none transition-opacity duration-150 ease-out hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {notification.cta_label}
                </Link>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Dismiss announcement"
              className="-mr-1 -mt-1 shrink-0 rounded-md p-1 opacity-70 outline-none transition-opacity duration-150 ease-out hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
