"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { loadPublicProfile } from "@/features/people/profile-preview-action";
import type { PersonProfileData } from "@/features/people/profile-data";
import { PersonProfileView } from "@/features/people/person-profile-view";
import { ProfileRefreshContext } from "@/features/people/profile-refresh";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function PublicProfilePreview({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<PersonProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [profileHref, setProfileHref] = useState("");
  const request = useRef(0);
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    request.current += 1;
    setOpen(false);
  }, [pathname]);

  function close(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) request.current += 1;
  }
  async function showProfile(url: URL) {
    const currentRequest = ++request.current;
    setOpen(true);
    setLoading(true);
    setError(false);
    setProfileHref(url.pathname + url.search + url.hash);
    try {
      const result = await loadPublicProfile(
        decodeURIComponent(url.pathname.split("/")[2]),
        {
          page: url.searchParams.get("page") ?? undefined,
          course: url.searchParams.get("course") ?? undefined,
          semester: url.searchParams.get("semester") ?? undefined,
        },
      );
      if (request.current !== currentRequest) return;
      setContent(result);
      viewport.current?.scrollTo({ top: 0 });
    } catch {
      if (request.current === currentRequest) setError(true);
    } finally {
      if (request.current === currentRequest) setLoading(false);
    }
  }
  function captureProfileLink(event: MouseEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor =
      event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (
      !(anchor instanceof HTMLAnchorElement) ||
      anchor.target === "_blank" ||
      anchor.hasAttribute("download") ||
      anchor.dataset.profileNavigation === "full"
    )
      return;
    const url = new URL(anchor.href);
    if (
      url.origin !== window.location.origin ||
      !/^\/people\/[^/]+\/?$/.test(url.pathname)
    )
      return;
    event.preventDefault();
    void showProfile(url);
  }
  return (
    <div onClickCapture={captureProfileLink}>
      {children}
      <Dialog open={open} onOpenChange={close}>
        <DialogContent
          ref={viewport}
          className="profile-modal max-h-[90dvh] max-w-5xl gap-0 border-campus-border bg-campus-soft p-0"
        >
          <DialogTitle className="sr-only">Profile feedback</DialogTitle>
          <DialogDescription className="sr-only">
            Explore this profile, ratings and student reviews. Scroll for more
            details.
          </DialogDescription>
          {loading ? (
            <p role="status" className="p-8 text-sm text-muted-foreground">
              Loading profile feedback…
            </p>
          ) : error ? (
            <div className="space-y-4 p-8">
              <p role="alert" className="text-sm text-muted-foreground">
                We could not load this profile. Please try again.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() =>
                    void showProfile(
                      new URL(profileHref, window.location.origin),
                    )
                  }
                >
                  Try again
                </Button>
                <Button asChild variant="outline">
                  <Link href={profileHref} data-profile-navigation="full">
                    Open full profile
                  </Link>
                </Button>
              </div>
            </div>
          ) : content ? (
            <ProfileRefreshContext.Provider
              value={() =>
                void showProfile(new URL(profileHref, window.location.origin))
              }
            >
              <PersonProfileView
                key={`${content.person.id}-${content.page}`}
                data={content}
                modal
              />
            </ProfileRefreshContext.Provider>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
