import type { Metadata } from "next";

import { StudentReviewsPage } from "@/features/student/student-reviews-page";

export const metadata: Metadata = {
  title: "Your HR staff reviews",
  description: "Reviews you have written about HR staff.",
  // Student area kabhi index nahi honi chahiye.
  robots: { index: false, follow: false },
};

// Apni reviews hamesha taaza aani chahiyen, cache se nahi.
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <StudentReviewsPage
      title="Your HR staff reviews"
      description="Feedback about human resources and staff-relations personnel."
      emptyTitle="You have not reviewed an HR staff member yet"
      category="hr_staff"
      browseHref="/hr-staff"
      browseLabel="Browse HR staff"
    />
  );
}
