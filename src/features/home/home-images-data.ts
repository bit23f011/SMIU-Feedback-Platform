import { createSupabasePublicClient } from "@/lib/supabase/public";
import { HOME_IMAGE_BUCKET } from "@/features/admin/home-images/types";

/* Homepage hero panel me dikhne wali ek image. */
export interface HomeHeroImage {
  id: string;
  url: string;
  alt: string;
}

/*
  Hero panel ke liye public read.

  - Table home_images se seedha padhta hai. RLS public-read policy sirf
    is_active = true rows deta hai (anon + authenticated dono ko select grant hai),
    is liye chhupi/off images kabhi nahi aatin - filter DB me hai, yahan nahi.
  - Public URL server par banta hai getPublicUrl se (bucket public read hai) -
    koi network call nahi.
  - Fail-safe: table abhi na bani ho (migration apply se pehle), env missing ho,
    ya koi bhi error - to khali array. Homepage kabhi crash nahi karti; sirf
    purana single-column hero dikhta hai.

  Active photos use a short anonymous cache. Admin image mutations expire its
  tag immediately, so a new build is not needed after image changes.
*/
export async function getActiveHomeImages(): Promise<HomeHeroImage[]> {
  try {
    const supabase = createSupabasePublicClient();

    const { data, error } = await supabase
      .from("home_images")
      .select("id,storage_path,alt_text")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(15);

    if (error || !data || data.length === 0) return [];

    return data.map((row) => ({
      id: row.id,
      url: supabase.storage
        .from(HOME_IMAGE_BUCKET)
        .getPublicUrl(row.storage_path).data.publicUrl,
      alt: row.alt_text ?? "",
    }));
  } catch {
    return [];
  }
}
