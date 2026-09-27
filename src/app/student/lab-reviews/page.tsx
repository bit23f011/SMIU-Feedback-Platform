import type { Metadata } from "next";

import { StudentReviewsPage } from "@/features/student/student-reviews-page";

export const metadata: Metadata = {
  title: "Your lab reviews",
  description: "Reviews you have written about lab instructors.",
  // Student area kabhi index nahi honi chahiye.
  robots: { index: false, follow: false },
};

// Apni reviews hamesha taaza aani chahiyen, cache se nahi.
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <StudentReviewsPage
      title="Your lab reviews"
      description="Reviews you write about lab instructors and practical sessions live here."
      emptyTitle="You have not reviewed a lab instructor yet"
      category="lab_instructor"
      browseHref="/lab-instructors"
      browseLabel="Browse lab instructors"
    />
  );
}
