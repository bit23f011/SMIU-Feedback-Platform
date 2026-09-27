"use client";

import * as React from "react";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/form-field";
import { deleteReviewAction } from "@/features/reviews/actions";
import { EMPTY_REVIEW_STATE } from "@/features/reviews/form-state";

/*
  Review delete karne ka do-qadam confirm.

  Dialog ke bajaye inline confirm rakha hai: keyboard aur screen reader dono par
  yeh sabse kam tootne wala pattern hai, aur user ko page chhorna nahi parta.

  Saaf batana zaroori hai ke delete WAAPAS nahi hota aur us banday par dobara
  review nahi likhi ja sakti - DB me mapping qayam rehti hai taake koi delete
  karke edit-limit reset na kar le.
*/

function ConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="destructive" size="sm" disabled={pending}>
      {pending ? "Deleting…" : "Yes, delete it"}
    </Button>
  );
}

export function DeleteReviewButton({
  reviewId,
  personSlug,
}: {
  reviewId: string;
  personSlug: string;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const [state, formAction] = useFormState(deleteReviewAction, EMPTY_REVIEW_STATE);

  if (!confirming) {
    return (
      <div className="space-y-2">
        <FormError message={state.formError} />
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
          Delete review
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-state-danger/25 bg-state-danger-soft p-3">
      <FormError message={state.formError} />
      <p className="text-sm leading-relaxed text-state-danger">
        Delete this review permanently? You will not be able to review this person again.
      </p>
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="reviewId" value={reviewId} />
        <input type="hidden" name="personSlug" value={personSlug} />
        <ConfirmButton />
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </form>
    </div>
  );
}
