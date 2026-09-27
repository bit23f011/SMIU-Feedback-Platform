import * as React from "react";

import Link from "next/link";

import { PERSON_CATEGORIES } from "@/lib/constants";
import type { PersonCategory } from "@/features/people/types";
import { cn } from "@/lib/utils";

/*
  CategoryTabs - paanch categories ke beech switch karne ka chhota navigation.
  Yeh asli <nav> + links hain (tabs nahi), kyunke har category apna route hai -
  is liye keyboard aur "open in new tab" dono theek kaam karte hain.

  Active state server par decide hoti hai (`active` prop), is liye yeh component
  client bundle me nahi jata.
*/

export interface CategoryTabsProps {
  active?: PersonCategory;
  className?: string;
}

export function CategoryTabs({ active, className }: CategoryTabsProps) {
  return (
    <nav
      aria-label="Browse by category"
      className={cn("-mx-1 overflow-x-auto pb-1", className)}
    >
      <ul className="flex list-none items-center gap-1.5 px-1">
        {PERSON_CATEGORIES.map((category) => {
          const isActive = category.value === active;
          return (
            <li key={category.value}>
              <Link
                href={`/${category.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center whitespace-nowrap rounded-md border px-3 text-[0.8125rem] font-medium",
                  "transition-[background-color,border-color,color] duration-150 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-border bg-background text-ink-600 hover:border-ink-300 hover:bg-ink-50 hover:text-foreground",
                )}
              >
                {category.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
