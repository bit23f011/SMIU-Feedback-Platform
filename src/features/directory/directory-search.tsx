"use client";

import * as React from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Spinner } from "@/components/common/loading-state";
import { cn } from "@/lib/utils";

/*
  DirectorySearch - URL-driven search (?q=...).

  URL me rakhne ki wajah: result shareable + back button sahi kaam karta hai +
  server component hi filtering karta hai (client par poori list bhejne ki zaroorat
  nahi).

  Note: yeh filter sirf convenience hai. Kaunsi rows dikh sakti hain, yeh RLS
  decide karta hai - frontend nahi.

  SUSPENSE: useSearchParams() Next me CSR-bailout trigger karta hai agar route
  static prerender ho. Filhaal ye sab pages `searchParams` prop parhte hain, is
  liye wo waise bhi dynamic hain - magar us par bharosa karna nazuk hai (koi kal
  `force-static` laga de to build toot jaye). Is liye component khud apni Suspense
  boundary le kar chalta hai; caller ko kuch yaad rakhne ki zaroorat nahi.
*/

export interface DirectorySearchProps {
  placeholder?: string;
  label: string;
  className?: string;
}

function DirectorySearchInput({ placeholder = "Search by name", label, className }: DirectorySearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const initial = searchParams.get("q") ?? "";
  const [value, setValue] = React.useState(initial);
  const inputId = React.useId();

  // Back/forward ya link se aane par input ko URL ke saath sync rakho.
  React.useEffect(() => {
    setValue(initial);
  }, [initial]);

  const commit = React.useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = next.trim();
      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <form
      role="search"
      className={cn("w-full", className)}
      onSubmit={(event) => {
        event.preventDefault();
        commit(value);
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>

      <div
        className={cn(
          "group relative flex items-center rounded-md border border-input bg-background shadow-xs",
          "transition-[border-color,box-shadow] duration-150 ease-out",
          "hover:border-ink-400",
          "focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/35",
        )}
      >
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 size-4 text-ink-400 transition-colors duration-150 ease-out group-focus-within:text-primary"
        />
        <input
          id={inputId}
          type="search"
          name="q"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          maxLength={80}
          className={cn(
            "h-11 w-full bg-transparent pl-9 pr-24 text-sm text-foreground outline-none",
            "placeholder:text-ink-400",
            // Browser ka apna clear button hata do - humara apna hai.
            "[&::-webkit-search-cancel-button]:appearance-none",
          )}
        />

        <div className="absolute right-1.5 flex items-center gap-1">
          {isPending ? <Spinner className="mr-1" /> : null}
          {value ? (
            <button
              type="button"
              onClick={() => {
                setValue("");
                commit("");
              }}
              className="inline-flex size-7 items-center justify-center rounded-md text-ink-500 transition-colors duration-150 ease-out hover:bg-ink-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden="true" className="size-4" />
              <span className="sr-only">Clear search</span>
            </button>
          ) : null}
          <button
            type="submit"
            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-[0.8125rem] font-medium text-primary-foreground transition-colors duration-150 ease-out hover:bg-indigo-600 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Search
          </button>
        </div>
      </div>
    </form>
  );
}

/*
  Fallback - bilkul wahi box, magar inert. Height/border/radius same rakhe hain
  taake hydrate hote waqt layout hile na (CLS zero).
*/
function DirectorySearchFallback({ placeholder = "Search by name", className }: DirectorySearchProps) {
  return (
    <div aria-hidden="true" className={cn("w-full", className)}>
      <div className="relative flex items-center rounded-md border border-input bg-background shadow-xs">
        <Search className="pointer-events-none absolute left-3 size-4 text-ink-400" />
        <div className="h-11 w-full pl-9 pr-24 text-sm leading-[2.75rem] text-ink-400">
          {placeholder}
        </div>
        <div className="absolute right-1.5 flex items-center">
          <span className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-[0.8125rem] font-medium text-primary-foreground opacity-70">
            Search
          </span>
        </div>
      </div>
    </div>
  );
}

export function DirectorySearch(props: DirectorySearchProps) {
  return (
    <React.Suspense fallback={<DirectorySearchFallback {...props} />}>
      <DirectorySearchInput {...props} />
    </React.Suspense>
  );
}
