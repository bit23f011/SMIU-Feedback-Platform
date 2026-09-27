import * as React from "react";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";

import { ListSkeleton } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { CourseTeacherList } from "@/features/courses/course-teacher-list";
import { getCourseBySlug } from "@/features/discovery/queries";
import { parsePage } from "@/features/discovery/types";

/*
  Course detail page - README §34 ka "Database Systems" wala case.

  Yeh page us course ko parhane wale logon ki list dikhata hai, har ek ki
  is-course-wali rating ke saath. Data server par aata hai aur SECURITY INVOKER
  function se, is liye RLS wahi rehti hai jo caller ki hai.
*/

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const course = await getCourseBySlug(params.slug);
  if (!course) return { title: "Course not found" };

  const name = course.code ? `${course.code} ${course.title}` : course.title;

  return {
    title: name,
    description: `Teachers on record for ${course.title} at Sindh Madressatul Islam University, Karachi, with their ratings for this course.`,
    alternates: { canonical: `/courses/${course.slug}` },
  };
}

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { page?: string };
}) {
  const course = await getCourseBySlug(params.slug);
  if (!course) notFound();

  const page = parsePage(searchParams?.page);
  const department = course.departmentShort ?? course.departmentName;

  return (
    <div className="container py-10 md:py-12">
      <Link
        href="/courses"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 transition-colors duration-150 ease-out hover:text-foreground"
      >
        <ArrowLeft
          aria-hidden="true"
          className="size-4 transition-transform duration-150 ease-out group-hover:-translate-x-0.5"
        />
        Back to Courses
      </Link>

      <div className="mt-6">
        <PageHeader
          eyebrow={course.code ?? "Course"}
          title={course.title}
          description="Teachers on record for this course, with their rating for this course alongside their overall rating."
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {department ? (
              <Badge variant="brand">
                <BookOpen aria-hidden="true" className="mr-1 size-3.5" />
                {department}
              </Badge>
            ) : null}
            {typeof course.creditHours === "number" ? (
              <Badge>
                {course.creditHours} credit {course.creditHours === 1 ? "hour" : "hours"}
              </Badge>
            ) : null}
          </div>
        </PageHeader>
      </div>

      <section className="mt-8" aria-label="Teachers for this course">
        <React.Suspense key={page} fallback={<ListSkeleton rows={4} />}>
          <CourseTeacherList courseId={course.id} courseSlug={course.slug} page={page} />
        </React.Suspense>
      </section>
    </div>
  );
}
