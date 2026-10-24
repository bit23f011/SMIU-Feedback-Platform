"use client";

import * as React from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, RotateCcw, SlidersHorizontal } from "@/components/ui/icons";

import { Spinner } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { TEACHER_TYPE_LABELS } from "@/features/people/types";
import {
  courseLabel,
  DIRECTORY_SORTS,
  FILTER_PARAMS,
  MIN_RATING_CHOICES,
  readDirectoryFilters,
  TEACHER_TYPE_CHOICES,
  type FilterOptions,
} from "@/features/discovery/types";
import {
  PEOPLE_FILTER_FIELDS,
  type FilterField,
} from "@/features/discovery/filter-fields";
import { cn } from "@/lib/utils";

export {
  COURSE_FILTER_FIELDS,
  PEOPLE_FILTER_FIELDS,
  type FilterField,
} from "@/features/discovery/filter-fields";

type FilterDraft = Record<FilterField, string>;

const EMPTY_DRAFT: FilterDraft = {
  department: "",
  course: "",
  semester: "",
  rating: "",
  teacherType: "",
  sort: "name",
};

export interface FilterControlsProps {
  options: FilterOptions;
  fields?: readonly FilterField[];
  className?: string;
}

const TRIGGER_STYLE =
  "relative size-11 shrink-0 rounded-xl border border-border bg-background text-ink-600 shadow-xs hover:border-indigo-200 hover:bg-indigo-50 hover:text-primary";

function FilterControlsInner({
  options,
  fields = PEOPLE_FILTER_FIELDS,
  className,
}: FilterControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const shows = (field: FilterField) => fields.includes(field);

  const applied = React.useMemo<FilterDraft>(() => {
    const filters = readDirectoryFilters(
      Object.fromEntries(searchParams.entries()),
    );
    return {
      department: filters.departmentId ?? "",
      course: filters.courseId ?? "",
      semester: filters.semesterId ?? "",
      rating: filters.minRating === null ? "" : String(filters.minRating),
      teacherType: filters.teacherType ?? "",
      sort: filters.sort,
    };
  }, [searchParams]);
  const [draft, setDraft] = React.useState<FilterDraft>(applied);

  // Select badalne se URL nahi badalta; choices Apply par ek saath lagti hain.
  const updateDraft = (field: FilterField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const courses = React.useMemo(
    () =>
      draft.department
        ? options.courses.filter(
            (course) => course.departmentId === draft.department,
          )
        : options.courses,
    [draft.department, options.courses],
  );

  const onDepartmentChange = (value: string) => {
    setDraft((current) => {
      const selected = options.courses.find(
        (course) => course.id === current.course,
      );
      return {
        ...current,
        department: value,
        course: value && selected?.departmentId !== value ? "" : current.course,
      };
    });
  };

  const activeCount = fields.filter(
    (field) => applied[field] !== EMPTY_DRAFT[field],
  ).length;

  const navigate = (params: URLSearchParams) => {
    // Naye filters pehle page se shuru hon; search term mehfooz rahe.
    params.delete(FILTER_PARAMS.page);
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? pathname + "?" + query : pathname, {
        scroll: false,
      });
    });
    setOpen(false);
  };

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    for (const field of fields) {
      const key = FILTER_PARAMS[field];
      const value = draft[field];
      if (value && value !== EMPTY_DRAFT[field]) params.set(key, value);
      else params.delete(key);
    }
    navigate(params);
  };

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    for (const field of PEOPLE_FILTER_FIELDS)
      params.delete(FILTER_PARAMS[field]);
    setDraft({ ...EMPTY_DRAFT });
    navigate(params);
  };

  return (
    <div
      className={cn("inline-flex shrink-0", className)}
      aria-busy={isPending}
    >
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) setDraft({ ...applied });
          setOpen(nextOpen);
        }}
      >
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            title="Filters"
            aria-label={
              activeCount ? "Filters, " + activeCount + " active" : "Filters"
            }
            disabled={isPending}
            className={cn(
              TRIGGER_STYLE,
              activeCount > 0 && "border-indigo-200 bg-indigo-50 text-primary",
            )}
          >
            {isPending ? <Spinner /> : <SlidersHorizontal aria-hidden="true" />}
            {activeCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border-2 border-background bg-primary text-[0.625rem] font-semibold text-primary-foreground">
                {activeCount}
              </span>
            ) : null}
          </Button>
        </DialogTrigger>

        <DialogContent className="flex max-h-[90dvh] max-w-xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border p-5 pr-12 text-left sm:p-6 sm:pr-12">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-primary">
                <SlidersHorizontal
                  aria-hidden="true"
                  className="size-[1.125rem]"
                />
              </span>
              <div className="space-y-1.5">
                <DialogTitle>Refine your search</DialogTitle>
                <DialogDescription>
                  Choose your filters, then apply them together.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={applyFilters} className="flex min-h-0 flex-col">
            <div className="grid min-h-0 gap-4 overflow-y-auto overscroll-contain p-5 sm:grid-cols-2 sm:gap-5 sm:p-6">
              {shows("department") ? (
                <FilterField label="Department">
                  <Select
                    value={draft.department}
                    onChange={(event) => onDepartmentChange(event.target.value)}
                  >
                    <option value="">All departments</option>
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
                    value={draft.course}
                    onChange={(event) =>
                      updateDraft("course", event.target.value)
                    }
                    disabled={courses.length === 0}
                  >
                    <option value="">All courses</option>
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
                    value={draft.semester}
                    onChange={(event) =>
                      updateDraft("semester", event.target.value)
                    }
                    disabled={options.semesters.length === 0}
                  >
                    <option value="">All semesters</option>
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
                  <Select
                    value={draft.rating}
                    onChange={(event) =>
                      updateDraft("rating", event.target.value)
                    }
                  >
                    <option value="">Any rating</option>
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
                  <Select
                    value={draft.teacherType}
                    onChange={(event) =>
                      updateDraft("teacherType", event.target.value)
                    }
                  >
                    <option value="">All types</option>
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
                  <Select
                    value={draft.sort}
                    onChange={(event) =>
                      updateDraft("sort", event.target.value)
                    }
                  >
                    {DIRECTORY_SORTS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FilterField>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-surface p-4 sm:flex-row sm:justify-between sm:px-6">
              <Button
                type="button"
                variant="ghost"
                onClick={clearAll}
                disabled={isPending}
              >
                <RotateCcw aria-hidden="true" />
                Clear all filters
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="sm:min-w-36"
              >
                <Check aria-hidden="true" />
                Apply filters
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-medium text-ink-600">
        {label}
      </label>
      {React.isValidElement(children)
        ? React.cloneElement(
            children as React.ReactElement<{ id?: string; className?: string }>,
            {
              id,
              className:
                "h-11 rounded-lg border-border bg-surface/50 hover:bg-background",
            },
          )
        : children}
    </div>
  );
}

/** Chhota icon fallback; reference data aane par toolbar ki height nahi badalti. */
export function FilterControlsSkeleton({
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("inline-flex shrink-0", className)}>
      <Button
        variant="ghost"
        size="icon"
        className={TRIGGER_STYLE}
        disabled
        tabIndex={-1}
      >
        <SlidersHorizontal />
      </Button>
    </div>
  );
}

export function FilterControls(props: FilterControlsProps) {
  return (
    <React.Suspense
      fallback={<FilterControlsSkeleton className={props.className} />}
    >
      <FilterControlsInner {...props} />
    </React.Suspense>
  );
}
