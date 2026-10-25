import * as React from "react";

import Link from "next/link";
import { Bookmark } from "@/components/ui/icons";

import { FavoriteButton } from "@/features/discovery/favorite-button";

/*
  SaveProfileView - server se milne wali capability ke mutabiq save button ya
  "sign in to save" dikhata hai.

  Yeh sirf UI ka faisla hai. Logged-out user ko button na dikhana soolat hai,
  security nahi: agar koi seedha action call kare bhi to `toggle_favorite` khud
  auth.uid() par mana kar deti hai.

  Sirf verified + active student save kar sakta hai. Baaki sab ko ek narm sa
  ishara: sign in karo.
*/

export function SaveProfileView({
  personId,
  personName,
  nextPath,
  canSave,
  saved,
}: {
  personId: string;
  personName: string;
  nextPath: string;
  canSave: boolean;
  saved: boolean;
}) {
  if (!canSave) {
    return (
      <Link
        href={`/auth/login?next=${encodeURIComponent(nextPath)}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-[0.8125rem] font-medium text-ink-700 transition-colors duration-150 ease-out hover:border-ink-400 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Bookmark aria-hidden="true" className="size-4" />
        Save
      </Link>
    );
  }

  return (
    <FavoriteButton
      personId={personId}
      personName={personName}
      initialSaved={saved}
    />
  );
}
