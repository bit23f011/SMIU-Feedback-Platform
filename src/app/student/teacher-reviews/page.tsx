import type { Metadata } from "next";

import { StudentReviewsPage } from "@/features/student/student-reviews-page";

export const metadata: Metadata = {
  title: "Your teacher reviews",
  description: "Reviews you have written about teachers.",
  // Student area kabhi index nahi honi chahiye.
  robots: { index: false, follow: false },
};

// Apni reviews hamesha taaza aani chahiyen, cache se nahi.
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <StudentReviewsPage
      title="Your teacher reviews"
      description="Every review you write about a teacher appears here, with its current status."
      emptyTitle="You have not reviewed a teacher yet"
      category="teacher"
      browseHref="/teachers"
      browseLabel="Browse teachers"
    />
  );
}
