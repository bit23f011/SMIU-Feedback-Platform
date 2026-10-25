"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { MessageSquare, Send, Star } from "@/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitWebsiteFeedbackAction } from "@/features/feedback/actions";
import { EMPTY_FEEDBACK_FORM_STATE } from "@/features/feedback/form-state";
import {
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_TYPE_ORDER,
  type FeedbackType,
} from "@/features/admin/feedback/types";

const QUESTIONS = [
  "Hi! What would you like to share about SMIU Feedback Platform?",
  "Which page or section is this about?",
  "Tell me what happened or what you would like improved. For an issue, include what you expected and how to reproduce it.",
  "How was your website experience? Choose 1–5 stars, or skip this.",
  "Would you like a reply? Leave a contact email, or skip this. It is only visible to the admin team.",
  "Your feedback is ready. You can edit your answers below before sending.",
];

function SendFeedbackButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="soft-green-action">
      <Send aria-hidden="true" />
      {pending ? "Sending…" : "Send feedback"}
    </Button>
  );
}

export function FeedbackChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [type, setType] = useState<FeedbackType>("website_feedback");
  const [section, setSection] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [finished, setFinished] = useState(false);
  const [device, setDevice] = useState("");
  const [state, formAction] = useFormState(
    submitWebsiteFeedbackAction,
    EMPTY_FEEDBACK_FORM_STATE,
  );
  const conversation = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.ok) setFinished(true);
  }, [state]);
  useEffect(() => {
    conversation.current?.scrollTo({
      top: conversation.current.scrollHeight,
      behavior: "instant",
    });
  }, [open, step, state, finished]);

  const answers = [
    FEEDBACK_TYPE_LABELS[type],
    section,
    message,
    rating ? `${rating}/5 stars` : "Skipped rating",
    contactEmail || "No reply needed",
  ];
  const completeMessage = `${message.trim()}\n\nPage / section: ${section.trim()}\nDevice: ${device}`;
  function next(event: React.FormEvent) {
    event.preventDefault();
    setStep((value) => value + 1);
  }
  function changeOpen(nextOpen: boolean) {
    if (nextOpen) {
      if (!section) setSection(pathname.slice(0, 200));
      setDevice(
        window.innerWidth < 768
          ? "Mobile"
          : window.innerWidth < 1024
            ? "Tablet"
            : "Desktop",
      );
    }
    setOpen(nextOpen);
  }
  function reset() {
    setStep(0);
    setMessage("");
    setRating("");
    setContactEmail("");
    setSection(pathname.slice(0, 200));
    setFinished(false);
  }

  // Public and student pages share the same feedback queue.
  if (/^\/(admin|auth)(\/|$)/.test(pathname)) return null;
  return (
    <Dialog modal={false} open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Open website feedback chat"
          className="soft-green-action fixed bottom-4 right-4 z-40 flex size-14 items-center justify-center rounded-full shadow-pop sm:bottom-6 sm:right-6"
        >
          <MessageSquare className="size-6" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent className="feedback-chat bottom-[5.25rem] left-auto right-4 top-auto flex max-h-[min(650px,calc(100dvh-7rem))] w-[calc(100%-2rem)] max-w-[390px] translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden border-campus-border p-0 sm:bottom-[6rem] sm:right-6">
        <header className="shrink-0 border-b border-campus-border bg-campus-soft px-5 py-4 pr-12">
          <DialogTitle className="text-base text-campus-ink">
            Website feedback
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs text-campus-ink">
            Share an issue, suggestion or your experience.
          </DialogDescription>
        </header>
        <div
          ref={conversation}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4"
          aria-live="polite"
          aria-relevant="additions"
        >
          {finished ? (
            <p
              role="status"
              className="rounded-lg bg-campus-soft p-3 text-sm leading-6 text-campus-ink"
            >
              Thank you! Your feedback has been saved for the admin team.
            </p>
          ) : (
            <>
              {QUESTIONS.slice(0, step + 1).map((question, index) => (
                <div key={question} className="space-y-2">
                  <p className="mr-6 rounded-lg rounded-tl-none bg-campus-soft p-3 text-[13px] leading-6 text-campus-ink">
                    {question}
                  </p>
                  {index < step && index < answers.length ? (
                    <div className="ml-6 rounded-lg rounded-tr-none border border-border bg-surface p-3">
                      <p className="whitespace-pre-wrap break-words text-[13px] leading-6">
                        {answers[index]}
                      </p>
                      <button
                        type="button"
                        onClick={() => setStep(index)}
                        className="mt-1 text-xs font-medium text-primary"
                      >
                        Edit answer
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
              {step === 5 && (state.formError || state.fieldErrors) ? (
                <p role="alert" className="text-xs leading-6 text-state-danger">
                  {state.formError ||
                    Object.values(state.fieldErrors ?? {})
                      .flat()
                      .join(" ")}
                </p>
              ) : null}
            </>
          )}
        </div>
        <div className="shrink-0 border-t border-border p-4">
          {finished ? (
            <Button variant="outline" onClick={reset}>
              Send another note
            </Button>
          ) : (
            <>
              {step === 0 ? (
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_TYPE_ORDER.map((value) => (
                    <Button
                      key={value}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setType(value);
                        setStep(1);
                      }}
                    >
                      {FEEDBACK_TYPE_LABELS[value]}
                    </Button>
                  ))}
                </div>
              ) : null}
              {step === 1 ? (
                <form onSubmit={next} className="space-y-3">
                  <Input
                    aria-label="Page or section"
                    value={section}
                    onChange={(event) => setSection(event.target.value)}
                    maxLength={200}
                    required
                  />
                  <Button type="submit" size="sm">
                    Continue
                  </Button>
                </form>
              ) : null}
              {step === 2 ? (
                <form onSubmit={next} className="space-y-3">
                  <Textarea
                    aria-label="Your feedback message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    maxLength={FEEDBACK_MESSAGE_MAX - 300}
                    rows={3}
                    placeholder="Write your feedback…"
                    required
                  />
                  <Button type="submit" size="sm" disabled={!message.trim()}>
                    Continue
                  </Button>
                </form>
              ) : null}
              {step === 3 ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        type="button"
                        key={value}
                        aria-label={`Rate website ${value} out of 5`}
                        aria-pressed={rating === String(value)}
                        className="flex size-10 items-center justify-center rounded-md border border-input"
                        onClick={() => {
                          setRating(String(value));
                          setStep(4);
                        }}
                      >
                        <Star
                          weight={value <= Number(rating) ? "fill" : "regular"}
                          className={`size-6 ${value <= Number(rating) ? "text-rating-filled" : "text-rating-empty"}`}
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground"
                    onClick={() => {
                      setRating("");
                      setStep(4);
                    }}
                  >
                    Skip rating
                  </button>
                </div>
              ) : null}
              {step === 4 ? (
                <form onSubmit={next} className="space-y-3">
                  <Input
                    aria-label="Optional contact email"
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    maxLength={254}
                    placeholder="you@example.com"
                  />
                  <div className="flex items-center gap-4">
                    <Button type="submit" size="sm">
                      Continue
                    </Button>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground"
                      onClick={() => {
                        setContactEmail("");
                        setStep(5);
                      }}
                    >
                      Skip email
                    </button>
                  </div>
                </form>
              ) : null}
              {step === 5 ? (
                <form action={formAction}>
                  <input type="hidden" name="type" value={type} />
                  <input type="hidden" name="message" value={completeMessage} />
                  <input type="hidden" name="rating" value={rating} />
                  <input
                    type="hidden"
                    name="contactEmail"
                    value={contactEmail}
                  />
                  <SendFeedbackButton />
                </form>
              ) : null}
              {step > 0 && step < 5 ? (
                <button
                  type="button"
                  className="mt-3 text-xs text-muted-foreground"
                  onClick={() => setStep((value) => value - 1)}
                >
                  Back
                </button>
              ) : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
