import "server-only";

import { appendFileSync } from "node:fs";
import { join } from "node:path";

const REVIEW_CONSTRAINTS = new Set([
  "reviews_overall_rating_check",
  "reviews_overall_rating_range",
  "reviews_comment_check",
  "reviews_comment_word_limit",
  "reviews_moderation_matches_comment",
  "reviews_featured_requires_approval",
  "reviews_course_only_for_course_roles",
  "review_authors_course_scope_idx",
  "review_authors_period_scope_idx",
  "review_answers_star_value_check",
  "review_answers_check",
  "review_answers_pkey",
]);

/* Server logs me sirf operation aur error code; student data/tokens kabhi nahi. */
export function logBackendError(operation: string, error: unknown): void {
  const detail =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : {};
  // Next ke dynamic-render/redirect signals backend failure nahi; unhein nigalna nahi.
  if (
    typeof detail.digest === "string" &&
    (detail.digest === "DYNAMIC_SERVER_USAGE" ||
      detail.digest.startsWith("NEXT_REDIRECT;") ||
      detail.digest === "NEXT_NOT_FOUND")
  ) {
    throw error;
  }
  const code =
    typeof detail.code === "string" && /^[a-zA-Z0-9_]{1,64}$/.test(detail.code)
      ? detail.code
      : "unknown";
  const status = typeof detail.status === "number" ? detail.status : undefined;
  const constraintName =
    typeof detail.message === "string"
      ? detail.message.match(
          /constraint "((?:reviews|review_authors|review_answers)_[a-zA-Z0-9_]{1,80})"/,
        )?.[1]
      : undefined;
  const constraint =
    constraintName && REVIEW_CONSTRAINTS.has(constraintName)
      ? constraintName
      : undefined;
  const diagnostic = {
    operation,
    code,
    ...(status === undefined ? {} : { status }),
    ...(constraint ? { constraint } : {}),
  };
  console.error("[backend]", diagnostic);

  // Localhost par terminal attach na ho to bhi sirf safe code/name parh sakte hain.
  // Raw DB message, form data aur credentials is file me kabhi nahi jate.
  if (process.env.NODE_ENV === "development") {
    try {
      appendFileSync(
        join(process.cwd(), ".next", "profaura-backend-errors.jsonl"),
        JSON.stringify({ at: new Date().toISOString(), ...diagnostic }) + "\n",
        "utf8",
      );
    } catch {
      // Diagnostic file ki nakaami se asli form ka response nahi rukna chahiye.
    }
  }
}
