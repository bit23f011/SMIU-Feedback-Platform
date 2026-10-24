"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  Monitor,
  Users,
  Building2,
  UserCog,
  Heart,
  ChevronDown,
} from "@/components/ui/icons";
import { GuideButton } from "@/components/layout/site-experience";
import { cn } from "@/lib/utils";
export const STUDENT_NAV = [
  { label: "Overview", href: "/student", icon: LayoutDashboard },
  { label: "All reviews", href: "/student/reviews", icon: GraduationCap },
  {
    label: "Teacher reviews",
    href: "/student/teacher-reviews",
    icon: GraduationCap,
  },
  { label: "Lab reviews", href: "/student/lab-reviews", icon: Monitor },
  { label: "Faculty reviews", href: "/student/faculty-reviews", icon: Users },
  {
    label: "Campus staff reviews",
    href: "/student/uni-staff-reviews",
    icon: Building2,
  },
  {
    label: "HR staff reviews",
    href: "/student/hr-staff-reviews",
    icon: UserCog,
  },
  { label: "Saved profiles", href: "/student/favorites", icon: Heart },
] as const;
export function StudentNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  const current =
    STUDENT_NAV.find((item) => item.href === pathname)?.label || "Student menu";
  return (
    <nav
      aria-label="Student area"
      className={cn(
        "rounded-lg border border-border bg-card p-2 md:border-0 md:bg-transparent md:p-0",
        className,
      )}
    >
      <button
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium md:hidden"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="student-navigation"
      >
        <span>{current}</span>
        <ChevronDown className="size-4" aria-hidden="true" />
      </button>
      <div
        id="student-navigation"
        className={cn(open ? "block" : "hidden", "md:block")}
      >
        <p className="eyebrow px-3 pb-3 pt-4 md:pt-0">Your workspace</p>
        <ul className="space-y-1">
          {STUDENT_NAV.map((item, index) => {
            const Icon = item.icon;
            return (
              <li
                key={item.href}
                className={cn(
                  (item.href === "/student/reviews" || item.href === "/student/favorites") &&
                    "mt-5 border-t border-border pt-4",
                )}
              >
                <Link
                  href={item.href}
                  className="student-nav-link"
                  aria-current={pathname === item.href ? "page" : undefined}
                >
                  <Icon aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 border-t border-border px-3 pt-5">
          <GuideButton className="text-xs">
            Review guidelines & privacy
          </GuideButton>
          <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
            Your name is never shown with a public review.
          </p>
        </div>
      </div>
    </nav>
  );
}
