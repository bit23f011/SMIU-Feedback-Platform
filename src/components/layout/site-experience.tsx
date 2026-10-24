"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NotificationRow } from "@/features/notifications/types";
import { cn } from "@/lib/utils";

const GUIDE_KEY = "profaura:guide:2026-v2";
const GUIDE = [
  {
    title: "Explore before you decide",
    body: "Read teacher, lab and campus staff feedback. No account is needed to browse.",
  },
  {
    title: "Review your own experience",
    body: "Sign in as an SMIU student. Pick a profile, course and semester, then answer the questions.",
  },
  {
    title: "Keep it useful and respectful",
    body: "Share first-hand details. Leave out student names, contact details, insults and personal allegations.",
  },
  {
    title: "Your public identity stays private",
    body: "Your name and student ID stay hidden. Written comments appear after admin approval.",
  },
] as const;
type ExperienceContext = {
  openGuide: () => void;
  announce: (notice: NotificationRow) => void;
};
const Context = React.createContext<ExperienceContext | null>(null);
function noticeKey(n: NotificationRow) {
  return (
    "profaura:notice:" +
    JSON.stringify([
      n.id,
      n.title,
      n.message,
      n.priority,
      n.href,
      n.cta_label,
      n.starts_at,
      n.ends_at,
    ])
  );
}
function wasSeen(key: string) {
  try {
    return sessionStorage.getItem(key) === "seen";
  } catch {
    return false;
  }
}
function remember(key: string) {
  try {
    sessionStorage.setItem(key, "seen");
  } catch {
    /* Session works without storage. */
  }
}
const NOTICE_STYLE = {
  info: {
    label: "Campus notice",
    color: "border-indigo-200 bg-indigo-50",
    dot: "bg-primary",
  },
  success: {
    label: "Good news",
    color: "border-state-success/25 bg-state-success-soft",
    dot: "bg-state-success",
  },
  warning: {
    label: "Please take note",
    color: "border-state-warning/25 bg-state-warning-soft",
    dot: "bg-state-warning",
  },
  critical: {
    label: "Important update",
    color: "border-state-danger/25 bg-state-danger-soft",
    dot: "bg-state-danger",
  },
} as const;
export function SiteExperienceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [ready, setReady] = React.useState(false);
  const [guideOpen, setGuideOpen] = React.useState(false);
  const [notice, setNotice] = React.useState<NotificationRow | null>(null);
  const initialized = React.useRef(false);
  React.useEffect(() => {
    if (initialized.current || /^\/(admin|student|auth)(\/|$)/.test(pathname))
      return;
    initialized.current = true;
    setGuideOpen(!wasSeen(GUIDE_KEY));
    setReady(true);
  }, [pathname]);
  const openGuide = React.useCallback(() => {
    setReady(true);
    setGuideOpen(true);
  }, []);
  const announce = React.useCallback((next: NotificationRow) => {
    if (!wasSeen(noticeKey(next))) setNotice(next);
    setReady(true);
  }, []);
  function closeGuide(open: boolean) {
    setGuideOpen(open);
    if (!open) remember(GUIDE_KEY);
  }
  function dismissNotice(open: boolean) {
    if (!open && notice) {
      remember(noticeKey(notice));
      setNotice(null);
    }
  }
  const style = notice
    ? (NOTICE_STYLE[notice.priority] ?? NOTICE_STYLE.info)
    : NOTICE_STYLE.info;
  const value = React.useMemo(
    () => ({ openGuide, announce }),
    [openGuide, announce],
  );
  return (
    <Context.Provider value={value}>
      {children}
      <Dialog open={ready && guideOpen} onOpenChange={closeGuide}>
        <DialogContent className="max-h-[88dvh] max-w-[560px] overflow-y-auto p-0">
          <div className="border-b border-border bg-surface px-6 pb-6 pt-7 sm:px-8">
            <p className="eyebrow">A student perspective</p>
            <DialogTitle className="editorial-title mt-3 text-[1.8rem] leading-tight">
              Welcome to SMIU feedback.
            </DialogTitle>
            <DialogDescription className="mt-3 max-w-md leading-relaxed">
              A little guidance before you explore. Your experience can help the
              next student.
            </DialogDescription>
          </div>
          <ol className="space-y-4 px-6 py-5 sm:space-y-5 sm:px-8 sm:py-6">
            {GUIDE.map((item, index) => (
              <li key={item.title} className="flex gap-4">
                <span className="pt-0.5 text-xs font-medium tabular-nums text-primary">
                  0{index + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-5 sm:px-8">
            <p className="max-w-[250px] text-xs leading-relaxed text-muted-foreground">
              Independent student feedback. Not an official university service.
            </p>
            <Button onClick={() => closeGuide(false)}>Start exploring</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={ready && !guideOpen && Boolean(notice)}
        onOpenChange={dismissNotice}
      >
        <DialogContent
          className={cn(
            "max-h-[85dvh] overflow-y-auto p-7 sm:p-8",
            style.color,
          )}
        >
          <p className="eyebrow flex items-center gap-2">
            <span className={cn("size-2 rounded-full", style.dot)} />
            {style.label}
          </p>
          <DialogTitle className="editorial-title mt-2 text-2xl leading-tight">
            {notice?.title || "An update for our community"}
          </DialogTitle>
          <DialogDescription className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
            {notice?.message}
          </DialogDescription>
          <div className="mt-3 flex flex-wrap gap-3">
            {notice?.href && notice.cta_label ? (
              <Button asChild>
                <Link href={notice.href} onClick={() => dismissNotice(false)}>
                  {notice.cta_label}
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => dismissNotice(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Context.Provider>
  );
}
export function useSiteExperience() {
  const context = React.useContext(Context);
  if (!context) throw new Error("SiteExperienceProvider is required");
  return context;
}
export function GuideButton({
  className,
  children = "How to use this site",
  onOpen,
}: {
  className?: string;
  children?: React.ReactNode;
  onOpen?: () => void;
}) {
  const { openGuide } = useSiteExperience();
  return (
    <button
      type="button"
      onClick={() => {
        onOpen?.();
        openGuide();
      }}
      className={cn(
        "text-sm text-muted-foreground transition-colors hover:text-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}
