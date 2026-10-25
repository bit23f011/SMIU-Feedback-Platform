import * as React from "react";

import Link from "next/link";
import { Lock, ShieldCheck } from "@/components/ui/icons";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { PersonSummary } from "@/features/people/types";
import { MyReviewCard } from "@/features/reviews/my-review-card";
import type { ReviewPanelData } from "@/features/reviews/review-panel-data";
import { ReviewForm } from "@/features/reviews/review-form";
import { categoryNeedsCourse } from "@/features/reviews/types";
import {
  hasAvailableReviewContext,
  reviewScopeKey,
} from "@/features/reviews/review-context";

/*
  Profile page par "review likho" wala hissa.

  Server se resolved account capability ke mutabiq yeh view dikhata hai:
    - signed out            -> sign in / create account
    - signed in, incomplete -> account support ka paigham
    - pehle se review hai   -> apni review + edit/delete
    - koi scope bacha hai   -> naya review form (doosra course ya semester)
    - warna                 -> sab scopes istemal ho chuke

  README §25 ke baad "ek banday par ek review" ab poora sach nahi: rule student
  + person + COURSE + SEMESTER par hai. Is liye ek hi teacher par doosre course
  me dobara review mumkin hai, aur yeh panel wo soorat sambhalta hai.

  Yeh sirf UI ka faisla hai. Agar koi is component ko bypass kar ke seedha
  server action chala de, to bhi DB ki `submit_review` khud verified student,
  active person, jaiz course+semester aur uniqueness check karti hai.
*/

function ReviewGate({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-ink-200 bg-ink-50/60 p-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-primary [&_svg]:size-4"
        >
          <Lock />
        </span>
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-foreground">
            {title}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
          {children ? (
            <div className="mt-4 flex flex-wrap gap-2">{children}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ReviewPanelView({
  person,
  data,
  initialCourseId,
  initialSemesterId,
}: {
  person: PersonSummary;
  data: ReviewPanelData;
  initialCourseId?: string;
  initialSemesterId?: string;
}) {
  const selection = new URLSearchParams();
  if (initialCourseId) selection.set("course", initialCourseId);
  if (initialSemesterId) selection.set("semester", initialSemesterId);
  const nextPath = `/people/${person.slug}${selection.size ? `?${selection}` : ""}#write-review`;

  if (data.status === "signed-out") {
    return (
      <div className="rounded-lg border border-border bg-background/70 p-4">
        <p className="text-sm font-medium">Sign in to write a review.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/auth/login?next=${encodeURIComponent(nextPath)}`}>
              Sign in
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/auth/signup">Create account</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (data.status === "unverified") {
    return (
      <ReviewGate
        title="Your account is not ready to review"
        description="Please contact the site administrator to enable this account."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/auth/login">Go to sign in</Link>
        </Button>
      </ReviewGate>
    );
  }

  if (data.status === "inactive") {
    return (
      <ReviewGate
        title="Reviewing is not available on this account"
        description="This account cannot post reviews at the moment. If you think this is a mistake, contact the SMIU Feedback team."
      />
    );
  }

  if (data.status === "admin") {
    return (
      <ReviewGate
        title="Use a student account to review"
        description="Admin accounts manage the platform. Sign in with a student account to share a review."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/admin">Go to admin</Link>
        </Button>
      </ReviewGate>
    );
  }

  if (data.status === "no-category") {
    return (
      <ReviewGate
        title="This profile cannot be reviewed yet"
        description="Its category has not been set, so there are no review questions for it."
      />
    );
  }

  if (data.status !== "ready" || !person.primaryCategory) return null;
  const needsCourse = categoryNeedsCourse(person.primaryCategory);

  const { criteria, limits, mine, catalog, scopes, submissionEnabled } = data;

  if (criteria.length === 0) {
    return (
      <ReviewGate
        title="Review questions are not ready"
        description="There are no active questions for this category yet. Please check back soon."
      />
    );
  }

  /*
    Jo jorey main pehle hi review kar chuka hoon wo menu se nikal do. Yeh sirf
    shaistagi hai: agar koi purana page khula rakhe aur wahi jorha dobara bhej
    de, to DB "You have already reviewed this course for this semester." ke
    saath rok degi.
  */
  const personScopes = scopes.filter((scope) => scope.personId === person.id);
  const used = new Set(
    personScopes.map((scope) =>
      reviewScopeKey(scope.courseId, scope.semesterId),
    ),
  );
  const canWriteMore = hasAvailableReviewContext(
    catalog,
    personScopes,
    needsCourse,
  );

  const form = submissionEnabled ? (
    <div className="rounded-lg border border-border bg-background p-5 shadow-xs sm:p-6">
      <div className="flex items-start gap-3 border-b border-border pb-5">
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-primary [&_svg]:size-4"
        >
          <ShieldCheck />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground">
            {mine
              ? "Review another course or semester"
              : "Write an anonymous review"}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {needsCourse
              ? "One review per course per semester. Write about your own experience with teaching and conduct. Do not write about appearance, personal life, or second-hand stories."
              : "One review per semester. Write about your own experience with this person at work. Do not write about appearance, personal life, or second-hand stories."}
          </p>
        </div>
      </div>

      <div className="pt-5">
        <ReviewForm
          personId={person.id}
          personSlug={person.slug}
          personName={person.name}
          criteria={criteria}
          limits={limits}
          catalog={catalog}
          usedScopes={personScopes}
          initialCourseId={initialCourseId}
          initialSemesterId={initialSemesterId}
          needsCourse={needsCourse}
        />
      </div>
    </div>
  ) : (
    <ReviewGate
      title="New reviews are paused"
      description="New reviews are paused right now. Please try again later."
    />
  );

  if (!mine) return form;

  return (
    <div className="space-y-6">
      <MyReviewCard
        review={{ ...mine, personSlug: mine.personSlug || person.slug }}
        criteria={criteria}
        limits={limits}
        personName={person.name}
      />

      {used.size > 1 ? (
        <p className="text-sm text-muted-foreground">
          More than one of your reviews is linked to this person. The most
          recent one is shown above, and all of them are listed on{" "}
          <Link
            href="/student"
            className="font-medium text-foreground underline underline-offset-4"
          >
            your reviews page
          </Link>
          .
        </p>
      ) : null}

      {canWriteMore || catalog.failed ? (
        form
      ) : (
        <Alert tone="neutral">
          <AlertDescription>
            {needsCourse
              ? "You have reviewed every course and semester listed for this person."
              : "You have reviewed every review period listed for this person."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
