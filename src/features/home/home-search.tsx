"use client";

import * as React from "react";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

/*
  HomeSearch - homepage ka primary action: teacher ya course dhoondo.

  Do modes hain kyunke dono cheezein alag routes par rehti hain. Segmented
  control aria-pressed ke saath hai (asli buttons, koi fake tabs nahi), aur
  submit karne par user seedha usi directory par chala jata hai jahan uski
  query pehle se lagi hui hoti hai - is liye result shareable bhi hota hai.

  Yahan koi data fetch nahi hota: search server par us page ke andar hoti hai.
*/

type Mode = "teachers" | "courses";

const MODES: readonly { value: Mode; label: string; placeholder: string }[] = [
  { value: "teachers", label: "Teachers", placeholder: "Search a teacher by name" },
  { value: "courses", label: "Courses", placeholder: "Search a course by title or code" },
] as const;

export function HomeSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("teachers");
  const [query, setQuery] = React.useState("");
  const inputId = React.useId();

  const active = MODES.find((item) => item.value === mode)!;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    router.push(term ? `/${mode}?q=${encodeURIComponent(term)}` : `/${mode}`);
  }

  return (
    <form role="search" onSubmit={onSubmit} className={cn("w-full max-w-xl", className)}>
      {/*
        Segmented control ka border pehle bohat halka tha (border-border), is
        liye control chrome me gum ho jata tha. Ab group par ink-300 ka thin
        border + surface background hai, aur selected button ka apna border
        hai. Unselected par bhi border rakha hai magar transparent, warna
        select karte waqt 1px ka layout shift hota.
      */}
      <div
        role="group"
        aria-label="Search for"
        className="inline-flex items-center gap-1 rounded-lg border border-ink-300 bg-surface p-1 shadow-xs"
      >
        {MODES.map((item) => {
          const isActive = item.value === mode;
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => setMode(item.value)}
              className={cn(
                "h-8 rounded-md border px-3.5 text-[0.8125rem] font-medium",
                "transition-[background-color,color,border-color] duration-150 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
                isActive
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:text-indigo-200"
                  : "border-transparent text-ink-600 hover:border-ink-300 hover:bg-background hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <label htmlFor={inputId} className="sr-only">
        {active.placeholder}
      </label>

      {/*
        Input wrapper par apna focus treatment hai: browser ki default blue
        outline hata di gayi hai (globals.css me), uski jagah primary border +
        halka ring aata hai. Focus indication khatam nahi ki gayi, sirf
        ProfAura ke rang me badli gayi hai.
      */}
      <div
        className={cn(
          "group mt-3 flex items-center rounded-lg border border-ink-300 bg-background shadow-xs",
          "transition-[border-color,box-shadow] duration-150 ease-out",
          "hover:border-ink-400",
          "focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/35",
        )}
      >
        <Search
          aria-hidden="true"
          className="pointer-events-none ml-3.5 size-[1.05rem] shrink-0 text-ink-400 transition-colors duration-150 ease-out group-focus-within:text-primary"
        />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={active.placeholder}
          autoComplete="off"
          maxLength={80}
          className="h-12 w-full bg-transparent px-3 text-[0.9375rem] text-foreground outline-none placeholder:text-ink-400 [&::-webkit-search-cancel-button]:appearance-none"
        />
        <button
          type="submit"
          className="mr-1.5 inline-flex h-9 shrink-0 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors duration-150 ease-out hover:bg-indigo-600 active:translate-y-px active:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Search
        </button>
      </div>
    </form>
  );
}
