/*
  Home images (hero panel) ki shared constants + types.

  Bytes storage bucket "home-images" me rehte hain; DB me sirf metadata. Cap 15
  server-side (migration: trigger + RPC) enforce hoti hai - yahan wahi adad sirf
  UI ke liye rakha hai (button disable, "x of 15" text). Browser authority nahi.
*/

/** Storage bucket ka naam (migration me banaya). */
export const HOME_IMAGE_BUCKET = "home-images";

/** Server-side hard cap ka mirror (sirf UI hint - asal rok DB me hai). */
export const HOME_IMAGE_MAX = 15;

/** Upload size ki upri had (server action bhi yehi check karta hai). */
export const HOME_IMAGE_MAX_BYTES = 3 * 1024 * 1024; // 3 MB

/** File input ke accept attribute ke liye. */
export const HOME_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

/** Sirf yeh mime types manzoor (server action allowlist). */
export const HOME_IMAGE_ALLOWED_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

/** mime -> extension (storage path banane ke liye). */
export const HOME_IMAGE_EXTENSION: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

/** Admin view ki ek image row (public URL ban chuka hota hai). */
export interface AdminHomeImage {
  id: string;
  url: string;
  storagePath: string;
  altText: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface AdminHomeImageList {
  failed: boolean;
  images: AdminHomeImage[];
}

export const EMPTY_HOME_IMAGE_LIST: AdminHomeImageList = { failed: false, images: [] };
