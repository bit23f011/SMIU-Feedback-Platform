import type { Metadata } from "next";

import { Inbox, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/common/empty-state";
import { FeatureFlagCard } from "@/features/admin/settings/feature-flag-card";
import { getFeatureFlags } from "@/features/admin/settings/queries";

export const metadata: Metadata = {
  title: "Settings · Admin",
  robots: { index: false, follow: false },
};

/* Live data: switch badalne ke baad purana page ghalat halat dikhaega. */
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const view = await getFeatureFlags();

  return (
    <div className="mx-auto max-w-4xl">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Platform switches: who can sign up, whether reviews can be submitted or edited, and the
          student email rule. Each can be flipped now or put on a schedule.
        </p>
      </header>

      <Alert tone="info" className="mt-6">
        <ShieldCheck aria-hidden="true" />
        <div>
          <AlertTitle>These switches are enforced in the database</AlertTitle>
          <AlertDescription>
            Turning a feature off blocks it at the database, not just in the browser. Signup, review
            submission and editing each check the switch again on the server before doing anything.
          </AlertDescription>
        </div>
      </Alert>

      {view.failed ? (
        <Alert tone="danger" className="mt-6">
          <div>
            <AlertTitle>These controls did not load</AlertTitle>
            <AlertDescription>
              Nothing has changed. Reload the page, and if it keeps failing, check that your account
              still has the admin role.
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      {!view.failed && view.flags.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Inbox />}
            title="No controls found"
            description="The feature switches could not be found. This usually means the latest database changes have not been applied yet."
          />
        </div>
      ) : null}

      {view.flags.length > 0 ? (
        <ul className="mt-6 list-none space-y-4">
          {view.flags.map((flag) => (
            <FeatureFlagCard key={flag.key} flag={flag} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
