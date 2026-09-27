"use client";

import * as React from "react";

import { useFormState } from "react-dom";
import { Ban, Undo2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus, SubmitButton } from "@/features/admin/people/person-controls";
import { setPersonActiveAction } from "@/features/admin/reports/actions";
import { EMPTY_REPORT_ACTION_STATE } from "@/features/admin/reports/form-state";

/*
  Profile ko deactivate / reactivate karne ka explicit step (README §51).

  ASOOL: yeh edit se ALAG hai aur reason zaroori hai. Deactivate karna delete nahi
  hai - profile public site se chhup jata hai magar data (aur reviews) mehfooz
  rehta hai. Wahi action reports queue par bhi use hoti hai, is liye behaviour aur
  audit ek jaise rehte hain. Authority DB me: set_person_active (is_admin()).
*/
export function PersonActiveForm({
  personId,
  personSlug,
  isActive,
}: {
  personId: string;
  personSlug: string;
  isActive: boolean;
}) {
  const [state, formAction] = useFormState(setPersonActiveAction, EMPTY_REPORT_ACTION_STATE);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="personSlug" value={personSlug} />
      <input type="hidden" name="active" value={isActive ? "false" : "true"} />

      <div className="space-y-1.5">
        <Label htmlFor="active-reason">
          {isActive ? "Reason for deactivating" : "Reason for reactivating"}{" "}
          <span className="text-state-danger">*</span>
        </Label>
        <Textarea
          id="active-reason"
          name="reason"
          rows={2}
          required
          maxLength={1000}
          placeholder={
            isActive
              ? "Why this profile should be hidden from the public site."
              : "Why this profile should be visible again."
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {isActive ? (
          <SubmitButton variant="destructive" pendingLabel="Working" icon={<Ban aria-hidden="true" />}>
            Deactivate profile
          </SubmitButton>
        ) : (
          <SubmitButton variant="outline" pendingLabel="Working" icon={<Undo2 aria-hidden="true" />}>
            Reactivate profile
          </SubmitButton>
        )}
        <FormStatus
          state={state}
          okText={
            isActive
              ? "Saved. The profile is now hidden from the public site."
              : "Saved. The profile is visible again."
          }
        />
      </div>
    </form>
  );
}
