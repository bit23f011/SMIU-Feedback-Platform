"use client";

import { createContext, useContext, useEffect, useRef } from "react";

export const ProfileRefreshContext = createContext<(() => void) | null>(null);

/** A modal data snapshot must refresh after review actions as well as the page. */
export function useRefreshProfileOnSuccess(ok: boolean) {
  const refresh = useContext(ProfileRefreshContext);
  const handled = useRef(false);
  useEffect(() => {
    if (!ok) handled.current = false;
    else if (!handled.current) {
      handled.current = true;
      refresh?.();
    }
  }, [ok, refresh]);
}
