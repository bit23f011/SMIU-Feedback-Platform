import type { Metadata } from "next";

import { ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { getRankingsSettings } from "@/features/admin/rankings/queries";
import { RankingsForm } from "@/features/admin/rankings/rankings-form";

export const metadata: Metadata = {
  title: "Rankings · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminRankingsPage() {
  const view = await getRankingsSettings();

  return (
    <div className="mx-auto max-w-3xl">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Rankings and privacy
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The thresholds that decide when someone can be ranked, when a rating breakdown appears, and
          who counts as trending.
        </p>
      </header>

      <Alert tone="info" className="mt-6">
        <ShieldCheck aria-hidden="true" />
        <div>
          <AlertTitle>These thresholds protect small samples</AlertTitle>
          <AlertDescription>
            Higher minimums keep a person from being ranked or broken down until enough students have
            reviewed them, which guards both fairness and anonymity.
          </AlertDescription>
        </div>
      </Alert>

      <section className="mt-6">
        {view.failed ? (
          <Alert tone="danger">
            <div>
              <AlertTitle>These settings did not load</AlertTitle>
              <AlertDescription>
                Nothing has changed. Reload the page, and if it keeps failing, check that your
                account still has the admin role.
              </AlertDescription>
            </div>
          </Alert>
        ) : view.settings === null ? (
          <Alert tone="warning">
            <div>
              <AlertTitle>No settings row found</AlertTitle>
              <AlertDescription>
                The platform settings row is missing. Apply the latest database changes, then reload
                this page.
              </AlertDescription>
            </div>
          </Alert>
        ) : (
          <Card className="p-5">
            <RankingsForm settings={view.settings} />
            {view.settings.updatedAt ? (
              <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                Last updated{" "}
                {new Date(view.settings.updatedAt).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                .
              </p>
            ) : null}
          </Card>
        )}
      </section>
    </div>
  );
}
