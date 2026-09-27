import * as React from "react";

import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/features/auth/session";
import type { PersonSummary } from "@/features/people/types";
import { MyReviewCard } from "@/features/reviews/my-review-card";
import {
  getMyReviewForPerson,
  getMyReviewScopes,
  getPersonReviewOptions,
  getReviewCriteria,
  getReviewLimits,
} from "@/features/reviews/queries";
import { ReviewForm } from "@/features/reviews/review-form";
import { categoryNeedsCourse, type ReviewOption } from "@/features/reviews/types";

/*
  Profile page par "review likho" wala hissa.

  Yeh server component faisla karta hai ke kya dikhana hai:
    - signed out            -> sign in / create account
    - signed in, unverified -> email verify karo
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
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-indigo-600 [&_svg]:size-4"
        >
          <Lock />
        </span>
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-foreground">{title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
          {children ? <div className="mt-4 flex flex-wrap gap-2">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

/** Ek scope ki pehchan: course + semester ka jorha. */
function scopeKey(courseId: string | null, semesterId: string | null): string {
  return `${courseId ?? ""}|${semesterId ?? ""}`;
}

export async function ReviewPanel({ person }: { person: PersonSummary }) {
  const nextPath = `/people/${person.slug}`;
  const session = await getCurrentUser();

  if (!session) {
    return (
      <ReviewGate
        title="Sign in to write a review"
        description="Only students with a verified university email can review. Your review is posted anonymously, and your name is never stored with it."
      >
        <Button asChild size="sm">
          <Link href={`/auth/login?next=${encodeURIComponent(nextPath)}`}>Sign in</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/auth/signup">Create account</Link>
        </Button>
      </ReviewGate>
    );
  }

  if (!session.isVerified) {
    return (
      <ReviewGate
        title="Verify your email first"
        description="We sent a verification link to your university email. Open it once and you will be able to review."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/auth/verify-email">What to do next</Link>
        </Button>
      </ReviewGate>
    );
  }

  if (!session.profile?.is_active) {
    return (
      <ReviewGate
        title="Reviewing is not available on this account"
        description="This account cannot post reviews at the moment. If you think this is a mistake, contact the ProfAura team."
      />
    );
  }

  if (!person.primaryCategory) {
    return (
      <ReviewGate
        title="This profile cannot be reviewed yet"
        description="Its category has not been set, so there are no review questions for it."
      />
    );
  }

  const needsCourse = categoryNeedsCourse(person.primaryCategory);

  const [criteria, limits, mine, options, scopes] = await Promise.all([
    getReviewCriteria(person.primaryCategory),
    getReviewLimits(),
    getMyReviewForPerson(person.id),
    getPersonReviewOptions(person.id),
    getMyReviewScopes(),
  ]);

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
  const used = new Set(
    scopes
      .filter((scope) => scope.personId === person.id)
      .map((scope) => scopeKey(scope.courseId, scope.semesterId)),
  );

  const remaining: ReviewOption[] = options.filter(
    (option) => !used.has(scopeKey(option.courseId, option.semesterId)),
  );

  const canWriteMore = remaining.length > 0;

  const form = (
    <div className="rounded-lg border border-border bg-background p-5 shadow-xs sm:p-6">
      <div className="flex items-start gap-3 border-b border-border pb-5">
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-indigo-600 [&_svg]:size-4"
        >
          <ShieldCheck />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground">
            {mine ? "Review another course or semester" : "Write an anonymous review"}
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
          options={remaining}
          needsCourse={needsCourse}
        />
      </div>
    </div>
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
          More than one of your reviews is linked to this person. The most recent one is shown
          above, and all of them are listed on{" "}
          <Link href="/student" className="font-medium text-foreground underline underline-offset-4">
            your reviews page
          </Link>
          .
        </p>
      ) : null}

      {canWriteMore ? (
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
