import { getReviewPanelData } from "@/features/reviews/review-panel-data";
import { ReviewPanelView } from "@/features/reviews/review-panel-view";
import type { PersonSummary } from "@/features/people/types";

export async function ReviewPanel(props: {
  person: PersonSummary;
  initialCourseId?: string;
  initialSemesterId?: string;
}) {
  const data = await getReviewPanelData(props.person);
  return <ReviewPanelView {...props} data={data} />;
}
