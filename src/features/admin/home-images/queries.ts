import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  EMPTY_HOME_IMAGE_LIST,
  HOME_IMAGE_BUCKET,
  type AdminHomeImageList,
} from "@/features/admin/home-images/types";

/*
  Home images ka admin read.

  SECURITY:
  - Aam anon-key client (service role NAHI). admin_home_image_list() ke andar
    is_admin() gate hai, is liye non-admin ko sirf error milta hai, data nahi.
  - Public URL yahin (server par) banate hain getPublicUrl se - koi network call
    nahi, sirf bucket + path se URL. Bucket public read hai.
  - Error ka matan UI tak nahi jata; sirf `failed: true`.
*/
export async function getAdminHomeImages(): Promise<AdminHomeImageList> {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.rpc("admin_home_image_list");

    if (error) return { failed: true, images: [] };
    if (!data || data.length === 0) return EMPTY_HOME_IMAGE_LIST;

    return {
      failed: false,
      images: data.map((row) => ({
        id: row.id,
        url: supabase.storage.from(HOME_IMAGE_BUCKET).getPublicUrl(row.storage_path).data
          .publicUrl,
        storagePath: row.storage_path,
        altText: row.alt_text,
        sortOrder: row.sort_order,
        isActive: row.is_active,
        createdAt: row.created_at,
      })),
    };
  } catch {
    return { failed: true, images: [] };
  }
}
