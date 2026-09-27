"use client";

import * as React from "react";

import { AlertCircle } from "lucide-react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/*
  FormField - label + input + error ko ek sath, sahi accessibility ke sath bandhta hai.

  Yeh chhota component is liye banaya ke error ko accessible banane me teen cheezein
  hamesha sath chahiye hoti hain, aur ek bhi bhool jao to screen reader user ko
  error ka pata hi nahi chalta:
    1) input par aria-invalid
    2) input par aria-describedby -> error ki id
    3) error message par role="alert"
  Ek jagah likh diya, ab har form me apne aap sahi milega.
*/

export interface FormFieldProps {
  id: string;
  label: string;
  /** Server action se aayi errors ki list (Zod flatten se). */
  errors?: string[];
  /** Label ke neeche chhoti madad wali line. */
  hint?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
  className?: string;
}

export function FormField({ id, label, errors, hint, children, className }: FormFieldProps) {
  const hasError = Boolean(errors && errors.length > 0);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy =
    [hasError ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>

      {hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}

      {children({ id, "aria-invalid": hasError, "aria-describedby": describedBy })}

      {hasError ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-state-danger"
        >
          <AlertCircle aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          <span>{errors![0]}</span>
        </p>
      ) : null}
    </div>
  );
}

/** Form ke upar wala error banner (poore form ki nakaami ke liye). */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-state-danger/25 bg-state-danger-soft px-3 py-2.5 text-sm text-state-danger"
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}
