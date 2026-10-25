import { notFound } from "next/navigation";
import { getPersonProfileData } from "@/features/people/profile-data";
import { PersonProfileView } from "@/features/people/person-profile-view";

export async function PersonProfileContent({
  params,
  searchParams,
  modal = false,
}: {
  params: { slug: string };
  modal?: boolean;
  searchParams?: { page?: string; course?: string; semester?: string };
}) {
  const data = await getPersonProfileData(params.slug, searchParams);
  if (!data) notFound();
  return <PersonProfileView data={data} modal={modal} />;
}
