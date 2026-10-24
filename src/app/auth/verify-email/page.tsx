import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/session";

// Purane links ka rasta qaim rahe, magar email/OTP screen ab nahi hai.
export default async function VerifyEmailPage() {
  const session = await getCurrentUser();
  redirect(session?.isVerified ? "/student" : "/auth/login");
}
