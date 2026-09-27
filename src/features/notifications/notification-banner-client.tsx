"use client";

import * as React from "react";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from "lucide-react";

import type { NotificationPriority } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { NotificationRow } from "@/features/notifications/types";

/*
  Priority ke hisaab se look + icon.

  Rang wahi state tokens hain jo Alert component me use hote hain (info = indigo,
  baqi teen system states). Purane brand-50 / maroon-50 scales design system se
  nikal chuke hain - unko yahan se bhi hata diya, warna banner ka background
  chup-chaap ghayab rehta.

  Banner site ke bilkul upar aata hai, is liye tint bohot halki rakhi hai: yeh
  page ka pehla ta'assur hai, alarm nahi.
*/
const PRIORITY_STYLE: Record<NotificationPriority, { wrap: string; icon: React.ElementType }> = {
  info: { wrap: "border-indigo-200 bg-indigo-50 text-indigo-800", icon: Info },
  success: {
    wrap: "border-state-success/25 bg-state-success-soft text-state-success",
    icon: CheckCircle2,
  },
  warning: {
    wrap: "border-state-warning/25 bg-state-warning-soft text-state-warning",
    icon: AlertTriangle,
  },
  critical: {
    wrap: "border-state-danger/25 bg-state-danger-soft text-state-danger",
    icon: ShieldAlert,
  },
};

export function NotificationBannerClient({ notification }: { notification: NotificationRow }) {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;

  const conf = PRIORITY_STYLE[notification.priority] ?? PRIORITY_STYLE.info;
  const Icon = conf.icon;

  return (
    <div role="region" aria-label="Site announcement" className={cn("border-b", conf.wrap)}>
      <div className="container flex items-start gap-3 py-2.5">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p className="flex-1 text-sm leading-relaxed">
          {notification.title ? <span className="font-medium">{notification.title} </span> : null}
          <span className="opacity-90">{notification.message}</span>
          {notification.href && notification.cta_label ? (
            <Link
              href={notification.href}
              className="ml-2 whitespace-nowrap rounded-sm font-medium underline underline-offset-2 outline-none transition-opacity duration-150 ease-out hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {notification.cta_label}
            </Link>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss announcement"
          className="-mr-1 shrink-0 rounded-md p-1 opacity-70 outline-none transition-opacity duration-150 ease-out hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
