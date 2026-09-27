"use client";

import * as React from "react";

import { useFormState, useFormStatus } from "react-dom";
import { Mail, Star, Bookmark } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  updateFeedbackAction,
} from "@/features/admin/feedback/actions";
import { EMPTY_FEEDBACK_ACTION_STATE } from "@/features/admin/feedback/form-state";
import {
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_TYPE_LABELS,
  type AdminFeedback,
} from "@/features/admin/feedback/types";

/*
  Ek website-feedback ka card (README §56 - §59).

  SECURITY: yeh card sirf controls dikhata hai. Har submit `update_feedback` tak
  jata hai jo khud is_admin() check karti hai. Yeh feedback kisi teacher rating
  ya ranking par asar NAHI daalta - alag dataset hai.

  PRIVACY (README §58): bhejne wale ki shanaakht kabhi nahi aati. Sirf
  "from a student" ya "from a visitor". contact_email agar hai to sirf admin ko,
  follow-up ke liye - public par kabhi nahi.
*/

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* README §57: experience rating 1 se 5. RatingStars (0-10 overall) yahan theek nahi. */
function ExperienceStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((step) => (
          <Star
            key={step}
            strokeWidth={1.75}
            className={cn(
              "size-4",
              step <= rating ? "fill-coral-400 text-coral-500" : "fill-transparent text-ink-300",
            )}
          />
        ))}
      </span>
      <span className="text-[0.8125rem] font-medium text-foreground">
        {rating}
        <span className="font-normal text-muted-foreground">/5</span>
      </span>
      <span className="sr-only">Rated {rating} out of 5</span>
    </span>
  );
}

function StatusSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? "Saving" : "Update status"}
    </Button>
  );
}

function ImportantSubmit({ isImportant }: { isImportant: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant={isImportant ? "subtle" : "ghost"}
      disabled={pending}
    >
      <Bookmark aria-hidden="true" className={cn(isImportant && "fill-current")} />
      {pending ? "Saving" : isImportant ? "Unmark important" : "Mark important"}
    </Button>
  );
}

export function FeedbackCard({ feedback }: { feedback: AdminFeedback }) {
  const [statusState, statusForm] = useFormState(
    updateFeedbackAction,
    EMPTY_FEEDBACK_ACTION_STATE,
  );
  const [importantState, importantForm] = useFormState(
    updateFeedbackAction,
    EMPTY_FEEDBACK_ACTION_STATE,
  );

  const created = formatDate(feedback.createdAt);
  const anyError = statusState.error ?? importantState.error;
  const anyOk = statusState.ok || importantState.ok;

  return (
    <li className="list-none">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">{FEEDBACK_TYPE_LABELS[feedback.type]}</Badge>
              <Badge variant="default">{FEEDBACK_STATUS_LABELS[feedback.status]}</Badge>
              <Badge variant="outline">
                {feedback.fromStudent ? "From a student" : "From a visitor"}
              </Badge>
              {feedback.isImportant ? <Badge variant="category">Important</Badge> : null}
            </div>
            {feedback.rating !== null ? <ExperienceStars rating={feedback.rating} /> : null}
          </div>

          {created ? (
            <p className="shrink-0 text-xs text-muted-foreground">Sent {created}</p>
          ) : null}
        </div>

        <blockquote className="mt-4 whitespace-pre-wrap border-l-2 border-border pl-4 text-sm leading-relaxed text-ink-700">
          {feedback.message}
        </blockquote>

        {feedback.contactEmail ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail aria-hidden="true" className="size-3.5" />
            <span className="break-all">{feedback.contactEmail}</span>
            <span aria-hidden="true">·</span>
            <span>for a reply only, never shown publicly</span>
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">No contact email was given.</p>
        )}

        <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-4 border-t border-border pt-4">
          <form action={statusForm} className="flex items-end gap-2">
            <input type="hidden" name="feedbackId" value={feedback.id} />
            <div className="space-y-1.5">
              <Label htmlFor={`status-${feedback.id}`} className="text-xs">
                Status
              </Label>
              <Select
                id={`status-${feedback.id}`}
                name="status"
                defaultValue={feedback.status}
                className="h-9 w-40"
              >
                {FEEDBACK_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {FEEDBACK_STATUS_LABELS[value]}
                  </option>
                ))}
              </Select>
            </div>
            <StatusSubmit />
          </form>

          <form action={importantForm}>
            <input type="hidden" name="feedbackId" value={feedback.id} />
            <input type="hidden" name="important" value={feedback.isImportant ? "false" : "true"} />
            <ImportantSubmit isImportant={feedback.isImportant} />
          </form>
        </div>

        {anyError ? (
          <p role="alert" className="mt-3 text-sm text-state-danger">
            {anyError}
          </p>
        ) : anyOk ? (
          <p role="status" className="mt-3 text-sm text-state-success">
            Saved.
          </p>
        ) : null}
      </Card>
    </li>
  );
}
