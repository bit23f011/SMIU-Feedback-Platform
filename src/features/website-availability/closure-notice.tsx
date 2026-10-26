import * as React from "react";
import Link from "next/link";
import { HeartHandshake, Lock } from "@/components/ui/icons";
import { SITE } from "@/lib/constants";
import type { WebsiteSettings } from "./types";

export function ClosureNotice({
  settings,
  unavailable = false,
  preview = false,
}: {
  settings: WebsiteSettings;
  unavailable?: boolean;
  preview?: boolean;
}) {
  const titleId = preview ? "closure-preview-heading" : "closure-heading";
  const Heading = preview ? "h3" : "h1";
  return (
    <section
      aria-labelledby={titleId}
      className={`relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm ${preview ? "p-6" : "p-7 sm:p-12"}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-400 via-indigo-600 to-coral-300"
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <p className="text-xs font-semibold tracking-wide text-foreground">
          {SITE.platformLine}
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-[11px] text-muted-foreground">
          <Lock className="size-3" aria-hidden="true" />
          {unavailable ? "Currently unavailable" : "Website closed"}
        </span>
      </div>
      <div className={preview ? "py-8" : "py-10 sm:py-14"}>
        {settings.greeting && !unavailable ? (
          <p className="mb-4 break-words text-sm font-medium text-primary">
            {settings.greeting}
          </p>
        ) : null}
        <Heading
          id={titleId}
          className={`break-words font-display font-semibold leading-tight tracking-tight text-foreground ${preview ? "text-3xl" : "text-4xl sm:text-5xl"}`}
        >
          {unavailable
            ? "We’re unable to load the website right now."
            : settings.title}
        </Heading>
        <p className="mt-6 whitespace-pre-line break-words text-sm leading-7 text-muted-foreground sm:text-base">
          {unavailable
            ? "Please check back shortly. Thank you for your patience."
            : settings.message}
        </p>
      </div>
      {!unavailable && (settings.farewell || settings.signature) ? (
        <div className="flex items-start gap-3 rounded-xl bg-surface p-5">
          <HeartHandshake
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-primary"
          />
          <div className="min-w-0">
            {settings.farewell ? (
              <p className="whitespace-pre-line break-words text-sm leading-6 text-foreground">
                {settings.farewell}
              </p>
            ) : null}
            {settings.signature ? (
              <p className="mt-2 break-words text-xs font-semibold text-muted-foreground">
                — {settings.signature}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {!preview ? (
        <footer className="mt-7 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span>Thank you for visiting.</span>
          <Link
            href="/auth/login?next=/admin/website"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Administrator sign in
          </Link>
        </footer>
      ) : null}
    </section>
  );
}
