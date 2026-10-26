"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getSearchSuggestions,
  type SearchSuggestion,
} from "@/features/home/search-suggestions-action";
import { Search, ArrowRight } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
type Mode = "people" | "courses";
const MODES = [
  {
    value: "people" as const,
    label: "Find a person",
    placeholder: "Teacher, faculty or staff name",
  },
  {
    value: "courses" as const,
    label: "Find a course",
    placeholder: "Course title or code",
  },
];
export function HomeSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("people");
  const [query, setQuery] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<SearchSuggestion[]>([]);
  const [focused, setFocused] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const id = React.useId();
  const active = MODES.find((m) => m.value === mode)!;
  React.useEffect(() => {
    let cancelled = false;
    setSuggestions([]);
    setFailed(false);
    setLoading(Boolean(query.trim()));
    if (!query.trim()) return;
    const timer = window.setTimeout(async () => {
      try {
        const result = await getSearchSuggestions(mode, query);
        if (!cancelled) {
          setSuggestions(result.suggestions);
          setFailed(result.failed);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, query]);
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
      data-tour="search"
      onSubmit={submit}
      className={cn("home-search relative", className)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setFocused(false);
      }}
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
          onChange={(e) => {
            setQuery(e.target.value);
            setFocused(true);
          }}
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
      {focused && query.trim() ? (
        <div
          id={`${id}-suggestions`}
          aria-label="Search suggestions"
          className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-lg border border-border bg-background shadow-lg"
        >
          {loading || failed || !suggestions.length ? (
            <p
              role="status"
              className="px-5 py-4 text-sm text-muted-foreground"
            >
              {loading
                ? "Searching…"
                : failed
                  ? "Search is temporarily unavailable. Try again."
                  : "No matches yet."}
            </p>
          ) : (
            <ul className="list-none py-1">
              {suggestions.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => setFocused(false)}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {item.detail}
                      </span>
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-primary"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </form>
  );
}
