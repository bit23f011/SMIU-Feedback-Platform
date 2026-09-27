"use client";

import * as React from "react";

import Link from "next/link";
import { LayoutDashboard, LogOut, Shield, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

/*
  Navbar ka account area.

  YAAD RAHE: yeh sirf UI hai. Signed-in dikhna ya na dikhna koi security nahi.
  Asli gate do jagah hai: (1) server layouts me requireStudent()/requireAdmin(),
  aur (2) Supabase RLS. Agar koi banda React state se khud ko "admin" bhi bana le
  to bhi DB usay kuch nahi degi.

  Email poora nahi dikhate list me - sirf local part (@ se pehle), taake kisi ke
  screen/screenshot se poora address na pare. Menu ke andar poora dikhta hai.
*/

export interface HeaderAccount {
  email: string;
  isAdmin: boolean;
}

function localPart(email: string): string {
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

function initial(email: string): string {
  return (email.trim()[0] ?? "?").toUpperCase();
}

/** Sign out ek POST form hai - GET link se sign out CSRF-prone hota hai. */
function SignOutForm({ className }: { className?: string }) {
  return (
    <form action={signOutAction} className={className}>
      <button
        type="submit"
        className={cn(
          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-ink-700",
          "transition-colors duration-150 ease-out hover:bg-ink-100 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <LogOut aria-hidden="true" className="size-4 text-ink-400" />
        Sign out
      </button>
    </form>
  );
}

/** Desktop: signed out par do buttons, signed in par avatar dropdown. */
export function AccountMenu({ account }: { account: HeaderAccount | null }) {
  if (!account) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        {/*
          Sign in: background wohi quiet ghost wala hai, magar ab border visible
          hai taake button chrome me gum na ho. Hover par `border-travel` do
          overlay borders ko top-centre se ulti simton me neeche chalata hai
          (daayan hissa daayein se, baayan hissa baayein se). Sirf border chalta
          hai - koi glow, koi movement, koi scaling nahi.
        */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className={cn(
            "border-travel border border-input bg-background text-ink-700",
            "hover:bg-ink-50 hover:text-foreground",
          )}
        >
          <Link href="/auth/login">Sign in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/auth/signup">Create account</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="hidden items-center md:flex">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-9 items-center gap-2 rounded-md border border-border bg-background pl-1.5 pr-2.5",
              "text-sm font-medium text-ink-700",
              "transition-colors duration-150 ease-out hover:bg-ink-50 hover:text-foreground",
              "data-[state=open]:bg-ink-50 data-[state=open]:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <span
              aria-hidden="true"
              className="flex size-6 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold text-white"
            >
              {initial(account.email)}
            </span>
            <span className="max-w-[10rem] truncate">{localPart(account.email)}</span>
            <span className="sr-only">Account menu</span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={8} className="w-60">
          <DropdownMenuLabel className="font-normal">
            <span className="block text-xs text-muted-foreground">Signed in as</span>
            <span className="block truncate font-medium text-foreground">{account.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href="/student" className="gap-2">
              <LayoutDashboard aria-hidden="true" className="size-4 text-ink-400" />
              My area
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/student/favorites" className="gap-2">
              <User aria-hidden="true" className="size-4 text-ink-400" />
              Favourites
            </Link>
          </DropdownMenuItem>

          {account.isAdmin ? (
            <DropdownMenuItem asChild>
              <Link href="/admin" className="gap-2">
                <Shield aria-hidden="true" className="size-4 text-ink-400" />
                Admin
              </Link>
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSeparator />
          <SignOutForm className="px-1 py-0.5" />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Mobile sheet ka neeche wala account block. */
export function AccountSheetActions({ account }: { account: HeaderAccount | null }) {
  if (!account) {
    return (
      <div className="mt-6 flex flex-col gap-2 border-t border-border pt-5">
        <Button asChild variant="outline" className="border-travel">
          <Link href="/auth/login">Sign in</Link>
        </Button>
        <Button asChild>
          <Link href="/auth/signup">Create account</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3 border-t border-border pt-5">
      <p className="px-1 text-xs leading-snug text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{account.email}</span>
      </p>

      <div className="flex flex-col gap-2">
        <Button asChild variant="outline">
          <Link href="/student">My area</Link>
        </Button>
        {account.isAdmin ? (
          <Button asChild variant="outline">
            <Link href="/admin">Admin</Link>
          </Button>
        ) : null}
      </div>

      <form action={signOutAction}>
        <Button type="submit" variant="ghost" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}
