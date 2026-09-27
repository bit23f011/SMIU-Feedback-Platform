import type { Metadata } from "next";

import { StudentReviewsPage } from "@/features/student/student-reviews-page";

export const metadata: Metadata = {
  title: "Your faculty reviews",
  description: "Reviews you have written about faculty members.",
  // Student area kabhi index nahi honi chahiye.
  robots: { index: false, follow: false },
};

// Apni reviews hamesha taaza aani chahiyen, cache se nahi.
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <StudentReviewsPage
      title="Your faculty reviews"
      description="Reviews about department faculty and academic leadership are collected here."
      emptyTitle="You have not reviewed a faculty member yet"
      category="faculty"
      browseHref="/faculty"
      browseLabel="Browse faculty"
    />
  );
}
