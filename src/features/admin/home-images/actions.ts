"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GENERIC_ADMIN_ERROR, isUuid, pickSafeMessage } from "@/features/admin/shared";
import {
  HOME_IMAGE_ALLOWED_TYPES,
  HOME_IMAGE_BUCKET,
  HOME_IMAGE_EXTENSION,
  HOME_IMAGE_MAX_BYTES,
} from "@/features/admin/home-images/types";
import type { HomeImageActionState } from "@/features/admin/home-images/form-state";

/*
  Home images ke writes (hero panel).

  ASOOL (baaki admin actions jaisa): yahan koi permission tay nahi hoti. Do
  boundaries DB me hain:
    1) STORAGE RLS: sirf is_admin() home-images bucket me likh/mita sakta hai.
    2) admin_add_home_image / admin_delete_home_image: SECURITY DEFINER +
       is_admin() + cap 15 + audit.
  Yeh file sirf (a) file ki shakal/size check karti hai (behtar UX), aur
  (b) bytes ko storage me daalti/nikaalti hai us admin ke apne session se.

  ORPHAN SE BACHAV: pehle bytes upload, phir metadata row. Agar row banana fail
  ho (misal cap 15 ya non-admin) to abhi-abhi upload kiya object best-effort mita
  dete hain. Delete par ulta: pehle row (path wapas), phir object.
*/

const SAFE_MESSAGES = new Set<string>([
  "You do not have access to this.",
  "You can add at most 15 homepage images.",
  "An image is required.",
  "Please keep the description shorter.",
  "That image could not be saved.",
  "That image is not available.",
]);

const UPLOAD_FAILED = "We could not save that image right now. Please try again.";

function cleanAlt(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 200) : null;
}

/*
  Ek image upload + register. image field zaroori; sirf allowlisted mime; size
  limit. Path server par banta hai (uuid.ext) - client kabhi path decide nahi
  karta (traversal se bachav).
*/
export async function uploadHomeImageAction(
  _previous: HomeImageActionState,
  formData: FormData,
): Promise<HomeImageActionState> {
  const raw = formData.get("image");
  const altText = cleanAlt(formData.get("altText"));

  // File maujood aur asal file ho (khali submit nahi).
  if (!raw || typeof raw === "string" || typeof raw.arrayBuffer !== "function" || raw.size === 0) {
    return { ok: false, error: "Choose an image to upload." };
  }

  if (!HOME_IMAGE_ALLOWED_TYPES.has(raw.type)) {
    return { ok: false, error: "That file is not a supported image (use JPG, PNG, WebP, AVIF or GIF)." };
  }

  if (raw.size > HOME_IMAGE_MAX_BYTES) {
    return { ok: false, error: "That image is larger than 3 MB. Please pick a smaller file." };
  }

  const ext = HOME_IMAGE_EXTENSION[raw.type] ?? "img";
  const path = `${crypto.randomUUID()}.${ext}`;

  try {
    const supabase = createSupabaseServerClient();
    const bytes = new Uint8Array(await raw.arrayBuffer());

    // 1) Bytes storage me. RLS is_admin() na ho to yahin ruk jata hai.
    const { error: uploadError } = await supabase.storage
      .from(HOME_IMAGE_BUCKET)
      .upload(path, bytes, { contentType: raw.type, upsert: false });

    if (uploadError) {
      return { ok: false, error: UPLOAD_FAILED };
    }

    // 2) Metadata row (cap 15 + audit yahin). Fail ho to object wapas mita do.
    const { error: rpcError } = await supabase.rpc("admin_add_home_image", {
      p_storage_path: path,
      p_alt_text: altText ?? undefined,
    });

    if (rpcError) {
      await supabase.storage.from(HOME_IMAGE_BUCKET).remove([path]);
      return { ok: false, error: pickSafeMessage(rpcError.message, SAFE_MESSAGES) };
    }
  } catch {
    return { ok: false, error: UPLOAD_FAILED };
  }

  revalidatePath("/admin/home-images");
  revalidatePath("/");
  return { ok: true };
}

/* Ek image hatao: pehle metadata row (path wapas), phir storage object. */
export async function deleteHomeImageAction(
  _previous: HomeImageActionState,
  formData: FormData,
): Promise<HomeImageActionState> {
  const id = formData.get("imageId");

  if (!isUuid(id)) {
    return { ok: false, error: GENERIC_ADMIN_ERROR };
  }

  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.rpc("admin_delete_home_image", { p_id: id });
    if (error) {
      return { ok: false, error: pickSafeMessage(error.message, SAFE_MESSAGES) };
    }

    // data = storage_path. Best-effort object delete (row to ja chuki).
    if (typeof data === "string" && data.length > 0) {
      await supabase.storage.from(HOME_IMAGE_BUCKET).remove([data]);
    }
  } catch {
    return { ok: false, error: GENERIC_ADMIN_ERROR };
  }

  revalidatePath("/admin/home-images");
  revalidatePath("/");
  return { ok: true };
}
