"use client";

import * as React from "react";

import { useFormState } from "react-dom";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus, SubmitButton } from "@/features/admin/people/person-controls";
import { updatePersonAction } from "@/features/admin/people/actions";
import {
  EMPTY_PERSON_ACTION_STATE,
  PERSON_GENDER_LABELS,
  PERSON_GENDER_ORDER,
  TEACHER_TYPE_LABELS,
  TEACHER_TYPE_ORDER,
  type AdminPersonDetail,
} from "@/features/admin/people/types";

/*
  Person ke core fields edit karne ka form (README §49-§50).

  LOCK: slug aur primary_category yahan se nahi badalte (identity/URL stable). Woh
  DB me tay hain, is liye form me sirf dikhaye jaate hain, submit nahi hote.
  is_active bhi yahan se nahi (deactivate alag explicit step hai, §51).

  teacher_type sirf teacher category par dikhta hai. Verify toggle profile ko
  "verified" mark karta hai (asli banda confirm ho gaya), delete/hide se alag hai.
  Authority DB me: admin_update_person (is_admin()).
*/
export function EditPersonForm({ person }: { person: AdminPersonDetail }) {
  const [state, formAction] = useFormState(updatePersonAction, EMPTY_PERSON_ACTION_STATE);
  const isTeacher = person.primaryCategory === "teacher";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={person.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="edit-name">
            Full name <span className="text-state-danger">*</span>
          </Label>
          <Input
            id="edit-name"
            name="fullName"
            required
            maxLength={160}
            defaultValue={person.fullName}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-display">Display name</Label>
          <Input
            id="edit-display"
            name="displayName"
            maxLength={160}
            defaultValue={person.displayName ?? ""}
            placeholder={person.fullName}
          />
          <p className="text-xs text-muted-foreground">Shown publicly instead of the full name.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="edit-prefix">Title prefix</Label>
          <Input
            id="edit-prefix"
            name="titlePrefix"
            maxLength={40}
            defaultValue={person.titlePrefix ?? ""}
            placeholder="Dr."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-gender">Gender</Label>
          <Select id="edit-gender" name="gender" defaultValue={person.gender ?? ""}>
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
          <Label htmlFor="edit-teacher-type">Teacher type</Label>
          <Select
            id="edit-teacher-type"
            name="teacherType"
            defaultValue={person.teacherType ?? ""}
          >
            <option value="">Not specified</option>
            {TEACHER_TYPE_ORDER.map((value) => (
              <option key={value} value={value}>
                {TEACHER_TYPE_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="edit-headline">Headline</Label>
        <Input
          id="edit-headline"
          name="headline"
          maxLength={200}
          defaultValue={person.headline ?? ""}
          placeholder="Associate Professor, Software Engineering"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-bio">Bio</Label>
        <Textarea
          id="edit-bio"
          name="bio"
          rows={4}
          maxLength={2000}
          defaultValue={person.bio ?? ""}
          placeholder="A short public description."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-verified">Verification</Label>
        <Select
          id="edit-verified"
          name="isVerified"
          defaultValue={person.isVerified ? "true" : "false"}
        >
          <option value="false">Not verified</option>
          <option value="true">Verified</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          Verified marks that this is a real, confirmed person. It does not hide or show the profile.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <SubmitButton>Save changes</SubmitButton>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
