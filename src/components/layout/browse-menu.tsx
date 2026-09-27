"use client";

import * as React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { CATEGORY_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

/*
  Browse menu - sirf navigation. Koi paragraph, koi description, koi marketing.

  Behaviour:
   - Hover wale devices (mouse/trackpad) par pointer aate hi khulta hai aur
     pointer andar rehne tak khula rehta hai. Panel trigger ke sath jura hua hai
     (padding se gap banaya hai, margin se nahi) taake beech me pointer na gire.
   - Touch par hover ka koi matlab nahi, is liye wahan tap se khulta/band hota hai.
   - Keyboard: Enter/Space/ArrowDown se khulta hai, arrows se items ke beech
     chalte hain, Escape band kar ke trigger par focus wapas karta hai.
   - Focus menu se bahar jaye to khud band ho jata hai.
*/

function hoverCapable(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function BrowseMenu({ className }: { className?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const itemsRef = React.useRef<(HTMLAnchorElement | null)[]>([]);

  const active = CATEGORY_NAV.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  // Route badalte hi menu band - warna navigate ke baad khula reh jata hai.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const close = React.useCallback((focusTrigger = false) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const focusItem = React.useCallback((index: number) => {
    const items = itemsRef.current.filter(Boolean) as HTMLAnchorElement[];
    if (items.length === 0) return;
    const next = ((index % items.length) + items.length) % items.length;
    items[next]?.focus();
  }, []);

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
      window.setTimeout(() => focusItem(0), 0);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    if (!open) return;

    const items = itemsRef.current.filter(Boolean) as HTMLAnchorElement[];
    const current = items.indexOf(document.activeElement as HTMLAnchorElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem(current + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem(current <= 0 ? items.length - 1 : current - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusItem(items.length - 1);
    }
  }

  function onBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
    }
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      onPointerEnter={() => {
        if (hoverCapable()) setOpen(true);
      }}
      onPointerLeave={() => {
        if (hoverCapable()) setOpen(false);
      }}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="browse-menu-panel"
        data-active={active ? "true" : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "nav-underline group relative inline-flex h-9 items-center gap-1 rounded-md px-3",
          "text-sm font-medium transition-colors duration-150 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          active || open ? "text-foreground" : "text-ink-600 hover:text-foreground",
        )}
      >
        Browse
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 text-ink-400 transition-transform duration-200 ease-out",
            open && "rotate-180",
          )}
        />
      </button>

      {/*
        pt-3 se trigger aur panel ke beech ka fasla banta hai magar hit-area
        juri rehti hai, is liye pointer neeche jate hue menu band nahi hota.
      */}
      {open ? (
        <div className="absolute left-0 top-full z-50 pt-3">
          <div
            id="browse-menu-panel"
            role="menu"
            aria-label="Browse categories"
            className="w-52 animate-slide-down rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-pop"
          >
            {CATEGORY_NAV.map((item, index) => {
              const itemActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  ref={(node) => {
                    itemsRef.current[index] = node;
                  }}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex h-9 items-center rounded-md px-2.5 text-sm font-medium outline-none",
                    "transition-colors duration-150 ease-out",
                    "hover:bg-ink-100 focus-visible:bg-ink-100",
                    itemActive ? "text-foreground" : "text-ink-700 hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
