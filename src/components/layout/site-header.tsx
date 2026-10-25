"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "@/components/ui/icons";
import { ProfAuraLogo } from "@/components/brand/profaura-logo";
import {
  AccountMenu,
  AccountSheetActions,
} from "@/components/layout/account-menu";
import type { HeaderAccount } from "@/components/layout/account-menu";
import { BrowseMenu } from "@/components/layout/browse-menu";
import { GuideButton } from "@/components/layout/site-experience";
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
import { CATEGORY_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";
const NAV = [
  { label: "Rankings", href: "/rankings" },
  { label: "Courses", href: "/courses" },
  { label: "Recommendations", href: "/recommendations" },
];
export function SiteHeader({ account }: { account: HeaderAccount | null }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);
  const active = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  return (
    <header className="glass-bar sticky top-0 z-40 w-full border-b border-border">
      <div className="container flex h-16 items-center justify-between gap-2 sm:gap-4">
        <div className="flex min-w-0 shrink-0 items-center gap-4">
          <ProfAuraLogo size="md" />
          <div className="hidden border-l border-border pl-4 xl:block">
            <p className="text-[11px] font-semibold tracking-wide">
              Student perspectives
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              SMIU Feedback Platform
            </p>
          </div>
        </div>
        <nav
          aria-label="Main"
          className="ml-auto hidden items-center gap-1 lg:flex"
        >
          <BrowseMenu />
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className={cn(
                "nav-underline relative px-3 py-2 text-[13px] font-medium",
                active(item.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
          <GuideButton className="px-3 py-2 text-[13px]">Help</GuideButton>
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {account ? (
            <Button asChild size="sm" variant="outline">
              <Link
                href={account.isAdmin ? "/admin" : "/student"}
                aria-current={
                  active(account.isAdmin ? "/admin" : "/student")
                    ? "page"
                    : undefined
                }
              >
                {account.isAdmin ? "Admin" : "My area"}
              </Link>
            </Button>
          ) : null}
          <ThemeToggle />
          <AccountMenu account={account} />
        </div>
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          {account ? (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="px-2 text-xs sm:px-3 sm:text-sm"
            >
              <Link href={account.isAdmin ? "/admin" : "/student"}>
                {account.isAdmin ? "Admin" : "My area"}
              </Link>
            </Button>
          ) : null}
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open menu">
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[88%] max-w-sm overflow-y-auto"
            >
              <SheetHeader>
                <ProfAuraLogo size="sm" href={null} animateMark={false} />
                <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                <SheetDescription className="sr-only">
                  Explore campus feedback or open your student account.
                </SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile" className="mt-8">
                <p className="eyebrow mb-3">Explore feedback</p>
                {CATEGORY_NAV.map((item) => (
                  <SheetClose key={item.href} asChild>
                    <Link
                      href={item.href}
                      aria-current={active(item.href) ? "page" : undefined}
                      className={cn(
                        "block rounded-md px-3 py-3 text-sm",
                        active(item.href)
                          ? "bg-secondary font-medium text-primary"
                          : "hover:bg-secondary",
                      )}
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                <div className="my-4 border-t border-border" />
                {NAV.map((item) => (
                  <SheetClose key={item.href} asChild>
                    <Link
                      href={item.href}
                      className="block rounded-md px-3 py-3 text-sm hover:bg-secondary"
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                <GuideButton
                  onOpen={() => setOpen(false)}
                  className="px-3 py-3 text-sm"
                >
                  How to use this site
                </GuideButton>
              </nav>
              <AccountSheetActions account={account} />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
