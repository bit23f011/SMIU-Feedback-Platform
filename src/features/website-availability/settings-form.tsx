"use client";
import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClosureNotice } from "./closure-notice";
import { updateWebsiteAction } from "./actions";
import {
  EMPTY_WEBSITE_ACTION,
  WEBSITE_FIELDS,
  type WebsiteSettings,
  type WebsiteActionState,
} from "./types";

function SaveButton({
  children,
  enabled,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      name={enabled === undefined ? undefined : "enabled"}
      value={enabled === undefined ? undefined : String(enabled)}
    >
      {pending ? "Saving…" : children}
    </Button>
  );
}
function Result({ state }: { state: WebsiteActionState }) {
  return state.error ? (
    <p role="alert" className="text-sm text-state-danger">
      {state.error}
    </p>
  ) : state.ok ? (
    <p role="status" className="text-sm text-state-success">
      Saved.
    </p>
  ) : null;
}
export function WebsiteSettingsForm({
  settings,
}: {
  settings: WebsiteSettings;
}) {
  const [toggleState, toggleAction] = useFormState(
    updateWebsiteAction,
    EMPTY_WEBSITE_ACTION,
  );
  const [messageState, messageAction] = useFormState(
    updateWebsiteAction,
    EMPTY_WEBSITE_ACTION,
  );
  const [draft, setDraft] = React.useState(settings);
  return (
    <div className="space-y-8">
      <section
        aria-labelledby="website-switch-heading"
        className="rounded-xl border border-border bg-card p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2
              id="website-switch-heading"
              className="font-display text-lg font-semibold"
            >
              Website ON/OFF
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              ON opens the website. OFF shows your closure page to visitors.
            </p>
          </div>
          <Badge variant={settings.is_enabled ? "accent" : "outline"}>
            Website {settings.is_enabled ? "ON" : "OFF"}
          </Badge>
        </div>
        <form
          action={toggleAction}
          className="mt-5 flex flex-wrap items-center gap-3"
        >
          <input type="hidden" name="mode" value="toggle" />
          <SaveButton enabled={!settings.is_enabled}>
            Turn website {settings.is_enabled ? "OFF" : "ON"}
          </SaveButton>
          <Result state={toggleState} />
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Your admin panel and administrator sign-in remain available.
        </p>
      </section>
      <div className="grid gap-8 xl:grid-cols-2">
        <section aria-labelledby="closure-message-heading">
          <h2
            id="closure-message-heading"
            className="font-display text-lg font-semibold"
          >
            Customize the closure page
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Save your message before switching the website OFF.
          </p>
          <form action={messageAction} className="mt-5 space-y-4">
            <input type="hidden" name="mode" value="message" />
            {WEBSITE_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`website-${field.key}`}>
                  {field.label}
                  {field.required ? "" : " (optional)"}
                </Label>
                {field.key === "message" || field.key === "farewell" ? (
                  <Textarea
                    id={`website-${field.key}`}
                    name={field.key}
                    maxLength={field.maxLength}
                    required={field.required}
                    value={draft[field.key]}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    rows={field.key === "message" ? 6 : 3}
                  />
                ) : (
                  <Input
                    id={`website-${field.key}`}
                    name={field.key}
                    maxLength={field.maxLength}
                    required={field.required}
                    value={draft[field.key]}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                  />
                )}
                <p className="text-[11px] text-muted-foreground">
                  {draft[field.key].length}/{field.maxLength}
                </p>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <SaveButton>Save message</SaveButton>
              <Result state={messageState} />
            </div>
          </form>
        </section>
        <section
          aria-labelledby="closure-live-preview-heading"
          className="min-w-0"
        >
          <h2
            id="closure-live-preview-heading"
            className="mb-5 font-display text-lg font-semibold"
          >
            Live preview
          </h2>
          <ClosureNotice settings={draft} preview />
        </section>
      </div>
    </div>
  );
}
