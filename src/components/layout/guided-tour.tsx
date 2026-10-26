"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "@/components/ui/icons";

type Target = { selector: string; body?: string; title?: string };
type Step = { title: string; body: string; targets: Target[] };

const SEARCH: Step = {
  title: "Find a person or course",
  body: "Type a name or course, then choose a match to open it.",
  targets: [
    { selector: '[data-tour="search"]' },
    {
      selector: '[data-tour="directory-search"]',
      title: "Search this list",
      body: "Type a few words to narrow down this list.",
    },
  ],
};
const STEPS: Step[] = [
  {
    title: "Explore campus feedback",
    body: "Browse teachers, lab instructors and campus staff.",
    targets: [
      { selector: '[data-tour="browse"]' },
      {
        selector: '[data-tour="explore"]',
        body: "Start here to read teacher reviews. No sign-in needed.",
      },
      {
        selector: '[data-tour="menu"]',
        body: "Open the menu to browse teachers and campus staff.",
      },
    ],
  },
  {
    title: "Compare student ratings",
    body: "Open Rankings to compare student feedback.",
    targets: [
      { selector: '[data-tour="rankings"]' },
      {
        selector: '[data-tour="menu"]',
        body: "Choose Rankings from the menu to compare ratings.",
      },
    ],
  },
  {
    title: "Share your experience",
    body: "Sign in to review a profile. Your name stays hidden.",
    targets: [
      {
        selector: '[data-tour="my-area"]',
        title: "Your student area",
        body: "Manage your reviews and saved profiles in My area.",
      },
      { selector: '[data-tour="account"]' },
      {
        selector: '[data-tour="menu"]',
        body: "Sign in from the menu. Your reviews are anonymous.",
      },
    ],
  },
  {
    title: "Help is always here",
    body: "Use Help whenever you want to replay this tour.",
    targets: [
      { selector: '[data-tour="help"]' },
      {
        selector: '[data-tour="menu"]',
        body: "Replay from the menu → How to use this site.",
      },
    ],
  },
];

function findTarget(targets: Target[]) {
  for (const target of targets) {
    for (const element of document.querySelectorAll<HTMLElement>(
      target.selector,
    )) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return { element, ...target };
    }
  }
  return null;
}

type Bounds = { top: number; left: number; width: number; height: number };
type Placement = { spotlight: Bounds | null; top: number; left: number };

