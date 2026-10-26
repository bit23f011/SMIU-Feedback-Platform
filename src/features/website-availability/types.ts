export interface WebsiteSettings {
  is_enabled: boolean;
  greeting: string;
  title: string;
  message: string;
  farewell: string;
  signature: string;
}

export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  is_enabled: true,
  greeting: "Hello, SMIU community.",
  title: "This website has officially closed.",
  message:
    "Thank you for sharing your experiences and helping build this community. The website is now closed and its pages are no longer available.",
  farewell: "Goodbye, and thank you for being part of our journey.",
  signature: "SMIU Feedback Platform",
};

export const WEBSITE_FIELDS = [
  { key: "greeting", label: "Greeting", maxLength: 180, required: false },
  { key: "title", label: "Heading", maxLength: 180, required: true },
  { key: "message", label: "Main message", maxLength: 3000, required: true },
  {
    key: "farewell",
    label: "Goodbye message",
    maxLength: 280,
    required: false,
  },
  { key: "signature", label: "Sign-off", maxLength: 180, required: false },
] as const;

export type WebsiteState =
  | { status: "open" | "closed"; settings: WebsiteSettings }
  | { status: "unavailable"; settings: null };

export interface WebsiteActionState {
  ok: boolean;
  error?: string;
}
export const EMPTY_WEBSITE_ACTION: WebsiteActionState = { ok: false };

export function isAdminPath(value: string | null): boolean {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  )
    return false;
  try {
    const url = new URL(value, "https://website.invalid");
    return (
      url.origin === "https://website.invalid" &&
      /^\/admin(?:\/|$)/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function isWebsiteRecoveryPath(
  pathname: string,
  nextPath: string | null,
): boolean {
  return (
    isAdminPath(pathname) ||
    pathname === "/auth/callback" ||
    (pathname === "/auth/login" && isAdminPath(nextPath))
  );
}
