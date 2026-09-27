"use client";

import * as React from "react";

import { useFormState, useFormStatus } from "react-dom";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateRankingsSettingsAction } from "@/features/admin/rankings/actions";
import {
  EMPTY_RANKINGS_ACTION_STATE,
  RANKING_BOUNDS,
  type RankingsSettings,
} from "@/features/admin/rankings/types";

/*
  Rankings / privacy thresholds ka form (README §40).

  SECURITY: submit set_platform_settings (is_admin()) tak jata hai. min/max neeche
  DB CHECK constraints se milte hain taake form pehle hi rok de. Yeh sirf UI hai;
  authority DB me.
*/

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Save aria-hidden="true" />
      {pending ? "Saving" : "Save thresholds"}
    </Button>
  );
}

interface FieldSpec {
  name: keyof typeof RANKING_BOUNDS;
  label: string;
  help: string;
}

const FIELDS: readonly FieldSpec[] = [
  {
    name: "rankingMinReviews",
    label: "Minimum reviews to appear in rankings",
    help: "A person needs at least this many published reviews before they can be ranked.",
  },
  {
    name: "breakdownMinReviews",
    label: "Minimum reviews to show a rating breakdown",
    help: "Per-criterion breakdowns stay hidden until a person has this many reviews.",
  },
  {
    name: "trendingWindowDays",
    label: "Trending window (days)",
    help: "How many recent days count when working out who is trending.",
  },
  {
    name: "trendingMinReviews",
    label: "Minimum recent reviews to be trending",
    help: "Reviews needed within the window above for someone to trend.",
  },
];

export function RankingsForm({ settings }: { settings: RankingsSettings }) {
  const [state, formAction] = useFormState(
    updateRankingsSettingsAction,
    EMPTY_RANKINGS_ACTION_STATE,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map((field) => {
          const bound = RANKING_BOUNDS[field.name];
          return (
            <div key={field.name} className="space-y-1.5">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                inputMode="numeric"
                required
                min={bound.min}
                max={bound.max}
                defaultValue={settings[field.name]}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {field.help} Allowed range: {bound.min} to {bound.max}.
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton />
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
