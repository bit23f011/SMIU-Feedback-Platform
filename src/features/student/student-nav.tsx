"use client";

import * as React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  GraduationCap,
  Heart,
  LayoutDashboard,
  Monitor,
  UserCog,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/*
  Student area ka side navigation.

  Har category ke reviews ka apna route hai (ek giant mixed list nahi), taake
  student ko apna kaam category ke hisab se milay - aur aage filtering/pagination
  har route par alag se add ho sake.

  Active state pathname se nikalti hai, is liye yeh client component hai.
*/

interface StudentNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const STUDENT_NAV: readonly StudentNavItem[] = [
  { label: "Overview", href: "/student", icon: LayoutDashboard },
  { label: "Teacher reviews", href: "/student/teacher-reviews", icon: GraduationCap },
  { label: "Lab reviews", href: "/student/lab-reviews", icon: Monitor },
  { label: "Faculty reviews", href: "/student/faculty-reviews", icon: Users },
  { label: "University staff reviews", href: "/student/uni-staff-reviews", icon: Building2 },
  { label: "HR staff reviews", href: "/student/hr-staff-reviews", icon: UserCog },
  { label: "Favourites", href: "/student/favorites", icon: Heart },
] as const;

export function StudentNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Student area"
      className={cn(
        "md:rounded-xl md:border md:border-indigo-200 md:bg-indigo-50 md:p-2.5 md:shadow-card",
        className,
      )}
    >
      {/* Desktop panel ka chhota heading - color area ko "designed" dikhata hai. */}
      <p className="hidden px-2 pb-1.5 pt-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-indigo-600 md:block">
        Menu
      </p>
      {/* Mobile: horizontal scroll. Desktop: vertical list. */}
      <ul className="-mx-1 flex list-none gap-1.5 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0 md:pb-0">
        {STUDENT_NAV.map((item) => {
          const isActive =
            item.href === "/student" ? pathname === "/student" : pathname.startsWith(item.href);
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
                    ? "border-indigo-200 bg-white text-indigo-700 shadow-sm [&_svg]:text-indigo-600"
                    : "border-border bg-background text-ink-700 hover:bg-ink-50 hover:text-foreground md:border-transparent md:bg-transparent md:hover:bg-white/70 [&_svg]:text-ink-500",
                )}
              >
                <Icon aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
