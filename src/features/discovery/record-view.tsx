"use client";

import * as React from "react";

import { recordPersonViewAction } from "@/features/discovery/actions";

/*
  RecordView - README §46. Profile khulte hi usay "recently viewed" me darj
  karta hai.

  PRIVACY (§46): history browser ki localStorage me NAHI rakhi jati. Woh
  server par us student ke apne account se jurhi hoti hai aur RLS ke peechhe
  rehti hai. localStorage me profile ki koi PII rakhna is asool ke khilaf hota.

  Yeh khamoshi se chalta hai: logged-out user ke liye DB function kuch nahi
  karta, aur nakaami par user ko koi error nahi dikhta (history sirf soolat hai,
  page ka hissa nahi). Render me kuch nahi daalta.
*/
export function RecordView({ personId }: { personId: string }) {
  React.useEffect(() => {
    // Ek hi baar, mount par. Error ho to nigal jao: yeh page ka hissa nahi.
    void recordPersonViewAction(personId).catch(() => {});
  }, [personId]);

  return null;
}
