"use client";

import * as React from "react";

import { useFormState, useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NotificationForm } from "@/features/admin/notifications/notification-form";
import {
  deleteNotificationAction,
} from "@/features/admin/notifications/actions";
import { EMPTY_NOTIFICATION_ACTION_STATE } from "@/features/admin/notifications/form-state";
import {
  NOTIFICATION_PRIORITY_LABELS,
  type AdminNotification,
} from "@/features/admin/notifications/types";

/*
  Ek notification ka row (README §54): summary + edit + delete.

  SECURITY: delete/edit dono admin RPC tak jaate hain (is_admin()). Yahan ka koi
  button authority nahi.
*/

function formatWhen(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="destructive" disabled={pending}>
      <Trash2 aria-hidden="true" />
      {pending ? "Deleting" : "Delete permanently"}
    </Button>
  );
}

export function NotificationItem({ notification }: { notification: AdminNotification }) {
  const [deleteState, deleteForm] = useFormState(
    deleteNotificationAction,
    EMPTY_NOTIFICATION_ACTION_STATE,
  );

  const starts = formatWhen(notification.startsAt);
  const ends = formatWhen(notification.endsAt);

  return (
    <li className="list-none rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {notification.title ? (
            <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
              {notification.title}
            </h3>
          ) : null}
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
            {notification.message}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge variant="default">{NOTIFICATION_PRIORITY_LABELS[notification.priority]}</Badge>
          {notification.isLiveNow ? (
            <Badge variant="accent">Live now</Badge>
          ) : notification.isActive ? (
            <Badge variant="outline">Active, scheduled</Badge>
          ) : (
            <Badge variant="outline">Off</Badge>
          )}
        </div>
      </div>

      {starts || ends ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {starts ? `Starts ${starts}` : "No start set"}
          {" · "}
          {ends ? `Ends ${ends}` : "No end set"}
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">No schedule. Shows whenever active.</p>
      )}

      {notification.href ? (
        <p className="mt-2 break-all text-xs text-muted-foreground">
          Link: {notification.ctaLabel ? `${notification.ctaLabel} ` : ""}
          {notification.href}
        </p>
      ) : null}

      <details className="mt-4 border-t border-border pt-4">
        <summary className="cursor-pointer text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
          Edit
        </summary>
        <div className="mt-4">
          <NotificationForm notification={notification} />
        </div>
      </details>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-state-danger [&::-webkit-details-marker]:hidden">
          Delete
        </summary>
        <div className="mt-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            This removes the notification for good. To hide it instead, edit it and turn Active off.
          </p>
          <form action={deleteForm} className="mt-3 flex items-center gap-3">
            <input type="hidden" name="notificationId" value={notification.id} />
            <DeleteButton />
            {deleteState.error ? (
              <span role="alert" className="text-sm text-state-danger">
                {deleteState.error}
              </span>
            ) : null}
          </form>
        </div>
      </details>
    </li>
  );
}
