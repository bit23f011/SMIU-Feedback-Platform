"use client";

import * as React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CalendarRange,
  Flag,
  GraduationCap,
  Layers,
  LayoutDashboard,
  MessageSquareText,
  ScrollText,
  Settings,
  SlidersHorizontal,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/*
  Admin ka navigation.

  SECURITY: yeh sirf navigation hai. Kisi link ka dikhna ya chhupna permission
  nahi hai - har admin action server par role check (is_admin()) aur RLS +
  SECURITY DEFINER functions se authorize hoti hai. Frontend kabhi authority nahi.

  Ab items groups me hain (Moderation, Directory, Reference data, Platform) taake
  section barhne par list samajh me aati rahe. Mobile par horizontal scroll, md+
  par grouped vertical list.
*/

interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface AdminNavGroup {
  heading?: string;
  items: readonly AdminNavItem[];
}

export const ADMIN_NAV: readonly AdminNavGroup[] = [
  {
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    heading: "Moderation",
    items: [
      { label: "Reviews", href: "/admin/reviews", icon: Star },
      { label: "Reports", href: "/admin/reports", icon: Flag },
      { label: "Website feedback", href: "/admin/website-feedback", icon: MessageSquareText },
    ],
  },
  {
    heading: "Directory",
    items: [
      { label: "People", href: "/admin/people", icon: Users },
      { label: "Students", href: "/admin/students", icon: GraduationCap },
    ],
  },
  {
    heading: "Reference data",
    items: [
      { label: "Departments", href: "/admin/departments", icon: Building2 },
      { label: "Programs", href: "/admin/programs", icon: Layers },
      { label: "Courses", href: "/admin/courses", icon: BookOpen },
      { label: "Semesters", href: "/admin/semesters", icon: CalendarRange },
      { label: "Positions", href: "/admin/positions", icon: Briefcase },
      { label: "Criteria", href: "/admin/criteria", icon: SlidersHorizontal },
    ],
  },
  {
    heading: "Platform",
    items: [
      { label: "Rankings", href: "/admin/rankings", icon: Trophy },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
      { label: "Settings", href: "/admin/settings", icon: Settings },
      { label: "Audit log", href: "/admin/audit", icon: ScrollText },
    ],
  },
] as const;

function isItemActive(pathname: string, href: string): boolean {
  // Dashboard sirf exact match par (warna har /admin/* par active dikhta).
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className={className}>
      <ul className="-mx-1 flex list-none gap-1.5 overflow-x-auto px-1 pb-1 md:mx-0 md:block md:space-y-4 md:overflow-visible md:px-0 md:pb-0">
        {ADMIN_NAV.map((group, index) => (
          <li key={group.heading ?? `group-${index}`} className="contents md:block">
            {group.heading ? (
              <p className="hidden px-3 pb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-400 md:block">
                {group.heading}
              </p>
            ) : null}
            <ul className="contents list-none md:block md:space-y-0.5">
              {group.items.map((item) => {
                const isActive = isItemActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex h-9 items-center gap-2 whitespace-nowrap rounded-md border px-3 text-[0.8125rem] font-medium md:w-full md:border-transparent",
                        "transition-[background-color,border-color,color] duration-150 ease-out",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "[&_svg]:size-4 [&_svg]:shrink-0",
                        isActive
                          ? "border-indigo-200 bg-indigo-50 text-indigo-700 [&_svg]:text-indigo-600"
                          : "border-border bg-background text-ink-600 hover:bg-ink-50 hover:text-foreground md:bg-transparent [&_svg]:text-ink-400",
                      )}
                    >
                      <Icon aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
