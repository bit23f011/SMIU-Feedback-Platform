"use client";

import * as React from "react";

import { useFormState, useFormStatus } from "react-dom";
import { Lock, Send } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormError } from "@/features/auth/form-field";
import {
  submitWebsiteFeedbackAction,
} from "@/features/feedback/actions";
import { EMPTY_FEEDBACK_FORM_STATE } from "@/features/feedback/form-state";
import {
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_TYPE_ORDER,
} from "@/features/admin/feedback/types";

/*
  Website feedback bhejne ka PUBLIC form (README §56 - §59).

  Yeh site ke BAARE me feedback hai - kisi teacher/profile ke against report
  NAHI. Koi anonymity/identity yahan nahi bheji jati; contact email sirf tab
  jab user khud follow-up chahe, aur wo bhi kabhi public par nahi (README §59).

  AUTHORITY yahan nahi: submit_website_feedback (server) har rule dobara jaanchti
  hai. Yeh form sirf shakal hai + achhe messages deta hai.
*/

/* Rating 1-5 (README §57). RatingStars 0-10 scale ka hai, is liye yahan Select. */
const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      <Send aria-hidden="true" />
      {pending ? "Sending" : "Send feedback"}
    </Button>
  );
}

function MessageField({ errors }: { errors?: string[] }) {
  const [count, setCount] = React.useState(0);
  const hasError = Boolean(errors && errors.length > 0);
  const overLimit = count > FEEDBACK_MESSAGE_MAX;
  const errorId = "feedback-message-error";
  const hintId = "feedback-message-hint";
  const countId = "feedback-message-count";

  const describedBy =
    [hasError ? errorId : null, hintId, countId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor="feedback-message" className="text-sm font-medium leading-none text-ink-800">
        Your message <span className="text-state-danger">*</span>
      </label>
      <p id={hintId} className="text-xs leading-relaxed text-muted-foreground">
        Tell us what happened, what you expected, or what could be better. Please do not include
        passwords or anyone else&apos;s private details.
      </p>
      <Textarea
        id="feedback-message"
        name="message"
        rows={6}
        required
        maxLength={FEEDBACK_MESSAGE_MAX}
        aria-invalid={hasError || overLimit}
        aria-describedby={describedBy}
        onChange={(event) => setCount(event.target.value.length)}
        placeholder="Write your feedback here."
      />
      <p
        id={countId}
        className={`text-xs tabular-nums ${overLimit ? "font-medium text-state-danger" : "text-muted-foreground"}`}
      >
        {count} / {FEEDBACK_MESSAGE_MAX} characters
      </p>
      {hasError ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-state-danger">
          {errors![0]}
        </p>
      ) : null}
    </div>
  );
}

export function FeedbackForm() {
  const [state, formAction] = useFormState(
    submitWebsiteFeedbackAction,
    EMPTY_FEEDBACK_FORM_STATE,
  );

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormError message={state.formError} />

      {state.ok ? (
        <Alert tone="success">
          <AlertTitle>Thank you for your feedback</AlertTitle>
          <AlertDescription>
            It has reached our team. We read every message, though we cannot always reply. You may
            close this page, or send another note below.
          </AlertDescription>
        </Alert>
      ) : null}

      <FormField
        id="feedback-type"
        label="Type of feedback"
        errors={state.fieldErrors?.type}
      >
        {(props) => (
          <Select {...props} name="type" defaultValue={FEEDBACK_TYPE_ORDER[0]}>
            {FEEDBACK_TYPE_ORDER.map((value) => (
              <option key={value} value={value}>
                {FEEDBACK_TYPE_LABELS[value]}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      <FormField
        id="feedback-rating"
        label="How was your experience? (optional)"
        hint="A quick 1 to 5, where 5 is best. Leave it blank if you would rather not say."
        errors={state.fieldErrors?.rating}
      >
        {(props) => (
          <Select {...props} name="rating" defaultValue="">
            <option value="">No rating</option>
            {RATING_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      <MessageField errors={state.fieldErrors?.message} />

      <FormField
        id="feedback-contact-email"
        label="Contact email (optional)"
        hint="Only if you would like a reply. It is never shown publicly and never affects any rating."
        errors={state.fieldErrors?.contactEmail}
      >
        {(props) => (
          <Input
            {...props}
            name="contactEmail"
            type="email"
            autoComplete="email"
            maxLength={254}
            placeholder="you@example.com"
          />
        )}
      </FormField>

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton />
        <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <Lock aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          <span>This is about the SMIU Feedback Website, and is kept separate from teacher ratings.</span>
        </p>
      </div>
    </form>
  );
}
