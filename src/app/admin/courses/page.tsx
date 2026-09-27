import type { Metadata } from "next";

import { Inbox, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import {
  getAdminCourses,
  getAdminDepartments,
  getAdminPrograms,
} from "@/features/admin/reference/queries";
import { setCourseActiveAction } from "@/features/admin/reference/actions";
import { CourseForm } from "@/features/admin/reference/course-form";
import { ActiveToggleForm } from "@/features/admin/reference/reference-controls";
import type {
  AdminCourse,
  AdminDepartment,
  AdminProgram,
} from "@/features/admin/reference/types";

export const metadata: Metadata = {
  title: "Courses · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function CourseRow({
  course,
  departments,
  programs,
}: {
  course: AdminCourse;
  departments: AdminDepartment[];
  programs: AdminProgram[];
}) {
  return (
    <li className="list-none rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-medium text-foreground">{course.title}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {course.code ? <span className="font-mono">{course.code}{" · "}</span> : null}
            {course.creditHours !== null ? (
              <span>
                {course.creditHours} {course.creditHours === 1 ? "credit hour" : "credit hours"}
                {" · "}
              </span>
            ) : null}
            {course.departmentName ?? "No department"}
            {course.programName ? <span>{" · "}{course.programName}</span> : null}
          </p>
          <p className="mt-1 text-xs tabular-nums text-muted-foreground">
            {course.offeringCount} {course.offeringCount === 1 ? "offering" : "offerings"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge variant={course.isActive ? "brand" : "outline"}>
            {course.isActive ? "Active" : "Archived"}
          </Badge>
          <ActiveToggleForm
            action={setCourseActiveAction}
            id={course.id}
            isActive={course.isActive}
          />
        </div>
      </div>

      <details className="mt-3 border-t border-border pt-3">
        <summary className="cursor-pointer text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
          Edit
        </summary>
        <div className="mt-4">
          <CourseForm course={course} departments={departments} programs={programs} />
        </div>
      </details>
    </li>
  );
}

export default async function AdminCoursesPage() {
  const [view, departmentsList, programsList] = await Promise.all([
    getAdminCourses(),
    getAdminDepartments(),
    getAdminPrograms(),
  ]);
  const departments = departmentsList.items;
  const programs = programsList.items;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Courses
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The courses students review. Each course belongs to a department and can optionally sit
          under a program.
        </p>
      </header>

      <Alert tone="info" className="mt-6">
        <ShieldCheck aria-hidden="true" />
        <div>
          <AlertTitle>Courses are archived, never deleted</AlertTitle>
          <AlertDescription>
            Archiving keeps past offerings and reviews intact. A course needs a department, so add
            departments first if the list below is empty.
          </AlertDescription>
        </div>
      </Alert>

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          New course
        </h2>
        <Card className="mt-3 p-5">
          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add at least one department before creating a course.
            </p>
          ) : (
            <CourseForm departments={departments} programs={programs} />
          )}
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          All courses
        </h2>

        {view.failed ? (
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

        {!view.failed && view.items.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={<Inbox />}
              title="No courses yet"
              description="Add the first course above, or apply the latest database changes if you expected data here."
            />
          </div>
        ) : null}

        {view.items.length > 0 ? (
          <ul className="mt-3 list-none space-y-3">
            {view.items.map((course) => (
              <CourseRow
                key={course.id}
                course={course}
                departments={departments}
                programs={programs}
              />
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
