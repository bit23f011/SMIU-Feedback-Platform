"use client";

import * as React from "react";

import { useFormState } from "react-dom";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormStatus, SubmitButton } from "@/features/admin/reference/reference-controls";
import { upsertDepartmentAction } from "@/features/admin/reference/actions";
import {
  EMPTY_REFERENCE_ACTION_STATE,
  type AdminDepartment,
} from "@/features/admin/reference/types";

/*
  Department banane/edit karne ka form (README §49).

  SECURITY: submit admin_upsert_department (is_admin()) tak jata hai. Slug create
  par lock rehta hai, is liye rename URL nahi torta. Band karne ke liye Status ko
  Archived karo (hard delete nahi).
*/
export function DepartmentForm({ department }: { department?: AdminDepartment }) {
  const [state, formAction] = useFormState(upsertDepartmentAction, EMPTY_REFERENCE_ACTION_STATE);
  const isEdit = Boolean(department);
  const uid = department?.id ?? "new";

  return (
    <form action={formAction} className="space-y-4">
      {isEdit ? <input type="hidden" name="id" value={department!.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`dept-name-${uid}`}>
            Name <span className="text-state-danger">*</span>
          </Label>
          <Input
            id={`dept-name-${uid}`}
            name="name"
            required
            maxLength={120}
            defaultValue={department?.name ?? ""}
            placeholder="Computer Science"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`dept-short-${uid}`}>Short name</Label>
          <Input
            id={`dept-short-${uid}`}
            name="shortName"
            maxLength={40}
            defaultValue={department?.shortName ?? ""}
            placeholder="CS"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`dept-active-${uid}`}>Status</Label>
        <Select
          id={`dept-active-${uid}`}
          name="isActive"
          defaultValue={department ? (department.isActive ? "true" : "false") : "true"}
        >
          <option value="true">Active</option>
          <option value="false">Archived</option>
        </Select>
      </div>

      {isEdit ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          The web address is fixed once a department exists, so renaming never breaks a saved link.
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <SubmitButton>{isEdit ? "Save changes" : "Add department"}</SubmitButton>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
