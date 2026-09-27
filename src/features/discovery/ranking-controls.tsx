"use client";

import * as React from "react";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Spinner } from "@/components/common/loading-state";
import { Select } from "@/components/ui/select";
import { PERSON_CATEGORIES } from "@/lib/constants";
import {
  courseLabel,
  RANKING_SCOPES,
  type FilterOptions,
  type RankingScope,
} from "@/features/discovery/types";
import { cn } from "@/lib/utils";

/*
  RankingControls - category + scope chunne ka URL-driven set.

  Sab kuch URL me hai: category, scope, aur scope ki id (department/course/
  semester). Is liye har ranking view shareable hai aur back button theek chalta
  hai.

  SECURITY: yeh sirf UI hai. `rankings` DB function khud scope ko allow-list se
  guzarti hai aur id na mile to us scope ko university par le aati hai; koi bhi
  value URL me daal do, natija RLS aur clamp ke andar rehta hai.
*/

const ANY = "";

export function RankingControls({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const category = searchParams.get("category") ?? "teacher";
  const scope = (searchParams.get("scope") ?? "university") as RankingScope;
  const departmentId = searchParams.get("dept") ?? ANY;
  const courseId = searchParams.get("course") ?? ANY;
  const semesterId = searchParams.get("semester") ?? ANY;

  /** Category link ke liye href: baaki params waise ke waise rakho. */
  const categoryHref = React.useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "teacher") {
        params.delete("category");
      } else {
        params.set("category", value);
      }
      const query = params.toString();
      return query ? `${pathname}?${query}` : pathname;
    },
    [pathname, searchParams],
  );

  const setParams = React.useCallback(
    (changes: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const onScopeChange = (value: string) => {
    // Scope badla to purani id-selection saaf: sirf nayi scope ki id maani rakhti hai.
    setParams({ scope: value === "university" ? ANY : value, dept: ANY, course: ANY, semester: ANY });
  };

  const courses = React.useMemo(
    () =>
      departmentId
        ? options.courses.filter((course) => course.departmentId === departmentId)
        : options.courses,
    [departmentId, options.courses],
  );

  return (
    <div className="space-y-4">
      {/* Category: har ek apna route-jaisa URL rakhta hai (link, button nahi). */}
      <nav aria-label="Ranking category" className="-mx-1 overflow-x-auto pb-1">
        <ul className="flex list-none items-center gap-1.5 px-1">
          {PERSON_CATEGORIES.map((item) => {
            const isActive = item.value === category;
            return (
              <li key={item.value}>
                <Link
                  href={categoryHref(item.value)}
                  aria-current={isActive ? "page" : undefined}
                  scroll={false}
                  className={cn(
                    "inline-flex h-9 items-center whitespace-nowrap rounded-md border px-3 text-[0.8125rem] font-medium transition-[background-color,border-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isActive
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                      : "border-border bg-background text-ink-600 hover:border-ink-300 hover:bg-ink-50 hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-48">
          <label
            htmlFor="ranking-scope"
            className="mb-1.5 block text-[0.75rem] font-medium uppercase tracking-wide text-ink-500"
          >
            Ranking scope
          </label>
          <Select
            id="ranking-scope"
            value={scope}
            onChange={(event) => onScopeChange(event.target.value)}
          >
            {RANKING_SCOPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>

        {scope === "department" ? (
          <div className="w-full sm:w-64">
            <label
              htmlFor="ranking-dept"
              className="mb-1.5 block text-[0.75rem] font-medium uppercase tracking-wide text-ink-500"
            >
              Department
            </label>
            <Select
              id="ranking-dept"
              value={departmentId}
              onChange={(event) => setParams({ dept: event.target.value })}
              disabled={options.departments.length === 0}
            >
              <option value={ANY}>Choose a department</option>
              {options.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.shortName ?? department.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {scope === "course" ? (
          <div className="w-full sm:w-72">
            <label
              htmlFor="ranking-course"
              className="mb-1.5 block text-[0.75rem] font-medium uppercase tracking-wide text-ink-500"
            >
              Course
            </label>
            <Select
              id="ranking-course"
              value={courseId}
              onChange={(event) => setParams({ course: event.target.value })}
              disabled={courses.length === 0}
            >
              <option value={ANY}>Choose a course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {courseLabel(course)}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {scope === "semester" ? (
          <div className="w-full sm:w-56">
            <label
              htmlFor="ranking-semester"
              className="mb-1.5 block text-[0.75rem] font-medium uppercase tracking-wide text-ink-500"
            >
              Semester
            </label>
            <Select
              id="ranking-semester"
              value={semesterId}
              onChange={(event) => setParams({ semester: event.target.value })}
              disabled={options.semesters.length === 0}
            >
              <option value={ANY}>Choose a semester</option>
              {options.semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.label}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {isPending ? (
          <span className="flex h-10 items-center">
            <Spinner />
          </span>
        ) : null}
      </div>
    </div>
  );
}
