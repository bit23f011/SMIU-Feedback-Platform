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
import { GuidedTour } from "@/components/layout/guided-tour";

const GUIDE_KEY = "profaura:tour:v1";
function guideSeen() {
  try {
    return localStorage.getItem(GUIDE_KEY) === "seen";
  } catch {
    return false;
  }
}
type ExperienceContext = {
  openGuide: () => void;
  announce: (notices: NotificationRow[]) => void;
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
  const [notices, setNotices] = React.useState<NotificationRow[]>([]);
  const notice = notices[0] ?? null;
  const seenNotices = React.useRef(new Set<string>());
  const initialized = React.useRef(false);
  React.useEffect(() => {
    if (initialized.current || /^\/(admin|student|auth)(\/|$)/.test(pathname))
      return;
    initialized.current = true;
    setGuideOpen(!guideSeen());
  }, [pathname]);
  const openGuide = React.useCallback(() => {
    setReady(true);
    setGuideOpen(true);
  }, []);
  const announce = React.useCallback((incoming: NotificationRow[]) => {
    const unseen = incoming.filter(
      (item) =>
        !seenNotices.current.has(noticeKey(item)) && !wasSeen(noticeKey(item)),
    );
    for (const item of unseen) seenNotices.current.add(noticeKey(item));
    setNotices((current) => [...current, ...unseen]);
    setReady(true);
  }, []);
  function closeGuide() {
    setGuideOpen(false);
    try {
      localStorage.setItem(GUIDE_KEY, "seen");
    } catch {
      /* The tour can still be skipped when browser storage is unavailable. */
    }
  }
  function dismissNotice(open: boolean) {
    if (!open && notice) {
      remember(noticeKey(notice));
      setNotices((current) => current.slice(1));
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
      <GuidedTour
        key={pathname}
        open={
          ready &&
          guideOpen &&
          !notice &&
          !/^\/(admin|auth)(\/|$)/.test(pathname)
        }
        onFinish={closeGuide}
      />
      <Dialog open={ready && Boolean(notice)} onOpenChange={dismissNotice}>
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
              {notices.length > 1 ? "Next" : "Done"}
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
  tourTarget = false,
}: {
  className?: string;
  children?: React.ReactNode;
  onOpen?: () => void;
  tourTarget?: boolean;
}) {
  const { openGuide } = useSiteExperience();
  return (
    <button
      type="button"
      data-tour={tourTarget ? "help" : undefined}
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
