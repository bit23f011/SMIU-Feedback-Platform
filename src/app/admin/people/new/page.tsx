import type { Metadata } from "next";

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreatePersonForm } from "@/features/admin/people/create-person-form";
import { getAdminDepartments, getAdminPositions } from "@/features/admin/reference/queries";
import { isPersonCategory, type PersonCategory } from "@/features/admin/people/types";

export const metadata: Metadata = {
  title: "New person · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminNewPersonPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const [departmentsList, positionsList] = await Promise.all([
    getAdminDepartments(),
    getAdminPositions(),
  ]);

  // Sirf active reference items naye link ke liye (archived nahi).
  const departments = departmentsList.items.filter((item) => item.isActive);
  const positions = positionsList.items.filter((item) => item.isActive);

  const defaultCategory: PersonCategory | undefined = isPersonCategory(searchParams?.category)
    ? searchParams!.category
    : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="pb-2">
        <Button asChild variant="link" size="sm">
          <Link href="/admin/people">
            <ArrowLeft aria-hidden="true" />
            Back to people
          </Link>
        </Button>
      </div>

      <header className="border-b border-border pb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          New person
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Create a public profile. The category and web address are fixed once created, so choose the
          category carefully.
        </p>
      </header>

      <Alert tone="info" className="mt-6">
        <ShieldCheck aria-hidden="true" />
        <div>
          <AlertTitle>One person is one public profile</AlertTitle>
          <AlertDescription>
            Do not create duplicate profiles for the same person. If a duplicate already exists, merge
            them from the reports queue instead. New profiles are not verified until you mark them so.
          </AlertDescription>
        </div>
      </Alert>

      <section className="mt-6">
        <Card className="p-5">
          <CreatePersonForm
            departments={departments}
            positions={positions}
            defaultCategory={defaultCategory}
          />
        </Card>
      </section>
    </div>
  );
}
