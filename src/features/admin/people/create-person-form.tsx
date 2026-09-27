"use client";

import * as React from "react";

import Link from "next/link";
import { useFormState } from "react-dom";
import { UserPlus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormStatus, SubmitButton } from "@/features/admin/people/person-controls";
import { createPersonAction } from "@/features/admin/people/actions";
import {
  EMPTY_PERSON_ACTION_STATE,
  PERSON_CATEGORY_LABELS,
  PERSON_CATEGORY_ORDER,
  PERSON_GENDER_LABELS,
  PERSON_GENDER_ORDER,
  TEACHER_TYPE_LABELS,
  TEACHER_TYPE_ORDER,
  isPersonCategory,
  type PersonCategory,
} from "@/features/admin/people/types";
import type { AdminDepartment, AdminPosition } from "@/features/admin/reference/types";

/*
  Naya person banane ka form (README §28-§30).

  Ek person = ek public profile. slug aur primary_category create par tay hote hain
  aur baad me lock rehte hain, is liye yeh form ehtiyaat se banaya gaya hai.

  Client par sirf UX: category ke hisaab se teacher-type dikhana/chhupana aur
  internal-teacher par department zaroori ka hint. Asli validation aur authority DB
  me hai (admin_create_person, is_admin()). teacher_type sirf Teacher par bhejta hai.
*/
export function CreatePersonForm({
  departments,
  positions,
  defaultCategory,
}: {
  departments: AdminDepartment[];
  positions: AdminPosition[];
  defaultCategory?: PersonCategory;
}) {
  const [state, formAction] = useFormState(createPersonAction, EMPTY_PERSON_ACTION_STATE);

  const initialCategory: PersonCategory | "" = defaultCategory ?? "";
  const [category, setCategory] = React.useState<PersonCategory | "">(initialCategory);
  const [teacherType, setTeacherType] = React.useState<string>("");

  const isTeacher = category === "teacher";
  const needsDepartment = isTeacher && teacherType === "internal";

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="person-name">
          Full name <span className="text-state-danger">*</span>
        </Label>
        <Input
          id="person-name"
          name="fullName"
          required
          maxLength={160}
          placeholder="Ayesha Khan"
          autoComplete="off"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="person-category">
            Category <span className="text-state-danger">*</span>
          </Label>
          <Select
            id="person-category"
            name="category"
            required
            defaultValue={initialCategory}
            onChange={(event) => {
              const next = event.target.value;
              setCategory(isPersonCategory(next) ? next : "");
            }}
          >
            <option value="" disabled>
              Choose a category
            </option>
            {PERSON_CATEGORY_ORDER.map((value) => (
              <option key={value} value={value}>
                {PERSON_CATEGORY_LABELS[value]}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">This is fixed once the person is created.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="person-gender">Gender</Label>
          <Select id="person-gender" name="gender" defaultValue="">
            <option value="">Not specified</option>
            {PERSON_GENDER_ORDER.map((value) => (
              <option key={value} value={value}>
                {PERSON_GENDER_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isTeacher ? (
        <div className="space-y-1.5">
          <Label htmlFor="person-teacher-type">
            Teacher type <span className="text-state-danger">*</span>
          </Label>
          <Select
            id="person-teacher-type"
            name="teacherType"
            defaultValue=""
            onChange={(event) => setTeacherType(event.target.value)}
          >
            <option value="" disabled>
              Choose a teacher type
            </option>
            {TEACHER_TYPE_ORDER.map((value) => (
              <option key={value} value={value}>
                {TEACHER_TYPE_LABELS[value]}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Teacher type is only asked for teachers, never for lab instructors.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="person-department">
            Department{needsDepartment ? <span className="text-state-danger"> *</span> : null}
          </Label>
          <Select id="person-department" name="departmentId" defaultValue="">
            <option value="">No department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
          {needsDepartment ? (
            <p className="text-xs text-muted-foreground">
              An internal teacher joins their department faculty, so a department is required.
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="person-position">Position</Label>
          <Select id="person-position" name="positionId" defaultValue="">
            <option value="">No position</option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.title}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="person-headline">Headline</Label>
        <Input
          id="person-headline"
          name="headline"
          maxLength={200}
          placeholder="Associate Professor, Software Engineering"
        />
        <p className="text-xs text-muted-foreground">
          A short line shown under the name. Optional.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <SubmitButton icon={<UserPlus aria-hidden="true" />} pendingLabel="Creating">
          Create person
        </SubmitButton>
        {state.ok && state.personId ? (
          <span role="status" className="text-sm text-state-success">
            Created.{" "}
            <Link
              href={`/admin/people/${state.personId}`}
              className="font-medium text-primary underline underline-offset-2"
            >
              Open profile
            </Link>
          </span>
        ) : (
          <FormStatus state={state} okText="Created." />
        )}
      </div>
    </form>
  );
}
