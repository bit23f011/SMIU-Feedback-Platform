"use client";

import * as React from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

import { Spinner } from "@/components/common/loading-state";
import { Select } from "@/components/ui/select";
import { TEACHER_TYPE_LABELS } from "@/features/people/types";
import {
  courseLabel,
  DIRECTORY_SORTS,
  MIN_RATING_CHOICES,
  TEACHER_TYPE_CHOICES,
  type FilterOptions,
} from "@/features/discovery/types";
import { cn } from "@/lib/utils";

/*
  FilterControls - README §35 ke filters, sab URL me.

  URL me rakhne ki wajah wahi hai jo search ki thi: result shareable hai, back
  button sahi chalta hai, aur filtering server par hoti hai.

  SECURITY: yeh controls kuch "allow" nahi karte. Select ki har value DB function
  ki allow-list se dobara guzarti hai (`directory_people` sirf maloom sort qubool
  karti hai, rating ko 1..10 me clamp karti hai, aur limit khud tay karti hai).
  DevTools se koi bhi value URL me likh de, natija phir bhi RLS aur clamp ke
  andar rehta hai.

  Ek ahem tafseel: koi bhi filter badle to `page` param hata dete hain. Warna
  page 5 par khara banda naya filter lagane ke baad khali page dekhta hai.
*/

const ANY = "";

/*
  Kaunse controls dikhane hain, yeh caller tay karta hai. Directory ko chhe
  chahiye; courses page ko sirf do (course page par "course filter" ka koi matlab
  nahi banta).
*/
export type FilterField =
  | "department"
  | "course"
  | "semester"
  | "rating"
  | "teacherType"
  | "sort";

export const PEOPLE_FILTER_FIELDS: readonly FilterField[] = [
  "department",
  "course",
  "semester",
  "rating",
  "teacherType",
  "sort",
];

export const COURSE_FILTER_FIELDS: readonly FilterField[] = ["department", "semester"];

export interface FilterControlsProps {
  options: FilterOptions;
  fields?: readonly FilterField[];
  className?: string;
}

