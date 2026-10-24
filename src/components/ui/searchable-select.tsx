"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
}

// Selection hidden field me jati hai; search text kabhi selected ID nahi banta.
export function SearchableSelect({
  id,
  name,
  label,
  options,
  value,
  onValueChange,
  placeholder,
  disabled,
  invalid,
  describedBy,
}: {
  id: string;
  name?: string;
  label: string;
  options: SearchableOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  const container = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const list = React.useRef<HTMLUListElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [cursor, setCursor] = React.useState(0);
  const selected = options.find((option) => option.value === value);
  const results = React.useMemo(() => {
    const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return options.filter((option) =>
      words.every((word) => option.label.toLocaleLowerCase().includes(word)),
    );
  }, [options, query]);
  const active = results.length ? Math.min(cursor, results.length - 1) : -1;
  const listId = `${id}-options`;

  React.useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);
  React.useEffect(() => {
    if (open && active >= 0)
      list.current?.children[active]?.scrollIntoView?.({ block: "nearest" });
  }, [open, active]);

  function openMenu() {
    setQuery("");
    setCursor(
      Math.max(
        0,
        options.findIndex((option) => option.value === value),
      ),
    );
    setOpen(true);
  }
  function choose(next: string) {
    onValueChange(next);
    setOpen(false);
  }

  return (
    <div
      ref={container}
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={input}
          id={id}
          role="combobox"
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={
            open && active >= 0 ? `${listId}-${active}` : undefined
          }
          aria-invalid={invalid}
          aria-describedby={describedBy}
          autoComplete="off"
          spellCheck={false}
          value={open ? query : (selected?.label ?? "")}
          placeholder={placeholder}
          disabled={disabled}
          className="h-11 rounded-lg pl-9 pr-16"
          onFocus={openMenu}
          onClick={() => {
            if (!open) openMenu();
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!open) {
                openMenu();
                setCursor(
                  event.key === "ArrowDown"
                    ? 0
                    : Math.max(0, options.length - 1),
                );
              } else
                setCursor((current) =>
                  Math.max(
                    0,
                    Math.min(
                      results.length - 1,
                      current + (event.key === "ArrowDown" ? 1 : -1),
                    ),
                  ),
                );
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              if (active >= 0) choose(results[active]!.value);
            } else if (event.key === "Escape" && open) {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
            }
          }}
        />
        {value && !disabled ? (
          <button
            type="button"
            aria-label={`Clear ${label.toLowerCase()}`}
            className="absolute right-8 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose("")}
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          aria-label={`Show ${label.toLowerCase()} options`}
          tabIndex={-1}
          disabled={disabled}
          className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground disabled:opacity-40"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (open) setOpen(false);
            else {
              openMenu();
              input.current?.focus();
            }
          }}
        >
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>
      {open && !disabled ? (
        <div className="absolute inset-x-0 top-[calc(100%+0.375rem)] z-40 overflow-hidden rounded-xl border border-border bg-background p-1.5 shadow-pop">
          <ul
            ref={list}
            id={listId}
            role="listbox"
            aria-label={label}
            className="max-h-60 overflow-y-auto overscroll-contain"
          >
            {results.map((option, index) => (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={option.value === value}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-md px-3 py-2.5 text-sm text-foreground",
                  active === index && "bg-indigo-50",
                )}
                onMouseEnter={() => setCursor(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(option.value)}
              >
                <span className="min-w-0 flex-1 break-words">
                  {option.label}
                </span>
                {option.value === value ? (
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-primary"
                  />
                ) : null}
              </li>
            ))}
          </ul>
          {!results.length ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No matching options.
            </p>
          ) : null}
          <p
            role="status"
            className="mt-1 border-t border-border px-3 pb-1 pt-2 text-xs text-muted-foreground"
          >
            {results.length} {results.length === 1 ? "option" : "options"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
