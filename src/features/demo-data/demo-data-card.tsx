"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setDemoDataAction } from "./actions";
import { EMPTY_DEMO_DATA_ACTION, type DemoDataState } from "./types";

function DemoToggle({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="enabled"
      value={String(!enabled)}
      variant={enabled ? "outline" : "default"}
      disabled={pending}
      aria-label={enabled ? "Turn demo data OFF" : "Turn demo data ON"}
    >
      {pending ? "Saving…" : `Turn ${enabled ? "OFF" : "ON"}`}
    </Button>
  );
}

export function DemoDataCard({ data }: { data: DemoDataState | null }) {
  const [state, action] = useFormState(
    setDemoDataAction,
    EMPTY_DEMO_DATA_ACTION,
  );
  return (
    <section
      aria-labelledby="demo-data-heading"
      className="mt-6 rounded-lg border border-border bg-card p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="demo-data-heading"
            className="font-display text-lg font-semibold"
          >
            Demo data
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Sample ratings for teachers, faculty, lab instructors and HR, with
            3–8 Roman Urdu and English comments per profile. Turn ON to show them,
            or OFF to hide them.
          </p>
        </div>
        {data ? (
          <Badge variant={data.enabled ? "accent" : "outline"}>
            {data.enabled ? "ON" : "OFF"}
          </Badge>
        ) : null}
      </div>
      {data ? (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            {data.teacherCount} people · {data.ratingCount} sample ratings ·{" "}
            {data.commentCount} sample comments
          </p>
          <form
            action={action}
            className="mt-4 flex flex-wrap items-center gap-3"
          >
            <DemoToggle enabled={data.enabled} />
            {state.error ? (
              <p role="alert" className="text-sm text-state-danger">
                {state.error}
              </p>
            ) : state.ok ? (
              <p role="status" className="text-sm text-state-success">
                Saved.
              </p>
            ) : null}
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Reviews are labelled on the public site.
          </p>
        </>
      ) : (
        <p role="alert" className="mt-3 text-sm text-state-danger">
          Reviews controls could not load. Reload the page and check that the
          latest database migration is applied.
        </p>
      )}
    </section>
  );
}
