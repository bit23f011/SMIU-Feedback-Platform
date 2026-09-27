"use client";

import * as React from "react";

import { useFormState, useFormStatus } from "react-dom";
import { Bookmark, BookmarkCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { toggleFavoriteAction } from "@/features/discovery/actions";
import { initialFavoriteState, type FavoriteState } from "@/features/discovery/types";

/*
  FavoriteButton - README §45. Ek verified student apni zaati list me profile
  save/unsave karta hai.

  DB ek boolean wapas deti hai: ab saved hai ya nahi. Us par bharosa karte hain,
  apne andar guess nahi rakhte - is liye do tab khule hon to bhi halat theek
  rehti hai (server sach ka waahid source hai).

  SECURITY: yeh button kuch "allow" nahi karta. `toggle_favorite` khud auth.uid()
  parhti hai; logged-out call kuch nahi karti aur anon ko EXECUTE grant hi nahi.
*/

function SubmitButton({ saved }: { saved: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      // aria-pressed toggle ki halat screen reader tak pahunchata hai.
      aria-pressed={saved}
      disabled={pending}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[0.8125rem] font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70",
        saved
          ? "border-primary/40 bg-indigo-50 text-primary hover:bg-indigo-100"
          : "border-input bg-background text-ink-700 hover:border-ink-400 hover:bg-ink-50",
      )}
    >
      {saved ? (
        <BookmarkCheck aria-hidden="true" className="size-4" />
      ) : (
        <Bookmark aria-hidden="true" className="size-4" />
      )}
      {saved ? "Saved" : "Save"}
    </button>
  );
}

export function FavoriteButton({
  personId,
  personName,
  initialSaved,
}: {
  personId: string;
  personName: string;
  initialSaved: boolean;
}) {
  const [state, formAction] = useFormState<FavoriteState, FormData>(
    toggleFavoriteAction,
    initialFavoriteState(initialSaved),
  );

  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="personId" value={personId} />
      <SubmitButton saved={state.saved} />
      {/* Screen reader ke liye halat ka elaan; nazar ke liye button ka label kaafi hai. */}
      <span className="sr-only" role="status" aria-live="polite">
        {state.saved ? `${personName} is saved to your list.` : `${personName} is not saved.`}
      </span>
      {state.error ? (
        <span className="text-xs text-destructive" role="status">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
