"use client";

import * as React from "react";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/*
  StarInput - ek CRITERION ke liye 1 se 5 tak rating dene wala accessible control.
  (Overall rating 1-10 hai aur uska apna control neeche `OverallInput` hai.)

  Yeh asal me 5 radio buttons hain (visually hidden), upar star ka shakal.
  Radio is liye ke keyboard arrow keys, screen reader announcement aur form
  submission sab browser khud sambhal leta hai - apna custom div banate to yeh
  sab haath se likhna parta aur aksar toot jata hai.

  Value ko `required` rakha hai taake bina rating ke submit na ho, magar asli
  check phir bhi server aur DB me hai.
*/

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

export interface StarInputProps {
  /** Form field ka naam (server action isi se parhti hai). */
  name: string;
  /** Sawal ka matn. */
  legend: string;
  hint?: string | null;
  defaultValue?: number | null;
  errors?: string[];
  className?: string;
}

export function StarInput({
  name,
  legend,
  hint,
  defaultValue,
  errors,
  className,
}: StarInputProps) {
  const [value, setValue] = React.useState<number>(defaultValue ?? 0);
  const [hovered, setHovered] = React.useState<number>(0);

  const hasError = Boolean(errors && errors.length > 0);
  const shown = hovered || value;
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  const describedBy =
    [hasError ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset className={cn("space-y-1.5", className)} aria-describedby={describedBy}>
      <legend className="text-sm font-medium leading-none text-ink-800">{legend}</legend>

      {hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}

      <div
        className="flex items-center gap-1 pt-0.5"
        onMouseLeave={() => setHovered(0)}
        onBlur={() => setHovered(0)}
      >
        {STAR_VALUES.map((star) => (
          <label
            key={star}
            className="group cursor-pointer rounded-sm p-0.5"
            onMouseEnter={() => setHovered(star)}
          >
            <input
              type="radio"
              name={name}
              value={star}
              required
              checked={value === star}
              onChange={() => setValue(star)}
              onFocus={() => setHovered(star)}
              className="peer sr-only"
            />
            <Star
              aria-hidden="true"
              strokeWidth={1.75}
              className={cn(
                "size-7 transition-colors duration-100 ease-out",
                "peer-focus-visible:rounded-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                star <= shown
                  ? "fill-coral-400 text-coral-500"
                  : "fill-transparent text-ink-300 group-hover:text-ink-400",
              )}
            />
            <span className="sr-only">
              {star} {star === 1 ? "star" : "stars"}
            </span>
          </label>
        ))}

        <span
          aria-hidden="true"
          className={cn(
            "ml-2 text-sm tabular-nums",
            value > 0 ? "font-medium text-foreground" : "text-ink-400",
          )}
        >
          {value > 0 ? `${value}/5` : "Not set"}
        </span>
      </div>

      {hasError ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-state-danger">
          {errors![0]}
        </p>
      ) : null}
    </fieldset>
  );
}

/*
  OverallInput - README §15 wali 1 se 10 tak OVERALL rating.

  Yahan stars JAAN BOOJH KAR nahi hain. Do wajah:
    * 10 stars ginna mushkil hai, aur log ghalti se 7 ki jagah 8 daba dete hain.
    * Criteria ke 1-5 star aur overall 1-10 alag scales hain; alag shakal hone
      se form me confusion nahi hoti.

  Andar wahi radio pattern hai jo StarInput me hai, is liye keyboard arrows,
  screen reader aur form submit sab browser khud sambhalta hai.
*/

const OVERALL_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export interface OverallInputProps {
  name: string;
  legend: string;
  hint?: string | null;
  defaultValue?: number | null;
  errors?: string[];
  className?: string;
}

export function OverallInput({
  name,
  legend,
  hint,
  defaultValue,
  errors,
  className,
}: OverallInputProps) {
  const [value, setValue] = React.useState<number>(defaultValue ?? 0);

  const hasError = Boolean(errors && errors.length > 0);
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  const describedBy =
    [hasError ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset className={cn("space-y-1.5", className)} aria-describedby={describedBy}>
      <legend className="text-sm font-medium leading-none text-ink-800">{legend}</legend>

      {hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {OVERALL_VALUES.map((option) => (
          <label key={option} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option}
              required
              checked={value === option}
              onChange={() => setValue(option)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-md border border-input bg-background text-sm font-medium tabular-nums text-ink-700 shadow-xs",
                "transition-colors duration-150 ease-out hover:border-ink-400 hover:bg-ink-50",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
                "peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground",
              )}
            >
              {option}
            </span>
            <span className="sr-only">{option} out of 10</span>
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between pt-0.5 text-xs text-muted-foreground">
        <span aria-hidden="true">1 = poor</span>
        <span
          aria-hidden="true"
          className={cn("tabular-nums", value > 0 ? "font-medium text-foreground" : "text-ink-400")}
        >
          {value > 0 ? `${value} / 10` : "Not set"}
        </span>
        <span aria-hidden="true">10 = excellent</span>
      </div>

      {hasError ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-state-danger">
          {errors![0]}
        </p>
      ) : null}
    </fieldset>
  );
}

export interface YesNoInputProps {
  name: string;
  legend: string;
  hint?: string | null;
  /** null = abhi koi jawab nahi. */
  defaultValue?: boolean | null;
  errors?: string[];
  className?: string;
}

/** Haan/nahi wala sawal - wahi radio pattern, sirf do options. */
export function YesNoInput({
  name,
  legend,
  hint,
  defaultValue,
  errors,
  className,
}: YesNoInputProps) {
  const hasError = Boolean(errors && errors.length > 0);
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  const describedBy =
    [hasError ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  const options = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ] as const;

  const initial = defaultValue === null || defaultValue === undefined ? "" : defaultValue ? "yes" : "no";

  return (
    <fieldset className={cn("space-y-1.5", className)} aria-describedby={describedBy}>
      <legend className="text-sm font-medium leading-none text-ink-800">{legend}</legend>

      {hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}

      <div className="flex items-center gap-2 pt-0.5">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              required
              defaultChecked={initial === option.value}
              className="peer sr-only"
            />
            <span
              className={cn(
                "inline-flex h-9 min-w-[4.5rem] items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-ink-700 shadow-xs",
                "transition-colors duration-150 ease-out hover:border-ink-400 hover:bg-ink-50",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
                "peer-checked:border-primary peer-checked:bg-indigo-50 peer-checked:text-indigo-700",
              )}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>

      {hasError ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-state-danger">
          {errors![0]}
        </p>
      ) : null}
    </fieldset>
  );
}
