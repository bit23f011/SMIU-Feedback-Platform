import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readWebsiteState } from "@/features/website-availability/read-state";
import { ClosureNotice } from "@/features/website-availability/closure-notice";
import { DEFAULT_WEBSITE_SETTINGS } from "@/features/website-availability/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Website unavailable",
  robots: { index: false, follow: false },
};
export default async function ClosedPage() {
  const state = await readWebsiteState();
  if (state.status === "open") redirect("/");
  return (
    <main
      id="main-content"
      className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 sm:px-8"
    >
      <ClosureNotice
        settings={state.settings ?? DEFAULT_WEBSITE_SETTINGS}
        unavailable={state.status === "unavailable"}
      />
    </main>
  );
}
