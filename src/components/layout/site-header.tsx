"use client";

import * as React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { ProfAuraLogo } from "@/components/brand/profaura-logo";
import { AccountMenu, AccountSheetActions } from "@/components/layout/account-menu";
import type { HeaderAccount } from "@/components/layout/account-menu";
import { BrowseMenu } from "@/components/layout/browse-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CATEGORY_NAV, PRIMARY_NAV, SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

/*
  SiteHeader - compact navbar.

  Brand block me logo + "ProfAura" hai, uske sath ek chhoti secondary line
  "SMIU Feedback Platform" (sirf bare screens par). Poora university naam yahan
  nahi aata: wo navbar ko lamba karta tha aur har page par dohraya jata tha.

  Tab hover: neeche se ek patli coral underline (.nav-underline utility).
  Active tab par wohi underline jami rehti hai. Koi pill, koi background block.

  Header khud koi auth ya permission decision nahi leta - yeh sirf dikhawa hai.
  Asli gate server layouts (requireStudent/requireAdmin) aur RLS me hai.
*/

const navLinkClasses = [
  "nav-underline relative inline-flex h-9 items-center rounded-md px-3",
  "text-sm font-medium transition-colors duration-150 ease-out",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
].join(" ");

export function SiteHeader({ account }: { account: HeaderAccount | null }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const isActive = React.useCallback(
    (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    [pathname],
  );

  // Route badalne par mobile sheet band.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="glass-bar sticky top-0 z-40 w-full border-b border-border">
      <div className="container flex h-16 items-center gap-4">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-3">
          <ProfAuraLogo size="md" />
          <span aria-hidden="true" className="hidden h-5 w-px bg-border lg:block" />
          <span className="hidden truncate text-xs font-medium text-muted-foreground lg:block">
            {SITE.platformLine}
          </span>
        </div>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 md:flex">
          <BrowseMenu />

          {PRIMARY_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-active={active ? "true" : undefined}
                className={cn(
                  navLinkClasses,
                  active ? "text-foreground" : "text-ink-600 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-1.5 md:flex">
          <ThemeToggle />
          <AccountMenu account={account} />
        </div>

        {/* Mobile */}
        <div className="ml-auto flex items-center gap-1.5 md:hidden">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open menu">
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-[88%] max-w-xs overflow-y-auto">
              <SheetHeader>
                <ProfAuraLogo size="sm" href={null} animateMark={false} />
                <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                <SheetDescription className="sr-only">
                  Browse categories, explore rankings and courses, or sign in.
                </SheetDescription>
              </SheetHeader>

              <nav aria-label="Mobile" className="mt-2 flex flex-col">
                <p className="px-1 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Browse
                </p>
                {CATEGORY_NAV.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className={cn(
                        "flex h-10 items-center rounded-md px-2 text-sm font-medium",
                        "transition-colors duration-150 ease-out hover:bg-ink-100",
                        isActive(item.href) ? "text-foreground" : "text-ink-700",
                      )}
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}

                <p className="mt-4 px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Explore
                </p>
                {PRIMARY_NAV.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className={cn(
                        "flex h-10 items-center rounded-md px-2 text-sm font-medium",
                        "transition-colors duration-150 ease-out hover:bg-ink-100",
                        isActive(item.href) ? "text-foreground" : "text-ink-700",
                      )}
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>

              <AccountSheetActions account={account} />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
