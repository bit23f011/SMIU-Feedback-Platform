"use client";

import * as React from "react";

import { useFormState } from "react-dom";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormStatus, SubmitButton } from "@/features/admin/reference/reference-controls";
import { upsertCourseAction } from "@/features/admin/reference/actions";
import {
  EMPTY_REFERENCE_ACTION_STATE,
  type AdminCourse,
  type AdminDepartment,
  type AdminProgram,
} from "@/features/admin/reference/types";

/*
  Course banane/edit karne ka form (README §49).

  SECURITY: submit admin_upsert_course (is_admin()) tak jata hai. Department zaroori,
  program optional. Dono lists active + (edit ke waqt) mojooda selection dikhati hain.
*/
export function CourseForm({
  course,
  departments,
  programs,
}: {
  course?: AdminCourse;
  departments: AdminDepartment[];
  programs: AdminProgram[];
}) {
  const [state, formAction] = useFormState(upsertCourseAction, EMPTY_REFERENCE_ACTION_STATE);
  const isEdit = Boolean(course);
  const uid = course?.id ?? "new";

  const departmentOptions = departments.filter(
    (department) => department.isActive || department.id === course?.departmentId,
  );
  const programOptions = programs.filter(
    (program) => program.isActive || program.id === course?.programId,
  );

  return (
    <form action={formAction} className="space-y-4">
      {isEdit ? <input type="hidden" name="id" value={course!.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`course-title-${uid}`}>
            Title <span className="text-state-danger">*</span>
          </Label>
          <Input
            id={`course-title-${uid}`}
            name="title"
            required
            maxLength={160}
            defaultValue={course?.title ?? ""}
            placeholder="Data Structures and Algorithms"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`course-code-${uid}`}>Code</Label>
          <Input
            id={`course-code-${uid}`}
            name="code"
            maxLength={32}
            defaultValue={course?.code ?? ""}
            placeholder="CS-221"
            className="font-mono"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`course-credit-${uid}`}>Credit hours</Label>
          <Input
            id={`course-credit-${uid}`}
            name="creditHours"
            type="number"
            inputMode="decimal"
            min={0}
            max={99}
            step="0.5"
            defaultValue={course?.creditHours ?? ""}
            placeholder="3"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`course-dept-${uid}`}>
            Department <span className="text-state-danger">*</span>
          </Label>
          <Select
            id={`course-dept-${uid}`}
            name="departmentId"
            required
            defaultValue={course?.departmentId ?? ""}
          >
            <option value="" disabled>
              Choose a department
            </option>
            {departmentOptions.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
                {department.isActive ? "" : " (archived)"}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`course-prog-${uid}`}>Program</Label>
          <Select
            id={`course-prog-${uid}`}
            name="programId"
            defaultValue={course?.programId ?? ""}
          >
            <option value="">No specific program</option>
            {programOptions.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
                {program.isActive ? "" : " (archived)"}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`course-active-${uid}`}>Status</Label>
        <Select
          id={`course-active-${uid}`}
          name="isActive"
          defaultValue={course ? (course.isActive ? "true" : "false") : "true"}
        >
          <option value="true">Active</option>
          <option value="false">Archived</option>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>{isEdit ? "Save changes" : "Add course"}</SubmitButton>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
