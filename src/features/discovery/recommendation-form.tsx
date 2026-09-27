"use client";

import * as React from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/common/loading-state";
import { courseLabel, type FilterOptions } from "@/features/discovery/types";
import { cn } from "@/lib/utils";

/*
  RecommendationForm - README §44.

  Inputs: category, course, department, program, semester, section. Sab kuch URL
  me jata hai, isliye ek suggestion ka link shareable hai aur back button theek
  chalta hai.

  Kyun onChange par turant navigate nahi: yahan ek free-text "section" bhi hai.
  Har keystroke par query bhejna faltu hai. Isliye selects sirf local state
  badalte hain (aur ek doosre ko filter karte hain), aur asli navigation "Show
  recommendations" par hoti hai. Ek native <form> bhi rakha hai taake Enter aur
  no-JS dono chalein.

  CATEGORY: sirf wahi roles jinke sath course juda hota hai (teacher, lab
  instructor). Staff/HR ke liye "course/section" ka matlab nahi banta.

  SECURITY: yeh sirf UI hai. recommend_teachers khud values ko allow-list se
  guzarti hai aur eligibility (review threshold) DB me lagti hai; koi bhi id URL
  me daal do, natija usi ke andar rehta hai.
*/

const RECO_CATEGORIES = [
  { value: "teacher", label: "Teacher" },
  { value: "lab_instructor", label: "Lab instructor" },
] as const;

const ANY = "";
const MAX_SECTION = 12;

function Field({
  htmlFor,
  label,
  hint,
  children,
}: {
  htmlFor: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium leading-none text-ink-800">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function RecommendationForm({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  // Shuruaati halat URL se: refresh ya shared link par form bhara hua rahe.
  const [category, setCategory] = React.useState(searchParams.get("category") ?? "teacher");
  const [departmentId, setDepartmentId] = React.useState(searchParams.get("dept") ?? ANY);
  const [programId, setProgramId] = React.useState(searchParams.get("program") ?? ANY);
  const [courseId, setCourseId] = React.useState(searchParams.get("course") ?? ANY);
  const [semesterId, setSemesterId] = React.useState(searchParams.get("semester") ?? ANY);
  const [section, setSection] = React.useState(searchParams.get("section") ?? "");

  // Course aur program dono department se filter hote hain (agar department chuna ho).
  const courses = React.useMemo(
    () =>
      departmentId
        ? options.courses.filter((course) => course.departmentId === departmentId)
        : options.courses,
    [departmentId, options.courses],
  );
  const programs = React.useMemo(
    () =>
      departmentId
        ? options.programs.filter((program) => program.departmentId === departmentId)
        : options.programs,
    [departmentId, options.programs],
  );

  const onDepartmentChange = (value: string) => {
    setDepartmentId(value);
    // Department badla to purana course/program shayad us department me hai hi nahi.
    setCourseId(ANY);
    setProgramId(ANY);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();
    if (category !== "teacher") params.set("category", category);
    if (departmentId) params.set("dept", departmentId);
    if (programId) params.set("program", programId);
    if (courseId) params.set("course", courseId);
    if (semesterId) params.set("semester", semesterId);
    const trimmedSection = section.trim().slice(0, MAX_SECTION);
    if (trimmedSection) params.set("section", trimmedSection);

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field htmlFor="reco-category" label="Role">
          <Select
            id="reco-category"
            name="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {RECO_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field htmlFor="reco-dept" label="Department">
          <Select
            id="reco-dept"
            name="dept"
            value={departmentId}
            onChange={(event) => onDepartmentChange(event.target.value)}
            disabled={options.departments.length === 0}
          >
            <option value={ANY}>Any department</option>
            {options.departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.shortName ?? department.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field htmlFor="reco-program" label="Program">
          <Select
            id="reco-program"
            name="program"
            value={programId}
            onChange={(event) => setProgramId(event.target.value)}
            disabled={programs.length === 0}
          >
            <option value={ANY}>Any program</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.shortName ?? program.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          htmlFor="reco-course"
          label="Course"
          hint={departmentId ? "Courses in the chosen department." : undefined}
        >
          <Select
            id="reco-course"
            name="course"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            disabled={courses.length === 0}
          >
            <option value={ANY}>Any course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {courseLabel(course)}
              </option>
            ))}
          </Select>
        </Field>

        <Field htmlFor="reco-semester" label="Semester">
          <Select
            id="reco-semester"
            name="semester"
            value={semesterId}
            onChange={(event) => setSemesterId(event.target.value)}
            disabled={options.semesters.length === 0}
          >
            <option value={ANY}>Any semester</option>
            {options.semesters.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field htmlFor="reco-section" label="Section" hint="Optional, for example A or B.">
          <input
            id="reco-section"
            name="section"
            type="text"
            value={section}
            maxLength={MAX_SECTION}
            onChange={(event) => setSection(event.target.value)}
            placeholder="Any section"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-ink-400 hover:border-ink-400 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          />
        </Field>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors duration-150 ease-out hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70",
          )}
        >
          <Sparkles aria-hidden="true" className="size-4" />
          Show recommendations
        </button>
        {isPending ? <Spinner /> : null}
      </div>
    </form>
  );
}
