import type { Metadata } from "next";

import { ImageOff, Images, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { HomeImageForm } from "@/features/admin/home-images/home-image-form";
import { HomeImageItem } from "@/features/admin/home-images/home-image-item";
import { getAdminHomeImages } from "@/features/admin/home-images/queries";

export const metadata: Metadata = {
  title: "Homepage images · Admin",
  robots: { index: false, follow: false },
};

/* Live data: add/remove ke baad purana page ghalat halat dikhaega. */
export const dynamic = "force-dynamic";

export default async function AdminHomeImagesPage() {
  const data = await getAdminHomeImages();
  const count = data.images.length;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Homepage images
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          These images appear in the panel beside the headline on the public homepage and rotate on
          their own. Add up to 15. Visitors can click one to view it in full.
        </p>
      </header>

      <Alert tone="info" className="mt-6">
        <ShieldCheck aria-hidden="true" />
        <div>
          <AlertTitle>Only admins can change these</AlertTitle>
          <AlertDescription>
            Uploading and removing are authorised on the server with a role check, and the 15 image
            limit is enforced there too. Every change is recorded in the audit log.
          </AlertDescription>
        </div>
      </Alert>

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          Add an image
        </h2>
        <Card className="mt-3 p-5">
          <HomeImageForm count={count} />
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          Current images
        </h2>

        {data.failed ? (
          <Alert tone="danger" className="mt-3">
            <div>
              <AlertTitle>This list did not load</AlertTitle>
              <AlertDescription>
                Nothing has changed. Reload the page, and if it keeps failing, check that your
                account still has the admin role.
              </AlertDescription>
            </div>
          </Alert>
        ) : null}

        {!data.failed && count === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={<ImageOff />}
              title="No images yet"
              description="Upload an image above and it appears here, and on the homepage straight away."
            />
          </div>
        ) : null}

        {count > 0 ? (
          <>
            <p className="mt-3 flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
              <Images aria-hidden="true" className="size-4" />
              {count} {count === 1 ? "image" : "images"} shown, in order
            </p>
            <ul className="mt-3 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.images.map((image, index) => (
                <HomeImageItem key={image.id} image={image} position={index + 1} />
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </div>
  );
}
