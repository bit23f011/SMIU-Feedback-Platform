import { getCurrentUser } from "@/features/auth/session";
import { getMyFavoriteIds } from "@/features/discovery/queries";
import { SaveProfileView } from "@/features/discovery/save-profile-view";

export async function SaveProfileButton(props: {
  personId: string;
  personName: string;
  nextPath: string;
}) {
  const session = await getCurrentUser();
  const canSave = Boolean(session?.isVerified && session.profile?.is_active);
  const savedIds = canSave ? await getMyFavoriteIds() : new Set<string>();
  return (
    <SaveProfileView
      {...props}
      canSave={canSave}
      saved={savedIds.has(props.personId)}
    />
  );
}
