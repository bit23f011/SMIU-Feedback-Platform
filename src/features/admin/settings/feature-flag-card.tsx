"use client";

import * as React from "react";

import { useFormState, useFormStatus } from "react-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  setFeatureFlagAction,
} from "@/features/admin/settings/actions";
import { EMPTY_FEATURE_FLAG_ACTION_STATE } from "@/features/admin/settings/form-state";
import type { FeatureFlag } from "@/features/admin/settings/types";

/*
  Ek feature switch ka card (README §55).

  SECURITY: yeh sirf switch dikhata hai. set_feature_flag SECURITY DEFINER +
  is_admin() hai, aur schedule ka waqt server ka clock tay karta hai. Button ka
  rang/haalat kabhi authority nahi - asal rok DB me hai (submit/edit/signup fns
  feature_enabled() dobara check karti hain).

  Do controls: (1) abhi on/off (ya lock/unlock), (2) ek schedule window.
*/

function toDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function ToggleButtons({ enabledNow }: { enabledNow: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex items-center gap-2">
      <Button
        type="submit"
        name="enabled"
        value="true"
        size="sm"
        variant={enabledNow ? "subtle" : "default"}
        disabled={pending || enabledNow}
      >
        Turn on
      </Button>
      <Button
        type="submit"
        name="enabled"
        value="false"
        size="sm"
        variant={enabledNow ? "outline" : "subtle"}
        disabled={pending || !enabledNow}
      >
        Turn off
      </Button>
    </div>
  );
}

function ScheduleButtons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Save schedule
      </Button>
      <Button
        type="submit"
        name="clearSchedule"
        value="true"
        size="sm"
        variant="ghost"
        disabled={pending}
      >
        Clear schedule
      </Button>
    </div>
  );
}

export function FeatureFlagCard({ flag }: { flag: FeatureFlag }) {
  const [toggleState, toggleForm] = useFormState(
    setFeatureFlagAction,
    EMPTY_FEATURE_FLAG_ACTION_STATE,
  );
  const [scheduleState, scheduleForm] = useFormState(
    setFeatureFlagAction,
    EMPTY_FEATURE_FLAG_ACTION_STATE,
  );

  const label = flag.meta?.label ?? flag.label;
  const help = flag.meta?.help ?? null;
  const onWord = flag.meta?.onWord ?? "On";
  const offWord = flag.meta?.offWord ?? "Off";

  const nowWord = flag.enabledNow ? onWord : offWord;
  const setWord = flag.isEnabled ? onWord : offWord;
  const scheduleDiffers = flag.enabledNow !== flag.isEnabled;

  const hasSchedule = Boolean(flag.startsAt || flag.endsAt);

  return (
    <li className="list-none rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
            {label}
          </h3>
          {help ? (
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">{help}</p>
          ) : null}
        </div>
        <Badge variant={flag.enabledNow ? "accent" : "outline"}>{nowWord} now</Badge>
      </div>

      {scheduleDiffers ? (
        <p className="mt-3 text-xs text-muted-foreground">
          A schedule is overriding the switch. Set to {setWord}, but currently {nowWord} because of
          its time window.
        </p>
      ) : null}

      <div className="mt-4 border-t border-border pt-4">
        <form action={toggleForm}>
          <input type="hidden" name="key" value={flag.key} />
          <div className="flex flex-wrap items-center gap-3">
            <ToggleButtons enabledNow={flag.enabledNow} />
            {toggleState.error ? (
              <span role="alert" className="text-sm text-state-danger">
                {toggleState.error}
              </span>
            ) : toggleState.ok ? (
              <span role="status" className="text-sm text-state-success">
                Saved.
              </span>
            ) : null}
          </div>
        </form>
      </div>

      <details className="mt-4" open={hasSchedule}>
        <summary className="cursor-pointer text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
          Schedule (optional)
        </summary>
        <form action={scheduleForm} className="mt-3 space-y-3">
          <input type="hidden" name="key" value={flag.key} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`starts-${flag.key}`} className="text-xs">
                Starts
              </Label>
              <Input
                id={`starts-${flag.key}`}
                name="startsAt"
                type="datetime-local"
                defaultValue={toDateTimeLocal(flag.startsAt)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`ends-${flag.key}`} className="text-xs">
                Ends
              </Label>
              <Input
                id={`ends-${flag.key}`}
                name="endsAt"
                type="datetime-local"
                defaultValue={toDateTimeLocal(flag.endsAt)}
              />
            </div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Within this window the switch above is what applies. The server clock decides, so no
            code change is needed. Saving the schedule does not flip the switch on its own.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <ScheduleButtons />
            {scheduleState.error ? (
              <span role="alert" className="text-sm text-state-danger">
                {scheduleState.error}
              </span>
            ) : scheduleState.ok ? (
              <span role="status" className="text-sm text-state-success">
                Saved.
              </span>
            ) : null}
          </div>
        </form>
      </details>
    </li>
  );
}
