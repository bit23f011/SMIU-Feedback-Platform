import type { Metadata } from "next";
import { getAdminWebsiteSettings } from "@/features/website-availability/queries";
import { WebsiteSettingsForm } from "@/features/website-availability/settings-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Website ON/OFF · Admin",
  robots: { index: false, follow: false },
};
export default async function WebsiteControlsPage() {
  const settings = await getAdminWebsiteSettings();
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="font-display text-2xl font-semibold">Website ON/OFF</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Control website availability and the message visitors see when it is
          closed.
        </p>
      </header>
      {settings ? (
        <WebsiteSettingsForm settings={settings} />
      ) : (
        <p
          role="alert"
          className="rounded-lg border border-border bg-card p-6 text-sm text-state-danger"
        >
          Website controls could not load. Check that the website availability
          migration is applied, then reload.
        </p>
      )}
    </div>
  );
}
