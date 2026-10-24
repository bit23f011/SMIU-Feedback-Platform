export const SIGNUP_PAUSED =
  "New sign ups are closed right now. Please check back later.";
export const SIGNUP_UNAVAILABLE =
  "Account creation is temporarily unavailable. Please try again later.";

export function signupErrorMessage(error: {
  code?: string;
  status?: number;
  message?: string;
}): string {
  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (
    (error.status !== undefined && error.status >= 500) ||
    error.code === "signup_disabled" ||
    error.code === "email_provider_disabled" ||
    error.code === "email_address_not_authorized" ||
    error.code === "over_email_send_rate_limit" ||
    /sending (confirmation )?email|smtp|email address not authorized/i.test(
      error.message ?? "",
    )
  ) {
    return SIGNUP_UNAVAILABLE;
  }
  if (error.code === "captcha_failed") {
    return "Please complete the security check again and try once more.";
  }
  if (error.code === "weak_password") {
    return "Choose a stronger password and try again.";
  }
  return "We could not create your account. Please try signing in or try again later.";
}
