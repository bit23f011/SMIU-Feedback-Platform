import type { Metadata } from "next";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Flag,
  Images,
  ListChecks,
  MessageSquareText,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { getAdminDashboardStats } from "@/features/admin/dashboard/queries";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/*
  Admin dashboard.

  Counts teen mojooda admin queue RPCs se aate hain (koi naya DB function nahi).
  Har count us section ki pending/naya kaam dikhata hai. Agar fetch fail ho jaye
  (is_admin()/network) to "0" ke bajaye ek halka note - warna ghalat tassali.
*/
export const dynamic = "force-dynamic";

const SECTIONS = [
  {
    title: "Reviews",
    body: "Approve, reject, hide or feature the text students write. Ratings are never held back.",
    href: "/admin/reviews",
    icon: Star,
  },
  {
    title: "Reports",
    body: "Work through reports raised against a profile. Accepting one never deletes a profile on its own.",
    href: "/admin/reports",
    icon: Flag,
  },
  {
    title: "Website feedback",
    body: "Bugs and suggestions about ProfAura itself, kept separate from reviews.",
    href: "/admin/website-feedback",
    icon: MessageSquareText,
  },
  {
    title: "Notifications",
    body: "Schedule the announcement banner shown across the public site.",
    href: "/admin/notifications",
    icon: Bell,
  },
  {
    title: "Homepage images",
    body: "Upload and remove the images that rotate beside the headline on the public homepage.",
    href: "/admin/home-images",
    icon: Images,
  },
  {
    title: "Criteria",
    body: "The questions students rate. Add or retire criteria without touching code.",
    href: "/admin/criteria",
    icon: ListChecks,
  },
  {
    title: "Settings",
    body: "Platform switches: sign-ups, review submission, editing and the email rule.",
    href: "/admin/settings",
    icon: SlidersHorizontal,
  },
] as const;

interface StatSpec {
  label: string;
  value: number;
  href: string;
  icon: LucideIcon;
  hint: string;
}

function StatCard({ stat, unavailable }: { stat: StatSpec; unavailable: boolean }) {
  const Icon = stat.icon;

  return (
    <Card interactive className="group relative flex w-full flex-col p-5">
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600 [&_svg]:size-4"
      >
        <Icon />
      </span>

      {unavailable ? (
        <p className="mt-4 text-sm text-muted-foreground">Not available right now</p>
      ) : (
        <p className="mt-4 font-display text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {stat.value}
        </p>
      )}

      <h2 className="mt-0.5 text-sm font-medium text-foreground">
        <Link
          href={stat.href}
          className="rounded-sm outline-none after:absolute after:inset-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {stat.label}
        </Link>
      </h2>

      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stat.hint}</p>
    </Card>
  );
}

export default async function AdminHomePage() {
  const stats = await getAdminDashboardStats();

  const statCards: StatSpec[] = [
    {
      label: "Reviews to moderate",
      value: stats.pendingReviews,
      href: "/admin/reviews",
      icon: Star,
      hint: "Written text waiting for a first decision.",
    },
    {
      label: "Reports pending",
      value: stats.pendingReports,
      href: "/admin/reports",
      icon: Flag,
      hint: "Profile reports waiting for accept or reject.",
    },
    {
      label: "New feedback",
      value: stats.newFeedback,
      href: "/admin/website-feedback",
      icon: MessageSquareText,
      hint: "Website feedback you have not looked at yet.",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Admin dashboard
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Platform controls for ProfAura. Every action here is authorised on the server with a role
          check plus row-level security, and recorded in an audit log.
        </p>
      </header>

      {stats.failed ? (
        <Alert tone="warning" className="mt-6">
          <TriangleAlert aria-hidden="true" />
          <div>
            <AlertTitle>Some counts did not load</AlertTitle>
            <AlertDescription>
              The numbers below may be incomplete. Reload the page, and if it keeps failing, check
              that your account still has the admin role.
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      <ul className="mt-6 grid list-none gap-4 sm:grid-cols-3">
        {statCards.map((stat) => (
          <li key={stat.href} className="flex">
            <StatCard stat={stat} unavailable={stats.failed} />
          </li>
        ))}
      </ul>

      <Alert tone="info" className="mt-6">
        <ShieldCheck aria-hidden="true" />
        <div>
          <AlertTitle>The interface never grants access</AlertTitle>
          <AlertDescription>
            Buttons and pages here are only a convenience. Each admin action is checked again in the
            database, so nothing can be forced through by editing the page.
          </AlertDescription>
        </div>
      </Alert>

      <h2 className="mt-10 font-display text-lg font-semibold tracking-tight text-foreground">
        All sections
      </h2>
      <ul className="mt-4 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => {
          const SectionIcon = section.icon;
          return (
            <li key={section.href} className="flex">
              <Card interactive className="group relative flex w-full flex-col p-5">
                <span
                  aria-hidden="true"
                  className="flex size-9 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600 [&_svg]:size-4"
                >
                  <SectionIcon />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold tracking-tight text-foreground">
                  <Link
                    href={section.href}
                    className="rounded-sm outline-none after:absolute after:inset-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {section.title}
                  </Link>
                </h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {section.body}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Open
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                  />
                </span>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
