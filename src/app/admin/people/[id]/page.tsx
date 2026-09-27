import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EditPersonForm } from "@/features/admin/people/edit-person-form";
import { PersonActiveForm } from "@/features/admin/people/person-active-form";
import { PersonAssignmentsSection } from "@/features/admin/people/person-assignments";
import { PersonRolesSection } from "@/features/admin/people/person-roles";
import { getAdminPersonBundle } from "@/features/admin/people/queries";
import {
  getAdminCourses,
  getAdminDepartments,
  getAdminPositions,
  getAdminSemesters,
} from "@/features/admin/reference/queries";
import { PERSON_CATEGORY_LABELS } from "@/features/admin/people/types";
import { isUuid } from "@/features/admin/shared";

export const metadata: Metadata = {
  title: "Person · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

export default async function AdminPersonDetailPage({ params }: { params: { id: string } }) {
  if (!isUuid(params.id)) notFound();

  const [bundle, departmentsList, positionsList, coursesList, semestersList] = await Promise.all([
    getAdminPersonBundle(params.id),
    getAdminDepartments(),
    getAdminPositions(),
    getAdminCourses(),
    getAdminSemesters(),
  ]);

  if (!bundle.failed && bundle.person === null) notFound();

  const departments = departmentsList.items.filter((item) => item.isActive);
  const positions = positionsList.items.filter((item) => item.isActive);
  const courses = coursesList.items.filter((item) => item.isActive);
  const semesters = semestersList.items;

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

      {bundle.failed || bundle.person === null ? (
        <Alert tone="danger" className="mt-2">
          <div>
            <AlertTitle>This profile did not load</AlertTitle>
            <AlertDescription>
              Nothing has changed. Reload the page, and if it keeps failing, check that your account
              still has the admin role.
            </AlertDescription>
          </div>
        </Alert>
      ) : (
        <>
          <header className="border-b border-border pb-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                  {bundle.person.displayName ?? bundle.person.fullName}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-mono">{bundle.person.slug}</span>
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {bundle.person.primaryCategory ? (
                    <Badge variant="category">
                      {PERSON_CATEGORY_LABELS[bundle.person.primaryCategory]}
                    </Badge>
                  ) : null}
                  <Badge variant={bundle.person.isActive ? "brand" : "outline"}>
                    {bundle.person.isActive ? "Active" : "Deactivated"}
                  </Badge>
                  {bundle.person.isVerified ? (
                    <Badge variant="default">
                      <ShieldCheck aria-hidden="true" />
                      Verified
                    </Badge>
                  ) : null}
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/people/${bundle.person.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" />
                  View public profile
                </Link>
              </Button>
            </div>
          </header>

          <section className="mt-8">
            <SectionHeading
              title="Profile details"
              description="Edit the public information. The category and web address are fixed and cannot change here."
            />
            <Card className="p-5">
              <EditPersonForm person={bundle.person} />
            </Card>
          </section>

          <section className="mt-10">
            <SectionHeading
              title="Roles"
              description="Which department and position this person holds. The primary role is the one shown publicly."
            />
            <PersonRolesSection
              personId={bundle.person.id}
              roles={bundle.roles}
              departments={departments}
              positions={positions}
            />
          </section>

          <section className="mt-10">
            <SectionHeading
              title="Teaching assignments"
              description="The courses and semesters this person teaches, which is where students review them."
            />
            <PersonAssignmentsSection
              personId={bundle.person.id}
              assignments={bundle.assignments}
              courses={courses}
              semesters={semesters}
            />
          </section>

          <section className="mt-10">
            <SectionHeading
              title="Visibility"
              description="Hide or restore this profile on the public site. This is separate from editing and always needs a reason."
            />
            <Card className="p-5">
              <PersonActiveForm
                personId={bundle.person.id}
                personSlug={bundle.person.slug}
                isActive={bundle.person.isActive}
              />
              <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                Deactivating hides the profile but keeps all data and reviews. To reset a profile{"'"}s
                reviews or merge a duplicate, use the reports queue. Every action here is written to
                the audit log.
              </p>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
