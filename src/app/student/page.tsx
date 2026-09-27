import type { Metadata } from "next";

import Link from "next/link";
import { ArrowRight, Clock, Heart, PenLine, Star } from "lucide-react";

import { Card } from "@/components/ui/card";
import { PersonGrid } from "@/features/people/person-card";
import { getMyRecentlyViewed } from "@/features/discovery/queries";
import { REVIEW_LIMITS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Student area",
  description: "Your reviews, favourites and account settings on ProfAura.",
  robots: { index: false, follow: false },
};

/*
  Recently viewed per-user aur cookie par mabni hai (my_recently_viewed, RLS se
  sirf isi student ki rows). Isliye page dynamic hai.
*/
export const dynamic = "force-dynamic";

/*
  Student overview.

  Yahan koi count/statistic hard-code nahi ki gayi. "0 reviews" dikhana bhi ghalat
  hai jab reviews feature hi exist nahi karta. User samajhta hai ke uska data
  gum ho gaya. Is liye sirf raaste dikhaye hain.
*/

const SHORTCUTS = [
  {
    title: "Write a review",
    body: "Find the teacher, lab instructor or staff member you worked with and share what the experience was actually like.",
    href: "/teachers",
    action: "Browse the directory",
    icon: PenLine,
  },
  {
    title: "Your reviews",
    body: "Everything you write is listed by category, so you can find and update a review without scrolling through the rest.",
    href: "/student/teacher-reviews",
    action: "Open teacher reviews",
    icon: Star,
  },
  {
    title: "Favourites",
    body: "Save profiles you want to come back to before registration week. The list stays private to you.",
    href: "/student/favorites",
    action: "Open favourites",
    icon: Heart,
  },
] as const;

export default async function StudentHomePage() {
  // Khali ho sakti hai (naya user, ya kuch dekha hi nahi). Tab section chhupa
  // dete hain: "0 recently viewed" dikhana bekaar hai.
  const recentlyViewed = await getMyRecentlyViewed();

  return (
    <div className="space-y-8">
      <section aria-labelledby="student-overview-heading">
        <h1
          id="student-overview-heading"
          className="font-display text-xl font-semibold tracking-tight text-foreground"
        >
          Your student area
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          This is where your reviews and saved profiles will live. Your name is never attached to a
          review on any public page. Only you can see this area.
        </p>
      </section>

      <ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SHORTCUTS.map((shortcut) => {
          const Icon = shortcut.icon;
          return (
            <li key={shortcut.title} className="flex">
              <Card interactive className="group relative flex w-full flex-col p-5">
                <span
                  aria-hidden="true"
                  className="flex size-9 items-center justify-center rounded-md border border-indigo-100 bg-indigo-50 text-indigo-600 [&_svg]:size-4"
                >
                  <Icon />
                </span>
                <h2 className="mt-4 font-display text-base font-semibold tracking-tight text-foreground">
                  <Link
                    href={shortcut.href}
                    className="rounded-sm outline-none after:absolute after:inset-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {shortcut.title}
                  </Link>
                </h2>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {shortcut.body}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  {shortcut.action}
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

      {recentlyViewed.length > 0 ? (
        <section aria-labelledby="recently-viewed-heading">
          <div className="flex items-center gap-2">
            <Clock aria-hidden="true" className="size-4 text-indigo-600" />
            <h2
              id="recently-viewed-heading"
              className="font-display text-base font-semibold tracking-tight text-foreground"
            >
              Recently viewed
            </h2>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Profiles you opened lately, so you can pick up where you left off. Only you can see this.
          </p>
          <div className="mt-4">
            <PersonGrid people={recentlyViewed} />
          </div>
        </section>
      ) : null}

      <Card className="p-5">
        <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
          Editing a review
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          A review can be edited up to {REVIEW_LIMITS.maxEditsPerReview} times, after which it
          locks. The limit is enforced on the server, not in the browser, so it holds no matter how
          a review is submitted.
        </p>
      </Card>
    </div>
  );
}
