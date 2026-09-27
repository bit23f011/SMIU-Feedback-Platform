"use client";

import * as React from "react";

import { useFormStatus } from "react-dom";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";

/*
  People forms ke chhote shared client bits (README §49-§51).

  SECURITY: yeh sirf UI hai. Har submit ek admin RPC (SECURITY DEFINER + is_admin())
  tak jata hai; faisla aur audit DB me hota hai. Button ka enable/disable ya kisi
  message ka dikhna authority nahi - DevTools se badla jaye to bhi DB wahi karegi jo
  theek hai. Yahan sirf pending state aur allowlist-safe message dikhaya jata hai.
*/

/** Submit button jo pending par lock ho jata hai. */
export function SubmitButton({
  children,
  pendingLabel = "Saving",
  variant = "default",
  size = "sm",
  icon,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "default" | "outline" | "subtle" | "destructive";
  size?: "sm" | "default";
  icon?: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  // icon prop chhoro to default Save; icon={null} do to koi icon nahi (nullish
  // coalescing yahan galat hota kyunki null bhi Save laata).
  return (
    <Button type="submit" size={size} variant={variant} disabled={pending}>
      {icon === undefined ? <Save aria-hidden="true" /> : icon}
      {pending ? pendingLabel : children}
    </Button>
  );
}

/*
  ok/error dono ke liye ek hi status line. Person/role/assignment sab ke action
  state me {ok, error?} maujood hai, is liye yeh generic shape kaafi hai.
*/
export function FormStatus({
  state,
  okText = "Saved.",
}: {
  state: { ok: boolean; error?: string };
  okText?: string;
}) {
  if (state.error) {
    return (
      <span role="alert" className="text-sm text-state-danger">
        {state.error}
      </span>
    );
  }
  if (state.ok) {
    return (
      <span role="status" className="text-sm text-state-success">
        {okText}
      </span>
    );
  }
  return null;
}
