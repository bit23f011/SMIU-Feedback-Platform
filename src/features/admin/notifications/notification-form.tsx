"use client";

import * as React from "react";

import { useFormState, useFormStatus } from "react-dom";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  upsertNotificationAction,
} from "@/features/admin/notifications/actions";
import { EMPTY_NOTIFICATION_ACTION_STATE } from "@/features/admin/notifications/form-state";
import {
  DEFAULT_NOTIFICATION_PRIORITY,
  NOTIFICATION_MESSAGE_MAX,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_PRIORITY_LABELS,
  type AdminNotification,
} from "@/features/admin/notifications/types";

/*
  Notification banane/edit karne ka form (README §54).

  SECURITY: submit `admin_upsert_notification` tak jata hai jo is_admin() check
  karti hai. Yeh form sirf shakal hai. Schedule ka waqt server authoritative
  maanta hai (README §54/§55) - yahan sirf input.

  Ek hi form dono kaam karta hai: agar `notification` mila to edit (hidden id ke
  saath), warna naya.
*/

/* ISO timestamp ko datetime-local input ki shakal (YYYY-MM-DDTHH:mm) me, local waqt par. */
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

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Save aria-hidden="true" />
      {pending ? "Saving" : isEdit ? "Save changes" : "Create notification"}
    </Button>
  );
}

export function NotificationForm({ notification }: { notification?: AdminNotification }) {
  const [state, formAction] = useFormState(
    upsertNotificationAction,
    EMPTY_NOTIFICATION_ACTION_STATE,
  );
  const isEdit = Boolean(notification);
  const uid = notification?.id ?? "new";

  return (
    <form action={formAction} className="space-y-4">
      {isEdit ? <input type="hidden" name="notificationId" value={notification!.id} /> : null}

      <div className="space-y-1.5">
        <Label htmlFor={`message-${uid}`}>
          Message <span className="text-state-danger">*</span>
        </Label>
        <Textarea
          id={`message-${uid}`}
          name="message"
          required
          rows={3}
          maxLength={NOTIFICATION_MESSAGE_MAX}
          defaultValue={notification?.message ?? ""}
          placeholder="Shown in the banner across the public site."
        />
        <p className="text-xs text-muted-foreground">Up to {NOTIFICATION_MESSAGE_MAX} characters.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`title-${uid}`}>Title (optional)</Label>
          <Input
            id={`title-${uid}`}
            name="title"
            defaultValue={notification?.title ?? ""}
            placeholder="Short heading"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`priority-${uid}`}>Priority</Label>
          <Select
            id={`priority-${uid}`}
            name="priority"
            defaultValue={notification?.priority ?? DEFAULT_NOTIFICATION_PRIORITY}
          >
            {NOTIFICATION_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {NOTIFICATION_PRIORITY_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`href-${uid}`}>Link (optional)</Label>
          <Input
            id={`href-${uid}`}
            name="href"
            type="url"
            defaultValue={notification?.href ?? ""}
            placeholder="https://"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`cta-${uid}`}>Link label (optional)</Label>
          <Input
            id={`cta-${uid}`}
            name="ctaLabel"
            defaultValue={notification?.ctaLabel ?? ""}
            placeholder="Learn more"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`starts-${uid}`}>Starts (optional)</Label>
          <Input
            id={`starts-${uid}`}
            name="startsAt"
            type="datetime-local"
            defaultValue={toDateTimeLocal(notification?.startsAt ?? null)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`ends-${uid}`}>Ends (optional)</Label>
          <Input
            id={`ends-${uid}`}
            name="endsAt"
            type="datetime-local"
            defaultValue={toDateTimeLocal(notification?.endsAt ?? null)}
          />
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          name="isActive"
          value="true"
          defaultChecked={notification ? notification.isActive : true}
          className="size-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        Active
      </label>
      <p className="text-xs leading-relaxed text-muted-foreground">
        A notification shows on the public site only while it is active and within its schedule. The
        server decides this from its own clock, so leaving a start and end handles it without any
        code change.
      </p>

      <div className="flex items-center gap-3">
        <SubmitButton isEdit={isEdit} />
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
