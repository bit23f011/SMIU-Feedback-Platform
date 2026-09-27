import * as React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ReviewModerationStatus } from "@/features/reviews/types";

/*
  Sirf LIKHE HUE text ki halat batata hai (README §22).

  Sabse zaroori baat jo har message me dohrai gayi hai: RATING ruki hui nahi
  hai. Log samajh lete hain ke "pending" ka matlab poori review ruk gayi, aur
  phir dobara review karne ki koshish karte hain. Is liye har soorat me saaf
  likha hai ke rating pehle se gin chuki hai.

  Yeh component sirf review ke APNE author ko dikhaya jata hai. Public list me
  aisa koi ishara nahi hota, warna log gin sakte hain ke kis banday par kitna
  text ruka hua hai.
*/

const NOTES: Record<ReviewModerationStatus, { tone: "info" | "success" | "warning" | "neutral"; text: string } | null> =
  {
    none: null,
    pending: {
      tone: "info",
      text: "Your written comment is waiting for moderator review. Your rating is already counted on the public profile.",
    },
    approved: {
      tone: "success",
      text: "Your written comment is approved and visible on the public profile.",
    },
    rejected: {
      tone: "warning",
      text: "Your written comment was not approved, so it stays private. Your rating still counts. You can edit the comment if you have edits left.",
    },
    hidden: {
      tone: "warning",
      text: "A moderator hid your written comment, so it is no longer public. Your rating still counts.",
    },
  };

export function CommentModerationNote({ status }: { status: ReviewModerationStatus }) {
  const note = NOTES[status];
  if (!note) return null;

  return (
    <Alert tone={note.tone}>
      <AlertDescription>{note.text}</AlertDescription>
    </Alert>
  );
}
