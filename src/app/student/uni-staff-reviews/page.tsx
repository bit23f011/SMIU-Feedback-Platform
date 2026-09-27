import type { Metadata } from "next";

import { StudentReviewsPage } from "@/features/student/student-reviews-page";

export const metadata: Metadata = {
  title: "Your university staff reviews",
  description: "Reviews you have written about university staff.",
  // Student area kabhi index nahi honi chahiye.
  robots: { index: false, follow: false },
};

// Apni reviews hamesha taaza aani chahiyen, cache se nahi.
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <StudentReviewsPage
      title="Your university staff reviews"
      description="Feedback about administrative and support staff you have dealt with on campus."
      emptyTitle="You have not reviewed a staff member yet"
      category="university_staff"
      browseHref="/uni-staff"
      browseLabel="Browse university staff"
    />
  );
}
