"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
type Mode = "teachers" | "courses";
const MODES = [
  {
    value: "teachers" as const,
    label: "Find a teacher",
    placeholder: "Teacher name",
  },
  {
    value: "courses" as const,
    label: "Find a course",
    placeholder: "Course title or code",
  },
];
export function HomeSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("teachers");
  const [query, setQuery] = React.useState("");
  const id = React.useId();
  const active = MODES.find((m) => m.value === mode)!;
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push(
      "/" +
        mode +
        (query.trim() ? "?q=" + encodeURIComponent(query.trim()) : ""),
    );
  }
  return (
    <form
      role="search"
      onSubmit={submit}
      className={cn("home-search", className)}
    >
      <div
        className="flex gap-6 border-b border-border px-5"
        role="group"
        aria-label="Search for"
      >
        {MODES.map((item) => (
          <button
            type="button"
            key={item.value}
            aria-pressed={mode === item.value}
            onClick={() => setMode(item.value)}
            className={cn(
              "relative py-4 text-[13px] font-semibold transition-colors",
              mode === item.value
                ? "text-primary after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <Search
          className="ml-1 size-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <label htmlFor={id} className="sr-only">
          {active.placeholder}
        </label>
        <input
          id={id}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={active.placeholder}
          autoComplete="off"
          maxLength={80}
          className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <span className="hidden sm:inline">Search</span>
          <ArrowRight className="size-4" aria-hidden="true" />
          <span className="sr-only sm:hidden">Search</span>
        </button>
      </div>
    </form>
  );
}
