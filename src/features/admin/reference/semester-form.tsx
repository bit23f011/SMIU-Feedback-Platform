"use client";

import * as React from "react";

import { useFormState } from "react-dom";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormStatus, SubmitButton } from "@/features/admin/reference/reference-controls";
import { upsertSemesterAction } from "@/features/admin/reference/actions";
import {
  EMPTY_REFERENCE_ACTION_STATE,
  SEMESTER_SEASON_LABELS,
  SEMESTER_SEASON_ORDER,
  type AdminSemester,
} from "@/features/admin/reference/types";

/*
  Semester banane/edit karne ka form (README §49).

  SECURITY: submit admin_upsert_semester (is_admin()) tak jata hai. Ek waqt me sirf
  ek "current" ho sakta hai (DB baaki clear kar deta hai). Semester par archive nahi
  hota; (season, year) unique rehta hai.
*/
export function SemesterForm({ semester }: { semester?: AdminSemester }) {
  const [state, formAction] = useFormState(upsertSemesterAction, EMPTY_REFERENCE_ACTION_STATE);
  const isEdit = Boolean(semester);
  const uid = semester?.id ?? "new";
  const currentYear = new Date().getFullYear();

  return (
    <form action={formAction} className="space-y-4">
      {isEdit ? <input type="hidden" name="id" value={semester!.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`sem-label-${uid}`}>
            Name <span className="text-state-danger">*</span>
          </Label>
          <Input
            id={`sem-label-${uid}`}
            name="label"
            required
            maxLength={60}
            defaultValue={semester?.label ?? ""}
            placeholder="Fall 2025"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`sem-season-${uid}`}>
            Season <span className="text-state-danger">*</span>
          </Label>
          <Select
            id={`sem-season-${uid}`}
            name="season"
            defaultValue={semester?.season ?? SEMESTER_SEASON_ORDER[0]}
          >
            {SEMESTER_SEASON_ORDER.map((value) => (
              <option key={value} value={value}>
                {SEMESTER_SEASON_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`sem-year-${uid}`}>
            Year <span className="text-state-danger">*</span>
          </Label>
          <Input
            id={`sem-year-${uid}`}
            name="year"
            type="number"
            inputMode="numeric"
            min={2000}
            max={2100}
            required
            defaultValue={semester?.year ?? currentYear}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`sem-start-${uid}`}>Starts on</Label>
          <Input
            id={`sem-start-${uid}`}
            name="startsOn"
            type="date"
            defaultValue={semester?.startsOn ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`sem-end-${uid}`}>Ends on</Label>
          <Input
            id={`sem-end-${uid}`}
            name="endsOn"
            type="date"
            defaultValue={semester?.endsOn ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`sem-current-${uid}`}>Current semester</Label>
          <Select
            id={`sem-current-${uid}`}
            name="isCurrent"
            defaultValue={semester?.isCurrent ? "true" : "false"}
          >
            <option value="false">No</option>
            <option value="true">Yes, this is current</option>
          </Select>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Only one semester can be current at a time. Setting this one to current will clear the flag
        on any other.
      </p>

      <div className="flex items-center gap-3">
        <SubmitButton>{isEdit ? "Save changes" : "Add semester"}</SubmitButton>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
