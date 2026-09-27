"use client";

import * as React from "react";

import { useFormState } from "react-dom";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormStatus, SubmitButton } from "@/features/admin/reference/reference-controls";
import { upsertPositionAction } from "@/features/admin/reference/actions";
import {
  EMPTY_REFERENCE_ACTION_STATE,
  PERSON_CATEGORY_LABELS,
  PERSON_CATEGORY_ORDER,
  type AdminPosition,
} from "@/features/admin/reference/types";

/*
  Position banane/edit karne ka form (README §31, §49).

  SECURITY: submit admin_upsert_position (is_admin()) tak jata hai. Manzoor-shuda
  titles ki list README §31 se hai; DB me ek blocklist bhi hai jo ghair-manzoor
  title ko rad kar deti hai. Yahan koi banned title hard-code nahi ki jati.
*/
export function PositionForm({ position }: { position?: AdminPosition }) {
  const [state, formAction] = useFormState(upsertPositionAction, EMPTY_REFERENCE_ACTION_STATE);
  const isEdit = Boolean(position);
  const uid = position?.id ?? "new";

  return (
    <form action={formAction} className="space-y-4">
      {isEdit ? <input type="hidden" name="id" value={position!.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`pos-title-${uid}`}>
            Title <span className="text-state-danger">*</span>
          </Label>
          <Input
            id={`pos-title-${uid}`}
            name="title"
            required
            maxLength={80}
            defaultValue={position?.title ?? ""}
            placeholder="Coordinator"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Approved titles: HOD, Coordinator, Dean, Associate Professor, Professor, Other.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`pos-rank-${uid}`}>Rank</Label>
          <Input
            id={`pos-rank-${uid}`}
            name="rank"
            type="number"
            inputMode="numeric"
            defaultValue={position?.rank ?? 0}
          />
          <p className="text-xs text-muted-foreground">Lower shows first.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`pos-category-${uid}`}>Applies to</Label>
          <Select
            id={`pos-category-${uid}`}
            name="category"
            defaultValue={position?.category ?? ""}
          >
            <option value="">Any category</option>
            {PERSON_CATEGORY_ORDER.map((value) => (
              <option key={value} value={value}>
                {PERSON_CATEGORY_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`pos-active-${uid}`}>Status</Label>
          <Select
            id={`pos-active-${uid}`}
            name="isActive"
            defaultValue={position ? (position.isActive ? "true" : "false") : "true"}
          >
            <option value="true">Active</option>
            <option value="false">Archived</option>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>{isEdit ? "Save changes" : "Add position"}</SubmitButton>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
