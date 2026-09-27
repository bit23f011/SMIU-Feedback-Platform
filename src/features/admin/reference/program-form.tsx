"use client";

import * as React from "react";

import { useFormState } from "react-dom";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormStatus, SubmitButton } from "@/features/admin/reference/reference-controls";
import { upsertProgramAction } from "@/features/admin/reference/actions";
import {
  EMPTY_REFERENCE_ACTION_STATE,
  PROGRAM_LEVEL_LABELS,
  PROGRAM_LEVEL_ORDER,
  type AdminDepartment,
  type AdminProgram,
} from "@/features/admin/reference/types";

/*
  Program banane/edit karne ka form (README §49).

  SECURITY: submit admin_upsert_program (is_admin()) tak jata hai. Department ek
  active list se aata hai; edit ke waqt agar mojooda department archived ho to bhi
  wo option me rehta hai (warna form us se mismatch ho jata).
*/
export function ProgramForm({
  program,
  departments,
}: {
  program?: AdminProgram;
  departments: AdminDepartment[];
}) {
  const [state, formAction] = useFormState(upsertProgramAction, EMPTY_REFERENCE_ACTION_STATE);
  const isEdit = Boolean(program);
  const uid = program?.id ?? "new";

  const departmentOptions = departments.filter(
    (department) => department.isActive || department.id === program?.departmentId,
  );

  return (
    <form action={formAction} className="space-y-4">
      {isEdit ? <input type="hidden" name="id" value={program!.id} /> : null}

      <div className="space-y-1.5">
        <Label htmlFor={`prog-name-${uid}`}>
          Name <span className="text-state-danger">*</span>
        </Label>
        <Input
          id={`prog-name-${uid}`}
          name="name"
          required
          maxLength={140}
          defaultValue={program?.name ?? ""}
          placeholder="BS Computer Science"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`prog-short-${uid}`}>Short name</Label>
          <Input
            id={`prog-short-${uid}`}
            name="shortName"
            maxLength={40}
            defaultValue={program?.shortName ?? ""}
            placeholder="BSCS"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`prog-level-${uid}`}>Level</Label>
          <Select
            id={`prog-level-${uid}`}
            name="level"
            defaultValue={program?.level ?? PROGRAM_LEVEL_ORDER[0]}
          >
            {PROGRAM_LEVEL_ORDER.map((value) => (
              <option key={value} value={value}>
                {PROGRAM_LEVEL_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`prog-dept-${uid}`}>
            Department <span className="text-state-danger">*</span>
          </Label>
          <Select
            id={`prog-dept-${uid}`}
            name="departmentId"
            required
            defaultValue={program?.departmentId ?? ""}
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
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`prog-active-${uid}`}>Status</Label>
        <Select
          id={`prog-active-${uid}`}
          name="isActive"
          defaultValue={program ? (program.isActive ? "true" : "false") : "true"}
        >
          <option value="true">Active</option>
          <option value="false">Archived</option>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>{isEdit ? "Save changes" : "Add program"}</SubmitButton>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
