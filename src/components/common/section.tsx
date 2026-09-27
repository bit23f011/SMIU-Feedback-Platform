import * as React from "react";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/*
  Section - homepage aur inner pages ka repeating block.
  Vertical rhythm ek hi jagah set hai (py-14 / md:py-16) taake poore product me
  spacing ek jaisi rahe. Heading optional hai.
*/
export interface SectionProps {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  /** "See all" type link. */
  link?: { href: string; label: string };
  /** Halka tinted background (page par alternate karne ke liye). */
  tinted?: boolean;
  className?: string;
  containerClassName?: string;
  children: React.ReactNode;
}

export function Section({
  id,
  eyebrow,
  title,
  description,
  link,
  tinted = false,
  className,
  containerClassName,
  children,
}: SectionProps) {
  const headingId = title ? `${id ?? "section"}-heading` : undefined;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("py-14 md:py-16", tinted && "border-y border-border bg-surface", className)}
    >
      <div className={cn("container", containerClassName)}>
        {title || description || link ? (
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              {eyebrow ? (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-coral-600">
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <h2 id={headingId} className="text-2xl font-semibold text-foreground md:text-[1.75rem]">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {link ? (
              <Link
                href={link.href}
                className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary transition-colors duration-150 ease-out hover:text-indigo-700"
              >
                {link.label}
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                />
              </Link>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}
