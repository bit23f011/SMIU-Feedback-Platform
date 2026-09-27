import * as React from "react";

import Link from "next/link";

import { ProfAuraLogo } from "@/components/brand/profaura-logo";
import { FOOTER_NAV, SITE } from "@/lib/constants";

/*
  Site footer - compact, server component.

  Sirf char cheezein: brand, platform line, zaroori navigation, copyright.
  Category list dobara nahi aati (navbar me pehle se hai) aur koi product
  paragraph nahi. Footer padha nahi jata, us se navigate kiya jata hai.
*/
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="container flex flex-col gap-5 py-7 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="flex flex-col gap-1">
          <ProfAuraLogo size="sm" animateMark={false} />
          <p className="text-xs text-muted-foreground">{SITE.platformLine}</p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          {FOOTER_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="link-underline text-sm text-ink-600 transition-colors duration-150 ease-out hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="container border-t border-border py-4">
        <p className="text-xs text-muted-foreground">
          © {year} {SITE.name}. Designed and built by a Solo Full Stack Developer.
        </p>
      </div>
    </footer>
  );
}
