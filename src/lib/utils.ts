import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// cn() = conditional classNames ko merge karta hai aur Tailwind conflicts resolve karta hai.
// Har UI primitive isko use karta hai.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// slugify: kisi bhi naam ko URL-safe slug me badalta hai (e.g. "Dr. Ali Khan" -> "dr-ali-khan").
// Note: yeh sirf display/URL convenience hai - identity kabhi slug par depend nahi karti.
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// absoluteUrl: relative path ko full site URL bana deta hai (OG images, canonical, emails ke liye).
export function absoluteUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

// formatCompactNumber: bade numbers ko chhota dikhata hai (1,234 -> 1.2K). Reviews count ke liye.
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

// clampRating: rating ko hamesha allowed range me rakhta hai (defensive display helper).
export function clampRating(value: number, min = 0, max = 5): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

// initialsFromName: avatar fallback ke liye naam se initials nikaalta hai.
export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
