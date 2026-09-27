import Link from "next/link";
import { BookOpen, Building2, GraduationCap, HeartHandshake, Monitor } from "lucide-react";

import { PERSON_CATEGORIES } from "@/lib/constants";
import type { PersonCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
  CategoryChips - paanchon categories ka chhota navigation.

  Ab yeh asli links hain (pehle sirf dikhawe ke panels the) kyunke har category
  ka apna route mojood hai. Chips chhoti hain: yeh homepage ka primary action
  nahi, search ka secondary raasta hai.

  Category ka accent magenta hai (design system me category = magenta), magar
  sirf hover/focus par - default halat quiet neutral rehti hai taake page par
  paanch rangeen buttons na chamkein.
*/

// Lab instructor ka icon monitor hai, chemistry flask nahi: SMIU ke labs
// computer labs hain, is liye flask ghalat expectation deta tha.
const CATEGORY_ICON: Record<PersonCategory, typeof BookOpen> = {
  teacher: BookOpen,
  lab_instructor: Monitor,
  faculty: GraduationCap,
  university_staff: Building2,
  hr_staff: HeartHandshake,
};

export function CategoryChips({ className }: { className?: string }) {
  return (
    <nav aria-label="Browse by category" className={cn("min-w-0", className)}>
      <ul className="flex list-none flex-wrap items-center gap-2">
        {PERSON_CATEGORIES.map((category) => {
          const Icon = CATEGORY_ICON[category.value];
          return (
            <li key={category.value}>
              <Link
                href={`/${category.slug}`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5",
                  "text-[0.8125rem] font-medium text-ink-700 shadow-xs outline-none",
                  "transition-[color,background-color,border-color] duration-150 ease-out",
                  "hover:border-magenta-300 hover:bg-magenta-50 hover:text-magenta-700 dark:hover:text-magenta-300",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                )}
              >
                <Icon aria-hidden="true" className="size-3.5 text-ink-400" />
                {category.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
