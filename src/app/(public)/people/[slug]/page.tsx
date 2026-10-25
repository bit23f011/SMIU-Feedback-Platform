import type { Metadata } from "next";
import { getPersonBySlug } from "@/features/people/queries";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const person = await getPersonBySlug(params.slug, false);
  if (!person) return { title: "Profile not found" };

  return {
    title: person.name,
    description:
      person.headline ??
      `${person.name} at Sindh Madressatul Islam University, Karachi.`,
    alternates: { canonical: `/people/${person.slug}` },
  };
}

import { PersonProfileContent } from "@/features/people/person-profile";

export default function PersonProfilePage(props: {
  params: { slug: string };
  searchParams?: { page?: string; course?: string; semester?: string };
}) {
  return <PersonProfileContent {...props} />;
}
