"use client";

import * as React from "react";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Ban, CheckCircle2, RotateCcw, Undo2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  resetPersonReviewsAction,
  resolveReportAction,
  setPersonActiveAction,
} from "@/features/admin/reports/actions";
import { EMPTY_REPORT_ACTION_STATE } from "@/features/admin/reports/form-state";
import {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  type AdminReport,
} from "@/features/admin/reports/types";

/*
  Ek report ka card (README §51, §53).

  SECURITY: yeh card sirf buttons/forms dikhata hai. Har submit us RPC tak jata
  hai jo khud is_admin() check karti hai aur audit likhti hai. Button chhupana
  permission nahi - DevTools se badla jaye to bhi DB wahi karegi jo theek hai.

  README §51 ka bunyaadi asool card ki shakal me: report ACCEPT karna khud profile
  ko band/delete NAHI karta. Profile deactivate karna aur reviews reset karna ALAG
  explicit steps hain (neeche "Profile actions"), dono me reason zaroori.
*/

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SubmitButton({
  children,
  pendingLabel,
  variant = "default",
  size = "sm",
  name,
  value,
  onClick,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "default" | "outline" | "destructive" | "subtle";
  size?: "sm" | "default";
  name?: string;
  value?: string;
  onClick?: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name={name}
      value={value}
      variant={variant}
      size={size}
      disabled={pending}
      onClick={onClick}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}

function StatusLine({ ok, error, okText }: { ok: boolean; error?: string; okText: string }) {
  if (error) {
    return (
      <p role="alert" className="mt-3 text-sm text-state-danger">
        {error}
      </p>
    );
  }
  if (ok) {
    return (
      <p role="status" className="mt-3 text-sm text-state-success">
        {okText}
      </p>
    );
  }
  return null;
}

export function ReportCard({ report }: { report: AdminReport }) {
  const [resolveState, resolveForm] = useFormState(resolveReportAction, EMPTY_REPORT_ACTION_STATE);
  const [activeState, activeForm] = useFormState(setPersonActiveAction, EMPTY_REPORT_ACTION_STATE);
  const [resetState, resetForm] = useFormState(resetPersonReviewsAction, EMPTY_REPORT_ACTION_STATE);

  const created = formatDate(report.createdAt);
  const reviewed = formatDate(report.reviewedAt);
  const isPending = report.status === "pending";

  return (
    <li className="list-none">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
              <Link
                href={`/people/${report.personSlug}`}
                className="rounded-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {report.personName}
              </Link>
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{REPORT_REASON_LABELS[report.reason]}</Badge>
              <Badge variant={isPending ? "accent" : "default"}>
                {REPORT_STATUS_LABELS[report.status]}
              </Badge>
              {!report.personActive ? <Badge variant="outline">Profile deactivated</Badge> : null}
            </div>
          </div>

          <div className="shrink-0 text-right">
            {created ? <p className="text-xs text-muted-foreground">Reported {created}</p> : null}
            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
              {report.reportCount} {report.reportCount === 1 ? "report" : "reports"} on this profile
            </p>
          </div>
        </div>

        {report.details ? (
          <blockquote className="mt-4 border-l-2 border-border pl-4 text-sm leading-relaxed text-ink-700">
            {report.details}
          </blockquote>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No extra detail was given.</p>
        )}

        {!isPending ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {REPORT_STATUS_LABELS[report.status]}
            {reviewed ? ` on ${reviewed}` : null}
            {report.resolutionNote ? ` · Note: ${report.resolutionNote}` : null}
          </p>
        ) : null}

        {/* README §51: accept/reject. Profile ko haath nahi lagta. */}
        {isPending ? (
          <form action={resolveForm} className="mt-5 border-t border-border pt-4">
            <input type="hidden" name="reportId" value={report.id} />
            <input type="hidden" name="personSlug" value={report.personSlug} />

            <Label htmlFor={`note-${report.id}`} className="text-xs">
              Note (optional, kept on the record)
            </Label>
            <Textarea
              id={`note-${report.id}`}
              name="note"
              rows={2}
              maxLength={1000}
              className="mt-1.5"
              placeholder="Why you accepted or rejected this report."
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SubmitButton name="action" value="accept" pendingLabel="Working" variant="default">
                <CheckCircle2 aria-hidden="true" />
                Accept
              </SubmitButton>
              <SubmitButton name="action" value="reject" pendingLabel="Working" variant="outline">
                <XCircle aria-hidden="true" />
                Reject
              </SubmitButton>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Accepting a report records your decision. It does not deactivate the profile or remove
              any reviews. Those are separate steps below.
            </p>

            <StatusLine
              ok={resolveState.ok}
              error={resolveState.error}
              okText="Saved. This report has moved to its new list."
            />
          </form>
        ) : null}

        {/* README §51/§53: alag explicit steps. Dono me reason zaroori. */}
        <details className="mt-4 border-t border-border pt-4">
          <summary className="cursor-pointer text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
            Profile actions
          </summary>

          <div className="mt-4 space-y-6">
            <form action={activeForm}>
              <input type="hidden" name="personId" value={report.personId} />
              <input type="hidden" name="personSlug" value={report.personSlug} />
              <input type="hidden" name="active" value={report.personActive ? "false" : "true"} />

              <Label htmlFor={`active-reason-${report.id}`} className="text-xs">
                {report.personActive ? "Reason for deactivating" : "Reason for reactivating"}
              </Label>
              <Textarea
                id={`active-reason-${report.id}`}
                name="reason"
                rows={2}
                required
                maxLength={1000}
                className="mt-1.5"
                placeholder={
                  report.personActive
                    ? "Why this profile should be hidden from the public site."
                    : "Why this profile should be visible again."
                }
              />
              <div className="mt-3">
                {report.personActive ? (
                  <SubmitButton pendingLabel="Working" variant="destructive">
                    <Ban aria-hidden="true" />
                    Deactivate profile
                  </SubmitButton>
                ) : (
                  <SubmitButton pendingLabel="Working" variant="outline">
                    <Undo2 aria-hidden="true" />
                    Reactivate profile
                  </SubmitButton>
                )}
              </div>
              <StatusLine
                ok={activeState.ok}
                error={activeState.error}
                okText={
                  report.personActive
                    ? "Saved. The profile is now hidden from the public site."
                    : "Saved. The profile is visible again."
                }
              />
            </form>

            <form action={resetForm}>
              <input type="hidden" name="personId" value={report.personId} />
              <input type="hidden" name="personSlug" value={report.personSlug} />

              <Label htmlFor={`reset-reason-${report.id}`} className="text-xs">
                Reason for resetting reviews
              </Label>
              <Textarea
                id={`reset-reason-${report.id}`}
                name="reason"
                rows={2}
                required
                maxLength={1000}
                className="mt-1.5"
                placeholder="Why every published review on this profile should be archived."
              />
              <div className="mt-3">
                <SubmitButton pendingLabel="Working" variant="outline">
                  <RotateCcw aria-hidden="true" />
                  Reset all reviews
                </SubmitButton>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Reviews are archived, not deleted. The profile score returns to zero and the text is
                removed from public view. This cannot be undone from here.
              </p>
              <StatusLine
                ok={resetState.ok}
                error={resetState.error}
                okText="Saved. Every published review on this profile has been archived."
              />
            </form>
          </div>
        </details>
      </Card>
    </li>
  );
}