function TourContent({ onFinish }: { onFinish: () => void }) {
  const [origin] = React.useState(() => ({
    focus: document.activeElement as HTMLElement | null,
    scroll: window.scrollY,
  }));
  const [steps] = React.useState(() =>
    findTarget(SEARCH.targets) ? [SEARCH, ...STEPS] : STEPS,
  );
  const [index, setIndex] = React.useState(0);
  const [copy, setCopy] = React.useState(steps[0]);
  const [placement, setPlacement] = React.useState<Placement | null>(null);
  const card = React.useRef<HTMLDivElement>(null);
  const next = React.useRef<HTMLButtonElement>(null);
  const id = React.useId();

  React.useLayoutEffect(() => {
    let frame = 0;
    let currentTarget: HTMLElement | null = null;
    const observer = new ResizeObserver(() => schedule());
    function update() {
      const step = steps[index];
      const target = findTarget(step.targets);
      setCopy({
        ...step,
        title: target?.title ?? step.title,
        body: target?.body ?? step.body,
      });
      if (target?.element !== currentTarget) {
        if (currentTarget) observer.unobserve(currentTarget);
        currentTarget = target?.element ?? null;
        if (currentTarget) observer.observe(currentTarget);
      }
      const margin = 16;
      const gap = 16;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(360, viewportWidth - margin * 2);
      const height = card.current?.offsetHeight || 210;
      let rect = target?.element.getBoundingClientRect();
      if (
        rect &&
        viewportHeight - margin - rect.bottom - 6 - gap < height &&
        rect.top - 6 - gap - margin < height &&
        rect.height + 12 + height + gap + margin * 2 <= viewportHeight
      ) {
        // Make room for both the highlighted control and its instructions on short screens.
        const desiredTop =
          (viewportHeight - rect.height - 12 - height - gap) / 2;
        const distance = rect.top - 6 - desiredTop;
        if (Math.abs(distance) > 1) {
          window.scrollBy({ top: distance, behavior: "instant" });
          rect = target?.element.getBoundingClientRect();
        }
      }
      const spotlight =
        rect && rect.bottom > 0 && rect.top < viewportHeight
          ? {
              top: Math.max(4, rect.top - 6),
              left: Math.max(4, rect.left - 6),
              width: Math.max(
                0,
                Math.min(viewportWidth - 4, rect.right + 6) -
                  Math.max(4, rect.left - 6),
              ),
              height: Math.max(
                0,
                Math.min(viewportHeight - 4, rect.bottom + 6) -
                  Math.max(4, rect.top - 6),
              ),
            }
          : null;
      let top = (viewportHeight - height) / 2;
      let left = (viewportWidth - width) / 2;
      if (spotlight) {
        left = spotlight.left + spotlight.width / 2 - width / 2;
        top = spotlight.top + spotlight.height + gap;
        if (top + height > viewportHeight - margin) {
          top = spotlight.top - height - gap;
        }
      }
      setPlacement({
        spotlight,
        top: Math.max(margin, Math.min(top, viewportHeight - height - margin)),
        left: Math.max(margin, Math.min(left, viewportWidth - width - margin)),
      });
    }
    function schedule() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    }
    const target = findTarget(steps[index].targets);
    if (target) {
      const rect = target.element.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight - 240) {
        target.element.scrollIntoView({ block: "center", behavior: "instant" });
      }
    }
    update();
    schedule();
    if (card.current) observer.observe(card.current);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [index, steps]);

  const spotlight = placement?.spotlight;
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className="fixed inset-0 z-[60]"
        aria-hidden="true"
      >
        {spotlight ? (
          <>
            <div
              className="absolute inset-x-0 top-0 bg-black/50"
              style={{ height: spotlight.top }}
            />
            <div
              className="absolute left-0 bg-black/50"
              style={{
                top: spotlight.top,
                width: spotlight.left,
                height: spotlight.height,
              }}
            />
            <div
              className="absolute right-0 bg-black/50"
              style={{
                top: spotlight.top,
                left: spotlight.left + spotlight.width,
                height: spotlight.height,
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 bg-black/50"
              style={{ top: spotlight.top + spotlight.height }}
            />
            <div
              data-tour-spotlight=""
              className="pointer-events-none absolute rounded-lg border-2 border-primary ring-4 ring-white/70"
              style={spotlight}
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-black/50" />
        )}
      </DialogPrimitive.Overlay>
      <DialogPrimitive.Content
        ref={card}
        className="fixed z-[61] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[360px] overflow-y-auto rounded-xl border border-border bg-card p-5 text-card-foreground shadow-pop outline-none"
        style={{ top: placement?.top ?? 16, left: placement?.left ?? 16 }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          next.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          window.scrollTo({ top: origin.scroll, behavior: "instant" });
          const focus = origin.focus?.isConnected
            ? origin.focus
            : findTarget(STEPS[STEPS.length - 1].targets)?.element;
          focus?.focus({ preventScroll: true });
        }}
        onPointerDownOutside={(event) => event.preventDefault()}
        aria-describedby={`${id}-description`}
      >
        <div className="flex items-center justify-between gap-3">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider text-primary"
            aria-live="polite"
            aria-atomic="true"
          >
            Quick tour · {index + 1} of {steps.length}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="-mr-2 text-muted-foreground"
            onClick={onFinish}
          >
            Skip
          </Button>
        </div>
        <div aria-live="polite" aria-atomic="true">
          <DialogPrimitive.Title className="mt-3 font-display text-lg font-semibold leading-snug">
            {copy.title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            id={`${id}-description`}
            className="mt-2 text-sm leading-relaxed text-muted-foreground"
          >
            {copy.body}
          </DialogPrimitive.Description>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={index === 0}
            onClick={() => setIndex((value) => value - 1)}
          >
            <ArrowLeft aria-hidden="true" /> Back
          </Button>
          <Button
            ref={next}
            size="sm"
            onClick={() =>
              index === steps.length - 1
                ? onFinish()
                : setIndex((value) => value + 1)
            }
          >
            {index === steps.length - 1 ? "Finish" : "Next"}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function GuidedTour({
  open,
  onFinish,
}: {
  open: boolean;
  onFinish: () => void;
}) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onFinish();
      }}
    >
      {open ? <TourContent onFinish={onFinish} /> : null}
    </DialogPrimitive.Root>
  );
}
