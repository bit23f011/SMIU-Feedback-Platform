"use client";

import * as React from "react";

import { Check, Laptop, Moon, Sun } from "lucide-react";

import { useTheme, type Theme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/*
  Theme switcher: Light / Dark / System.

  Trigger icon wohi dikhata hai jo abhi lagi hui hai. Server par aur pehle
  render par hum "system" maan kar chalte hain, is liye mounted hone tak
  neutral icon dikhta hai - warna hydration mismatch aata hai.
*/

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const Icon = !mounted ? Laptop : resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn("text-ink-600 hover:text-foreground", className)}
          aria-label="Change theme"
        >
          <Icon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-40">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        {OPTIONS.map((option) => {
          const OptionIcon = option.icon;
          const selected = mounted && theme === option.value;

          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => setTheme(option.value)}
              className="justify-between"
            >
              <span className="flex items-center gap-2">
                <OptionIcon aria-hidden="true" className="size-4 text-ink-500" />
                {option.label}
              </span>
              {selected ? <Check aria-hidden="true" className="size-4 text-primary" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
