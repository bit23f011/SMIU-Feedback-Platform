# Homepage images (hero panel) - verification and apply guide

Feature: an admin-managed set of images that rotate in the panel beside the
homepage headline. Admin can upload and remove images (max 15); visitors see them
rotate and can click one to view it full size. This document is the apply and
verification checklist for the owner (run on Windows).

Nothing here touches existing tables or data. Everything is new and additive.

## What was added

Database (one new migration):

- `supabase/migrations/20260929093000_home_images.sql`
  - Table `public.home_images` (metadata only: `storage_path`, `alt_text`,
    `sort_order`, `is_active`, timestamps, `created_by`).
  - Hard cap of 15 enforced by a `before insert` trigger (`enforce_home_images_cap`).
  - RLS enabled, deny-by-default. One public read policy `using (is_active)` so
    anyone can read only active rows. No client write policy, so writes are only
    possible through the SECURITY DEFINER RPCs below.
  - Storage bucket `home-images` (public read). Four `storage.objects` policies:
    public read, plus insert / update / delete gated by `public.is_admin()`.
  - RPCs, each `is_admin()`-gated and audited:
    `admin_home_image_list()`, `admin_add_home_image(p_storage_path, p_alt_text)`,
    `admin_delete_home_image(p_id)`.
  - Grants follow the standing rule: revoke from public/anon/authenticated first,
    then grant execute to `authenticated` for the three admin RPCs only.

Type registry:

- `src/lib/supabase/database.types.ts` - added the `home_images` table block and
  the three RPC signatures (required, or `.from()`/`.rpc()` would not type-check).

Server layer:

- `src/features/admin/home-images/types.ts` - constants (bucket name, max 15, max
  bytes 3 MB, accepted mime types, mime->extension) and the admin view types.
- `src/features/admin/home-images/form-state.ts` - the action state shape (kept out
  of the "use server" file on purpose; that file may export only async functions).
- `src/features/admin/home-images/queries.ts` - `getAdminHomeImages()` (admin read,
  builds public URLs).
- `src/features/admin/home-images/actions.ts` - `uploadHomeImageAction` and
  `deleteHomeImageAction`. Upload validates type and size, uploads bytes, then
  records the metadata row; if the row fails (for example the cap, or a non-admin),
  the just-uploaded object is removed so nothing is orphaned. Delete removes the
  row first (returns the path), then removes the object.
- `src/features/home/home-images-data.ts` - `getActiveHomeImages()` public read for
  the homepage. Fail-safe: any error returns an empty list, so the homepage falls
  back to the original single-column hero and never crashes.

UI:

- `src/app/admin/home-images/page.tsx` - the admin page.
- `src/features/admin/home-images/home-image-form.tsx` - upload form with a live
  preview and an "x of 15 used" counter.
- `src/features/admin/home-images/home-image-item.tsx` - each image card with
  click-to-open and a remove control.
- `src/features/admin/admin-nav.tsx` - added "Homepage images" to the Platform group.
- `src/app/admin/page.tsx` - added a "Homepage images" section card.
- `src/features/home/home-image-carousel.tsx` - the public rotating panel:
  auto-rotate (pauses on hover, focus, single image, or reduced-motion), dots,
  previous/next, and a click-to-open lightbox with keyboard support.
- `src/features/home/hero.tsx` - now shows a two-column layout with the carousel on
  the right when at least one image exists; otherwise the exact original
  single-column hero.

## How to apply (Windows, in order)

1. Apply the migration.

   With the Supabase CLI:

   ```
   supabase db push
   ```

   Or paste `supabase/migrations/20260929093000_home_images.sql` into the Supabase
   SQL editor and run it.

2. Likely snag: creating policies on `storage.objects` can fail in the SQL editor
   with `must be owner of table objects`. This is a Supabase permission thing, not
   a bug in the migration. If that line errors, everything else in the migration
   still needs to have committed; then create the four storage policies from the
   Dashboard instead:

   Storage -> Policies -> `home-images` bucket, and add:
   - SELECT (public read): allowed for everyone.
   - INSERT, UPDATE, DELETE: allowed only when `public.is_admin()` is true.

   The bucket itself (`home-images`, public) is created by the migration, so you
   only need to add the object policies if that specific step errored.

3. Rebuild and run the app on Windows (a fresh build is not required for content
   to appear, but the new code must be built):

   ```
   npm run build
   npm start
   ```

   Keep Next pinned at 14.2.x. Do not let a fresh install jump the major version.

## How to verify

In an admin session:

- Open `/admin/home-images`. The list starts empty.
- Upload an image. It appears in the list and, on the public homepage, in the
  panel beside the headline straight away.
- Upload a few more and confirm they rotate on the homepage, that previous/next
  and the dots work, and that clicking one opens it full size (Escape closes it).
- Try to upload a 16th image: the server refuses with
  "You can add at most 15 homepage images." (the button also disables at 15).
- Remove an image and confirm it disappears from both the admin list and the
  homepage.

Quick database checks (admin session):

```
select * from public.admin_home_image_list();               -- rows you added
select id, public from storage.buckets where id = 'home-images';  -- 1 row, public = true
```

Non-admin check (a different, non-admin session): an upload attempt is refused by
storage RLS, and the admin RPCs return "You do not have access to this."

## Security notes

- The 15 limit and admin-only writes are both enforced in the database (trigger +
  RLS + `is_admin()` inside SECURITY DEFINER functions), not in the browser. The
  disabled button and counter are only convenience.
- The public read returns active rows only; hidden or removed images never reach a
  visitor.
- Uploaded file paths are generated on the server (`uuid.ext`); the client never
  chooses a storage path, so path traversal is not possible.
- The Content-Security-Policy already allows `https:` in `img-src`, so storage
  image URLs load with no CSP change.

## Checks run before handoff

- `npx tsc --noEmit` - clean.
- `npx eslint` on all new and changed files - clean.
- Em dash sweep across all new files and the migration - none present.
- The six user-facing messages in `actions.ts` were confirmed to match the
  migration's `raise exception` messages exactly, so friendly errors surface
  correctly rather than degrading to the generic message.
