"use client";

import * as React from "react";

import { useFormState, useFormStatus } from "react-dom";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  EMPTY_REFERENCE_ACTION_STATE,
  type ReferenceActionState,
} from "@/features/admin/reference/types";

/*
  Reference-data forms ke chhote shared client bits.

  SECURITY: yeh sirf UI hai. Har submit ek admin RPC (is_admin()) tak jata hai;
  faisla aur audit DB me hota hai. Yahan sirf pending state aur safe message
  dikhaya jata hai.
*/

/** Submit button jo pending par lock ho jata hai. */
export function SubmitButton({
  children,
  pendingLabel = "Saving",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Save aria-hidden="true" />
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** ok/error dono action states ke liye chalta hai (sirf ok+error chahiye). */
export function FormStatus({ state }: { state: { ok: boolean; error?: string } }) {
  if (state.error) {
    return (
      <span role="alert" className="text-sm text-state-danger">
        {state.error}
      </span>
    );
  }
  if (state.ok) {
    return (
      <span role="status" className="text-sm text-state-success">
        Saved.
      </span>
    );
  }
  return null;
}

type ReferenceAction = (
  previous: ReferenceActionState,
  formData: FormData,
) => Promise<ReferenceActionState>;

function ToggleButton({ isActive }: { isActive: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant={isActive ? "outline" : "subtle"}
      disabled={pending}
    >
      {pending ? "Saving" : isActive ? "Archive" : "Restore"}
    </Button>
  );
}

/*
  Archive / Restore ek hi generic form se. Server action prop ke tor par server
  component se aata hai (Next me server action pass karna theek hai). Hard delete
  kabhi nahi: sirf is_active flip hota hai, is liye FKs mehfooz rehte hain.
*/
export function ActiveToggleForm({
  action,
  id,
  isActive,
}: {
  action: ReferenceAction;
  id: string;
  isActive: boolean;
}) {
  const [state, formAction] = useFormState(action, EMPTY_REFERENCE_ACTION_STATE);
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={isActive ? "false" : "true"} />
      <ToggleButton isActive={isActive} />
      {state.error ? (
        <span role="alert" className="text-xs text-state-danger">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
