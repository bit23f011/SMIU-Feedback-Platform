"use client";

import * as React from "react";

import { useFormState, useFormStatus } from "react-dom";
import { Lock } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/features/auth/form-field";
import {
  submitReviewAction,
  updateReviewAction,
} from "@/features/reviews/actions";
import { EMPTY_REVIEW_STATE } from "@/features/reviews/form-state";
import { OverallInput, StarInput, YesNoInput } from "@/features/reviews/star-input";
import { ReviewContextPicker } from "@/features/reviews/review-context-picker";
import {
  COMMENT_MAX_CHARS,
  COMMENT_MAX_WORDS,
  countWords,
  formatReviewContext,
  type MyReviewDetail,
  type ReviewCriterion,
  type ReviewLimits,
  type ReviewOption,
} from "@/features/reviews/types";

/*
  Review likhne/edit karne ka form.

  Sawal (criteria) DB se aate hain, yahan hard-code nahi. Is liye admin baad me
  sawal badal de to form khud badal jayega aur purani reviews ka matlab bhi
  mehfooz rehta hai.

  ANONYMITY: is form me kahin bhi user ka naam/email/id nahi bheji jati.
  Server action `auth.uid()` DB ke andar se parhti hai. `reviews` table me
  author ka column hai hi nahi - is liye publish hone ke baad identity kisi
  query se nikal hi nahi sakti.
*/

export interface ReviewFormProps {
  personId: string;
  personSlug: string;
  personName: string;
  criteria: ReviewCriterion[];
  limits: ReviewLimits;
  /** Chunne ke liye jaiz course + semester jorey (sirf naye review par). */
  options?: ReviewOption[];
  /** Category course se bandhi hai ya nahi (README §25). */
  needsCourse?: boolean;
  /** Edit mode me maujooda review. */
  existing?: MyReviewDetail | null;
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending
        ? mode === "create"
          ? "Posting…"
          : "Saving…"
        : mode === "create"
          ? "Post review"
          : "Save changes"}
    </Button>
  );
}

/*
  Comment field. README §21: had 150 WORDS hai, characters nahi.

  Counter aur validation DONO `countWords()` use karte hain (wahi function
  server bhi use karta hai), is liye "counter 150 keh raha tha magar submit
  reject ho gaya" wala masla nahi hota.

  `maxLength` yahan words ki had nahi, sirf ek upar wali char deewar hai.
*/
function CommentField({
  defaultValue,
  errors,
}: {
  defaultValue: string;
  errors?: string[];
}) {
  const [words, setWords] = React.useState(() => countWords(defaultValue));
  const hasError = Boolean(errors && errors.length > 0);
  const overLimit = words > COMMENT_MAX_WORDS;

  return (
    <div className="space-y-1.5">
      <label htmlFor="review-comment" className="text-sm font-medium leading-none text-ink-800">
        Your experience{" "}
        <span className="font-normal text-muted-foreground">(optional, max {COMMENT_MAX_WORDS} words)</span>
      </label>
      <p id="review-comment-hint" className="text-xs leading-relaxed text-muted-foreground">
        Write about teaching, behaviour or helpfulness. Do not include names, roll numbers,
        phone numbers or anything that could identify you or someone else.
      </p>
      <Textarea
        id="review-comment"
        name="comment"
        rows={5}
        maxLength={COMMENT_MAX_CHARS}
        defaultValue={defaultValue}
        aria-invalid={hasError || overLimit}
        aria-describedby="review-comment-hint review-comment-count"
        onChange={(event) => setWords(countWords(event.target.value))}
        placeholder="Leave this empty if you only want to rate."
      />
      <p
        id="review-comment-count"
        className={`text-xs tabular-nums ${overLimit ? "font-medium text-state-danger" : "text-muted-foreground"}`}
      >
        {words} / {COMMENT_MAX_WORDS} words
        {overLimit ? ` (remove ${words - COMMENT_MAX_WORDS})` : ""}
      </p>
      {hasError ? (
        <p role="alert" className="text-xs font-medium text-state-danger">
          {errors![0]}
        </p>
      ) : null}
    </div>
  );
}

export function ReviewForm({
  personId,
  personSlug,
  personName,
  criteria,
  limits,
  options = [],
  needsCourse = false,
  existing = null,
}: ReviewFormProps) {
  const mode: "create" | "edit" = existing ? "edit" : "create";
  const action = existing ? updateReviewAction : submitReviewAction;
  const [state, formAction] = useFormState(action, EMPTY_REVIEW_STATE);
  const existingContext = existing ? formatReviewContext(existing) : null;

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormError message={state.formError} />

      {state.ok ? (
        <Alert tone="success">
          <AlertDescription>
            {mode === "create"
              ? "Your review is posted anonymously."
              : "Your review has been updated."}
          </AlertDescription>
        </Alert>
      ) : null}

      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="personSlug" value={personSlug} />
      {existing ? <input type="hidden" name="reviewId" value={existing.id} /> : null}

      {mode === "create" ? (
        <ReviewContextPicker
          options={options}
          needsCourse={needsCourse}
          fieldErrors={state.fieldErrors}
        />
      ) : existingContext ? (
        /*
          Edit mode me course/semester sirf parhne ke liye hain. Inhein badalne
          dena uniqueness ke rule (README §25) me pichhle darwaze se ghusna hai,
          is liye update_my_review in ko chhoota hi nahi.
        */
        <p className="rounded-md border border-border bg-ink-50/60 px-3 py-2 text-xs text-muted-foreground">
          This review is linked to {existingContext}. That cannot be changed.
        </p>
      ) : null}

      <OverallInput
        name="overall"
        legend={`Overall, how would you rate ${personName}?`}
        hint="One number for the whole experience, on a scale of 1 to 10."
        defaultValue={existing?.overallRating ?? null}
        errors={state.fieldErrors?.overall}
      />

      <div className="space-y-5 border-t border-border pt-5">
        {criteria.map((criterion) => {
          const saved = existing?.answers[criterion.key];

          return criterion.kind === "star" ? (
            <StarInput
              key={criterion.id}
              name={`c_${criterion.key}`}
              legend={criterion.label}
              hint={criterion.helpText}
              defaultValue={saved?.star ?? null}
              errors={state.fieldErrors?.[`c_${criterion.key}`]}
            />
          ) : (
            <YesNoInput
              key={criterion.id}
              name={`c_${criterion.key}`}
              legend={criterion.label}
              hint={criterion.helpText}
              defaultValue={saved?.yes ?? null}
              errors={state.fieldErrors?.[`c_${criterion.key}`]}
            />
          );
        })}
      </div>

      <div className="border-t border-border pt-5">
        <CommentField
          defaultValue={existing?.comment ?? ""}
          errors={state.fieldErrors?.comment}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton mode={mode} />
        <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <Lock aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          <span>
            Posted anonymously.{" "}
            {mode === "create"
              ? `You can edit it ${limits.maxEdits} ${limits.maxEdits === 1 ? "time" : "times"} afterwards.`
              : `${existing?.editsLeft ?? 0} ${existing?.editsLeft === 1 ? "edit" : "edits"} left.`}
          </span>
        </p>
      </div>
    </form>
  );
}
