"use client";

import * as React from "react";

import { Select } from "@/components/ui/select";
import type { ReviewOption } from "@/features/reviews/types";

/*
  Course + semester chunne wala hissa (README §25).

  Kyun zaroori hai: uniqueness ka scope student + person + course + semester
  hai. Yani ek hi teacher ko alag course ya alag semester me dobara review kiya
  ja sakta hai, magar wohi course + wohi semester dobara nahi. Is liye review
  likhte waqt yeh do cheezein maloom honi chahiye.

  SECURITY: yahan jo options dikhte hain wo sirf soolat ke liye hain. Koi
  DevTools se <option> ki value badal de, naye options ghusa de, ya poora
  field hi hata de - `submit_review` phir bhi khud check karta hai ke yeh
  jorha is banday se mel khata hai, aur uniqueness ka asli taala do unique
  indexes hain. Frontend yahan kuch "allow" nahi kar raha.

  Staff/HR profiles par course ka koi matlab nahi, in ke options me course null
  hota hai - tab sirf semester wala menu dikhta hai.
*/

function uniqueSemesters(options: ReviewOption[]) {
  const seen = new Map<string, string>();
  for (const option of options) {
    if (!seen.has(option.semesterId)) seen.set(option.semesterId, option.semesterLabel);
  }
  return [...seen.entries()].map(([id, label]) => ({ id, label }));
}

function courseLabel(option: ReviewOption): string {
  if (option.courseCode && option.courseTitle) {
    return `${option.courseCode} - ${option.courseTitle}`;
  }
  return option.courseTitle ?? option.courseCode ?? "Course";
}

function Field({
  id,
  label,
  hint,
  errors,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  const hasError = Boolean(errors && errors.length > 0);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium leading-none text-ink-800">
        {label}
      </label>
      {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      {children}
      {hasError ? (
        <p role="alert" className="text-xs font-medium text-state-danger">
          {errors![0]}
        </p>
      ) : null}
    </div>
  );
}

export function ReviewContextPicker({
  options,
  needsCourse,
  fieldErrors,
}: {
  options: ReviewOption[];
  needsCourse: boolean;
  fieldErrors?: Record<string, string[]>;
}) {
  /*
    Courses ki list me har course ek hi baar aata hai, chahe wo kai semesters
    me parhaya gaya ho. Semester ka menu chune hue course par mabni hota hai,
    warna user aisa jorha bana leta jo server rad kar deta.
  */
  const courses = React.useMemo(() => {
    const seen = new Map<string, ReviewOption>();
    for (const option of options) {
      if (option.courseId && !seen.has(option.courseId)) seen.set(option.courseId, option);
    }
    return [...seen.values()];
  }, [options]);

  const [courseId, setCourseId] = React.useState<string>(() =>
    needsCourse && courses.length === 1 ? (courses[0]!.courseId ?? "") : "",
  );
  const [semesterId, setSemesterId] = React.useState<string>("");

  const semesters = React.useMemo(() => {
    if (!needsCourse) return uniqueSemesters(options);
    if (!courseId) return [];
    return uniqueSemesters(options.filter((option) => option.courseId === courseId));
  }, [needsCourse, options, courseId]);

  if (options.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-ink-200 bg-ink-50/60 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {needsCourse
            ? "No courses or semesters are listed for this profile yet, so a review cannot be linked to a class. Please check back once the department records are added."
            : "No review periods are set up yet. Please check back soon."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {needsCourse ? (
        <Field
          id="review-course"
          label="Course"
          hint="The course you studied with this person."
          errors={fieldErrors?.courseId}
        >
          <Select
            id="review-course"
            name="courseId"
            value={courseId}
            aria-invalid={Boolean(fieldErrors?.courseId?.length)}
            onChange={(event) => {
              setCourseId(event.target.value);
              // Course badla to purana semester shayad is course me hai hi
              // nahi. Khaali kar do, warna ek na-mumkin jorha bann jata hai.
              setSemesterId("");
            }}
          >
            <option value="">Select a course</option>
            {courses.map((option) => (
              <option key={option.courseId!} value={option.courseId!}>
                {courseLabel(option)}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Field
        id="review-semester"
        label="Semester"
        hint={
          needsCourse
            ? "The semester you took this course in."
            : "The semester this experience is about."
        }
        errors={fieldErrors?.semesterId}
      >
        <Select
          id="review-semester"
          name="semesterId"
          value={semesterId}
          disabled={needsCourse && !courseId}
          aria-invalid={Boolean(fieldErrors?.semesterId?.length)}
          onChange={(event) => setSemesterId(event.target.value)}
        >
          <option value="">
            {needsCourse && !courseId ? "Select a course first" : "Select a semester"}
          </option>
          {semesters.map((semester) => (
            <option key={semester.id} value={semester.id}>
              {semester.label}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
