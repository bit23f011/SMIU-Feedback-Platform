"use client";

import * as React from "react";

import { useFormState, useFormStatus } from "react-dom";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  upsertCriterionAction,
} from "@/features/admin/criteria/actions";
import { EMPTY_CRITERION_ACTION_STATE } from "@/features/admin/criteria/form-state";
import {
  CRITERION_KIND_LABELS,
  CRITERION_KIND_ORDER,
  PERSON_CATEGORY_LABELS,
  PERSON_CATEGORY_ORDER,
  type AdminCriterion,
} from "@/features/admin/criteria/types";

/*
  Criterion banane/edit karne ka form (README §49).

  SECURITY: submit admin_upsert_criterion tak jata hai (is_admin()). Yeh form
  sirf shakal hai.

  Update par category/key/kind LOCK rehte hain (purane jawaabon ka matlab qaim
  rahe). Is liye edit mode me wo static dikhte hain aur current values hidden
  inputs se bheji jaati hain - RPC signature inhein maangti hai.
*/

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Save aria-hidden="true" />
      {pending ? "Saving" : isEdit ? "Save changes" : "Add criterion"}
    </Button>
  );
}

export function CriterionForm({ criterion }: { criterion?: AdminCriterion }) {
  const [state, formAction] = useFormState(upsertCriterionAction, EMPTY_CRITERION_ACTION_STATE);
  const isEdit = Boolean(criterion);
  const uid = criterion?.id ?? "new";

  return (
    <form action={formAction} className="space-y-4">
      {isEdit ? <input type="hidden" name="criterionId" value={criterion!.id} /> : null}

      {isEdit ? (
        <>
          {/* Locked identity: static display + hidden values for the RPC. */}
          <input type="hidden" name="category" value={criterion!.category} />
          <input type="hidden" name="key" value={criterion!.key} />
          <input type="hidden" name="kind" value={criterion!.kind} />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md bg-ink-50 p-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Category</dt>
              <dd className="text-foreground">{PERSON_CATEGORY_LABELS[criterion!.category]}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Key</dt>
              <dd className="font-mono text-[0.8125rem] text-foreground">{criterion!.key}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Answer type</dt>
              <dd className="text-foreground">{CRITERION_KIND_LABELS[criterion!.kind]}</dd>
            </div>
          </dl>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Category, key and answer type are fixed once a criterion exists, so past answers keep
            their meaning. To change those, retire this one and add a new criterion.
          </p>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={`category-${uid}`}>
              Category <span className="text-state-danger">*</span>
            </Label>
            <Select id={`category-${uid}`} name="category" defaultValue={PERSON_CATEGORY_ORDER[0]}>
              {PERSON_CATEGORY_ORDER.map((value) => (
                <option key={value} value={value}>
                  {PERSON_CATEGORY_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`key-${uid}`}>
              Key <span className="text-state-danger">*</span>
            </Label>
            <Input
              id={`key-${uid}`}
              name="key"
              required
              pattern="[a-z0-9_]+"
              placeholder="course_knowledge"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">Lowercase letters, numbers, underscores.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`kind-${uid}`}>
              Answer type <span className="text-state-danger">*</span>
            </Label>
            <Select id={`kind-${uid}`} name="kind" defaultValue={CRITERION_KIND_ORDER[0]}>
              {CRITERION_KIND_ORDER.map((value) => (
                <option key={value} value={value}>
                  {CRITERION_KIND_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`label-${uid}`}>
          Label <span className="text-state-danger">*</span>
        </Label>
        <Input
          id={`label-${uid}`}
          name="label"
          required
          maxLength={80}
          defaultValue={criterion?.label ?? ""}
          placeholder="Course knowledge"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`help-${uid}`}>Help text (optional)</Label>
        <Textarea
          id={`help-${uid}`}
          name="helpText"
          rows={2}
          maxLength={200}
          defaultValue={criterion?.helpText ?? ""}
          placeholder="A short hint shown under the question."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`sort-${uid}`}>Sort order</Label>
          <Input
            id={`sort-${uid}`}
            name="sortOrder"
            type="number"
            inputMode="numeric"
            defaultValue={criterion?.sortOrder ?? 0}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`active-${uid}`}>Status</Label>
          <Select
            id={`active-${uid}`}
            name="isActive"
            defaultValue={criterion ? (criterion.isActive ? "true" : "false") : "true"}
          >
            <option value="true">Active</option>
            <option value="false">Inactive (retired)</option>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton isEdit={isEdit} />
        {state.error ? (
          <span role="alert" className="text-sm text-state-danger">
            {state.error}
          </span>
        ) : state.ok ? (
          <span role="status" className="text-sm text-state-success">
            Saved.
          </span>
        ) : null}
      </div>
    </form>
  );
}