function FilterControlsInner({
  options,
  fields = PEOPLE_FILTER_FIELDS,
  className,
}: FilterControlsProps) {
  const shows = (field: FilterField) => fields.includes(field);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const departmentId = searchParams.get("dept") ?? ANY;
  const courseId = searchParams.get("course") ?? ANY;
  const semesterId = searchParams.get("semester") ?? ANY;
  const minRating = searchParams.get("rating") ?? ANY;
  const teacherType = searchParams.get("type") ?? ANY;
  const sort = searchParams.get("sort") ?? "name";

  /*
    Course dropdown bara ho sakta hai, is liye department chunne par usi
    department ke courses reh jate hain. Yeh sirf soolat hai: DB dono filters ko
    alag alag bhi theek handle karti hai.
  */
  const courses = React.useMemo(
    () =>
      departmentId
        ? options.courses.filter((course) => course.departmentId === departmentId)
        : options.courses,
    [departmentId, options.courses],
  );

  const apply = React.useCallback(
    (changes: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(changes)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }

      // Filter badla = pehle page par wapas.
      params.delete("page");

      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const onDepartmentChange = (value: string) => {
    /*
      Department badla aur chuna hua course us department ka nahi, to course
      filter hata do. Warna user ko khali natija milta hai aur samajh nahi aata
      ke wajah kya thi.
    */
    const selected = options.courses.find((course) => course.id === courseId);
    const keepCourse = !value || !selected || selected.departmentId === value;
    apply({ dept: value, course: keepCourse ? courseId : ANY });
  };

  const activeCount =
    (shows("department") && departmentId ? 1 : 0) +
    (shows("course") && courseId ? 1 : 0) +
    (shows("semester") && semesterId ? 1 : 0) +
    (shows("rating") && minRating ? 1 : 0) +
    (shows("teacherType") && teacherType ? 1 : 0);

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ["dept", "course", "semester", "rating", "type", "page"]) {
      params.delete(key);
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  return (
    <section
      aria-label="Filters"
      className={cn("rounded-lg border border-border bg-ink-50/60 p-4 sm:p-5", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[0.8125rem] font-medium text-ink-700">
          <SlidersHorizontal aria-hidden="true" className="size-4 text-ink-500" />
          Filters
          {activeCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[0.6875rem] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
          {isPending ? <Spinner /> : null}
        </p>

        {activeCount > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.8125rem] font-medium text-primary transition-colors duration-150 ease-out hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="size-3.5" />
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shows("department") ? (
          <FilterField label="Department">
            <Select
              value={departmentId}
              onChange={(event) => onDepartmentChange(event.target.value)}
            >
              <option value={ANY}>All departments</option>
              {options.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.shortName ?? department.name}
                </option>
              ))}
            </Select>
          </FilterField>
        ) : null}

        {shows("course") ? (
          <FilterField label="Course">
            <Select
              value={courseId}
              onChange={(event) => apply({ course: event.target.value })}
              disabled={courses.length === 0}
            >
              <option value={ANY}>All courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {courseLabel(course)}
                </option>
              ))}
            </Select>
          </FilterField>
        ) : null}

        {shows("semester") ? (
          <FilterField label="Semester">
            <Select
              value={semesterId}
              onChange={(event) => apply({ semester: event.target.value })}
              disabled={options.semesters.length === 0}
            >
              <option value={ANY}>All semesters</option>
              {options.semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.label}
                </option>
              ))}
            </Select>
          </FilterField>
        ) : null}

        {shows("rating") ? (
          <FilterField label="Minimum rating">
            <Select value={minRating} onChange={(event) => apply({ rating: event.target.value })}>
              <option value={ANY}>Any rating</option>
              {MIN_RATING_CHOICES.map((rating) => (
                <option key={rating} value={String(rating)}>
                  {rating} and above
                </option>
              ))}
            </Select>
          </FilterField>
        ) : null}

        {shows("teacherType") ? (
          <FilterField label="Teacher type">
            <Select value={teacherType} onChange={(event) => apply({ type: event.target.value })}>
              <option value={ANY}>All types</option>
              {TEACHER_TYPE_CHOICES.map((type) => (
                <option key={type} value={type}>
                  {TEACHER_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </FilterField>
        ) : null}

        {shows("sort") ? (
          <FilterField label="Sort by">
            <Select value={sort} onChange={(event) => apply({ sort: event.target.value })}>
              {DIRECTORY_SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FilterField>
        ) : null}
      </div>
    </section>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  const id = React.useId();

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[0.75rem] font-medium uppercase tracking-wide text-ink-500"
      >
        {label}
      </label>
      {/* Select native hai, is liye id label ke saath jorne ke liye clone karte hain. */}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id })
        : children}
    </div>
  );
}

/** Fallback - wahi dabba, magar inert. Height same rakhi hai taake layout na hile. */
export function FilterControlsSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-lg border border-border bg-ink-50/60 p-4 sm:p-5", className)}
    >
      <p className="flex items-center gap-2 text-[0.8125rem] font-medium text-ink-500">
        <SlidersHorizontal className="size-4" />
        Filters
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index}>
            <div className="mb-1.5 h-3 w-24 rounded bg-ink-200/70" />
            <div className="h-10 w-full rounded-md border border-input bg-background" />
          </div>
        ))}
      </div>
    </div>
  );
}

/*
  useSearchParams() static prerender par CSR-bailout trigger karta hai, is liye
  component khud apni Suspense boundary le kar chalta hai (wahi tarika jo
  DirectorySearch me hai). Caller ko kuch yaad rakhne ki zaroorat nahi.
*/
export function FilterControls(props: FilterControlsProps) {
  const count = (props.fields ?? PEOPLE_FILTER_FIELDS).length;

  return (
    <React.Suspense fallback={<FilterControlsSkeleton count={count} className={props.className} />}>
      <FilterControlsInner {...props} />
    </React.Suspense>
  );
}
