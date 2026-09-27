"use client";

import * as React from "react";

import { useFormState } from "react-dom";
import { BookOpen, CalendarPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormStatus, SubmitButton } from "@/features/admin/people/person-controls";
import {
  addAssignmentAction,
  setAssignmentActiveAction,
} from "@/features/admin/people/actions";
import {
  EMPTY_ASSIGNMENT_ACTION_STATE,
  PERSON_CATEGORY_LABELS,
  PERSON_CATEGORY_ORDER,
  type AdminPersonAssignment,
} from "@/features/admin/people/types";
import type { AdminCourse, AdminSemester } from "@/features/admin/reference/types";

/*
  Assignments section: kaun sa banda kaun sa course kis semester me parhata hai
  (README §49). Yeh course-offering se judta hai, jis par students review dete hain.

  Hard delete nahi: archive/restore is_active se, taake purani reviews ka context
  na toote. Authority DB me (admin_add_assignment / admin_set_assignment_active,
  dono is_admin()). Yahan sirf forms.
*/

function AssignmentActiveButton({
  personId,
  assignmentId,
  isActive,
}: {
  personId: string;
  assignmentId: string;
  isActive: boolean;
}) {
  const [state, formAction] = useFormState(
    setAssignmentActiveAction,
    EMPTY_ASSIGNMENT_ACTION_STATE,
  );
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="active" value={isActive ? "false" : "true"} />
      <SubmitButton variant={isActive ? "outline" : "subtle"} pendingLabel="Saving" icon={null}>
        {isActive ? "Archive" : "Restore"}
      </SubmitButton>
      {state.error ? (
        <span role="alert" className="text-xs text-state-danger">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

function AssignmentRow({
  personId,
  assignment,
}: {
  personId: string;
  assignment: AdminPersonAssignment;
}) {
  return (
    <li className="list-none rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-foreground">{assignment.courseTitle}</h4>
            <Badge variant={assignment.isActive ? "brand" : "outline"}>
              {assignment.isActive ? "Active" : "Archived"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {assignment.semesterLabel}
            {assignment.section ? <span> · Section {assignment.section}</span> : null}
            {" · "}
            {PERSON_CATEGORY_LABELS[assignment.category]}
          </p>
        </div>
        <div className="shrink-0">
          <AssignmentActiveButton
            personId={personId}
            assignmentId={assignment.id}
            isActive={assignment.isActive}
          />
        </div>
      </div>
    </li>
  );
}

function AddAssignmentForm({
  personId,
  courses,
  semesters,
}: {
  personId: string;
  courses: AdminCourse[];
  semesters: AdminSemester[];
}) {
  const [state, formAction] = useFormState(addAssignmentAction, EMPTY_ASSIGNMENT_ACTION_STATE);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="personId" value={personId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="assign-course">
            Course <span className="text-state-danger">*</span>
          </Label>
          <Select id="assign-course" name="courseId" required defaultValue="">
            <option value="" disabled>
              Choose a course
            </option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code ? `${course.code} - ` : ""}
                {course.title}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="assign-semester">
            Semester <span className="text-state-danger">*</span>
          </Label>
          <Select id="assign-semester" name="semesterId" required defaultValue="">
            <option value="" disabled>
              Choose a semester
            </option>
            {semesters.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="assign-section">Section</Label>
          <Input id="assign-section" name="section" maxLength={20} placeholder="A" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="assign-category">Category</Label>
          <Select id="assign-category" name="category" defaultValue="">
            <option value="">Use profile category</option>
            {PERSON_CATEGORY_ORDER.map((value) => (
              <option key={value} value={value}>
                {PERSON_CATEGORY_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton icon={<CalendarPlus aria-hidden="true" />} pendingLabel="Adding">
          Add assignment
        </SubmitButton>
        <FormStatus state={state} okText="Assignment added." />
      </div>
    </form>
  );
}

export function PersonAssignmentsSection({
  personId,
  assignments,
  courses,
  semesters,
}: {
  personId: string;
  assignments: AdminPersonAssignment[];
  courses: AdminCourse[];
  semesters: AdminSemester[];
}) {
  const canAdd = courses.length > 0 && semesters.length > 0;

  return (
    <div className="space-y-5">
      {assignments.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title="No teaching assignments yet"
          description="Link this person to the courses and semesters they teach so students can review them there."
        />
      ) : (
        <ul className="list-none space-y-3">
          {assignments.map((assignment) => (
            <AssignmentRow key={assignment.id} personId={personId} assignment={assignment} />
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-dashed border-border p-4">
        <h4 className="mb-4 text-sm font-semibold text-foreground">Add an assignment</h4>
        {canAdd ? (
          <AddAssignmentForm personId={personId} courses={courses} semesters={semesters} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Add at least one course and one semester in Reference data before assigning teaching.
          </p>
        )}
      </div>
    </div>
  );
}
