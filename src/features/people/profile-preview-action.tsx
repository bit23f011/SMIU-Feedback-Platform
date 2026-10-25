"use server";

import {
  getPersonProfileData,
  type ProfileContext,
} from "@/features/people/profile-data";

// Read the same public profile through the existing RLS-protected queries.
export async function loadPublicProfile(
  slug: string,
  context: ProfileContext = {},
) {
  if (
    typeof slug !== "string" ||
    slug.length > 160 ||
    !/^[a-z0-9_-]+$/i.test(slug)
  ) {
    throw new Error("This profile is not available.");
  }
  // A plain data response avoids route-specific client component manifests in Next 14.
  const data = await getPersonProfileData(slug, context);
  if (!data) throw new Error("This profile is not available.");
  return data;
}
