"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { deleteDuplicateCoursesAction } from "@/features/admin/reference/duplicate-courses-action";

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? "Removing duplicates…" : "Delete duplicate courses"}
    </Button>
  );
}

export function DuplicateCoursesForm() {
  const [state, action] = useFormState(deleteDuplicateCoursesAction, {
    ok: false,
  });
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <DeleteButton />
      {state.error ? (
        <p role="alert" className="text-sm text-state-danger">
          {state.error}
        </p>
      ) : state.ok ? (
        <p role="status" className="text-sm text-state-success">
          {state.deleted
            ? `${state.deleted} duplicate ${state.deleted === 1 ? "course" : "courses"} removed.`
            : "No duplicate courses found."}
        </p>
      ) : null}
    </form>
  );
}
