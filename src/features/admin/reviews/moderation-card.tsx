"use client";

import * as React from "react";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, EyeOff, Star, StarOff, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/common/rating-stars";
import { moderateReviewAction } from "@/features/admin/reviews/actions";
import { EMPTY_MODERATION_STATE } from "@/features/admin/reviews/form-state";
import {
  formatQueueContext,
  type AdminQueueReview,
  type ModerationAction,
  type ModerationQueueStatus,
} from "@/features/admin/reviews/types";
import { getCategoryMeta } from "@/lib/constants";

/*
  Ek review ka moderation card.

  SECURITY: yeh card sirf buttons dikhata hai. Har click `moderate_review()` tak
  jata hai jo khud `is_admin()` check karti hai aur audit log likhti hai. Button
  ka chhupna permission nahi hai - koi DevTools se `action` badal de to bhi DB
  wahi karegi jo usay karna chahiye.

  Author ka naam yahan aata hi nahi. Queue function me wo column mojood hi nahi,
  is liye is screen se identity leak ho hi nahi sakti.
*/

interface ActionSpec {
  action: ModerationAction;
  label: string;
  icon: LucideIcon;
  variant: "default" | "outline" | "destructive" | "subtle";
}

const APPROVE: ActionSpec = {
  action: "approve",
  label: "Approve",
  icon: CheckCircle2,
  variant: "default",
};
const REJECT: ActionSpec = {
  action: "reject",
  label: "Reject",
  icon: XCircle,
  variant: "outline",
};
const HIDE: ActionSpec = { action: "hide", label: "Hide", icon: EyeOff, variant: "outline" };
const FEATURE: ActionSpec = { action: "feature", label: "Feature", icon: Star, variant: "subtle" };
const UNFEATURE: ActionSpec = {
  action: "unfeature",
  label: "Remove from featured",
  icon: StarOff,
  variant: "outline",
};

/*
  Har halat me kya kiya ja sakta hai.

  Feature sirf approved text par lag sakta hai - DB me bhi yehi shart hai, aur
  wahan se message "Approve this review before featuring it." aata hai.
*/
function actionsFor(status: ModerationQueueStatus, isFeatured: boolean): ActionSpec[] {
  switch (status) {
    case "pending":
      return [APPROVE, REJECT, HIDE];
    case "approved":
      return [isFeatured ? UNFEATURE : FEATURE, HIDE, REJECT];
    case "rejected":
      return [APPROVE, HIDE];
    case "hidden":
      return [APPROVE, REJECT];
    default:
      return [];
  }
}

function ActionRow({
  specs,
  onPick,
  picked,
}: {
  specs: ActionSpec[];
  onPick: (action: ModerationAction) => void;
  picked: ModerationAction | null;
}) {
  // useFormStatus hamesha apne parent <form> ka status deta hai.
  const { pending } = useFormStatus();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {specs.map((spec) => {
        const Icon = spec.icon;
        const isActive = pending && picked === spec.action;

        return (
          <Button
            key={spec.action}
            type="submit"
            name="action"
            value={spec.action}
            size="sm"
            variant={spec.variant}
            disabled={pending}
            onClick={() => onPick(spec.action)}
          >
            <Icon aria-hidden="true" />
            {isActive ? "Working" : spec.label}
          </Button>
        );
      })}
    </div>
  );
}

export function ModerationCard({
  review,
  status,
}: {
  review: AdminQueueReview;
  status: ModerationQueueStatus;
}) {
  const [state, formAction] = useFormState(moderateReviewAction, EMPTY_MODERATION_STATE);
  const [picked, setPicked] = React.useState<ModerationAction | null>(null);

  /*
    Action ka naam BUTTON par hi rehta hai (`name="action" value="approve"`).

    Browser khud submitter ka name/value form data me daalta hai, aur React ka
    form-action raasta bhi yehi karta hai. Faida: JavaScript load hone se pehle
    click ho jaye to bhi sahi action server tak pohnchta hai. Pehle yeh kaam ek
    hidden input me ref se likh kar hota tha, jo hydration se pehle khali reh
    jata tha aur user ko be-wajah error milta tha.

    `picked` sirf button ka label "Working" karne ke liye hai. Is par koi
    faisla nahi hota, is liye state ka der se aana koi masla nahi.
  */
  const handlePick = React.useCallback((action: ModerationAction) => {
    setPicked(action);
  }, []);

  const specs = actionsFor(status, review.isFeatured);
  const meta = getCategoryMeta(review.category);
  const context = formatQueueContext(review);

  const submitted = new Date(review.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <li className="list-none">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
              <Link
                href={`/people/${review.personSlug}`}
                className="rounded-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {review.personName}
              </Link>
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="category">{meta.singular}</Badge>
              {review.isFeatured ? <Badge variant="accent">Featured</Badge> : null}
            </div>
            {context ? (
              <p className="mt-2 text-xs font-medium text-muted-foreground">{context}</p>
            ) : null}
          </div>

          <div className="shrink-0 text-right">
            <RatingStars value={review.overallRating} />
            <p className="mt-1 text-xs text-muted-foreground">Submitted {submitted}</p>
          </div>
        </div>

        {review.comment ? (
          <blockquote className="mt-4 border-l-2 border-border pl-4 text-sm leading-relaxed text-ink-700">
            {review.comment}
          </blockquote>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            This review has no written text. Only the rating counts.
          </p>
        )}

        <form action={formAction} className="mt-5 border-t border-border pt-4">
          <input type="hidden" name="reviewId" value={review.id} />
          <input type="hidden" name="personSlug" value={review.personSlug} />

          <ActionRow specs={specs} onPick={handlePick} picked={picked} />

          {state.error ? (
            <p role="alert" className="mt-3 text-sm text-state-danger">
              {state.error}
            </p>
          ) : null}

          {state.ok ? (
            <p role="status" className="mt-3 text-sm text-state-success">
              Saved. This review has moved to its new list.
            </p>
          ) : null}
        </form>
      </Card>
    </li>
  );
}
