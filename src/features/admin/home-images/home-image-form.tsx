"use client";

import * as React from "react";

import { useFormState, useFormStatus } from "react-dom";
import { ImagePlus, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadHomeImageAction } from "@/features/admin/home-images/actions";
import { EMPTY_HOME_IMAGE_ACTION_STATE } from "@/features/admin/home-images/form-state";
import { HOME_IMAGE_ACCEPT, HOME_IMAGE_MAX } from "@/features/admin/home-images/types";

/*
  Hero image upload form.

  SECURITY: submit uploadHomeImageAction tak jata hai; asal rok DB me hai
  (storage RLS is_admin() + admin_add_home_image RPC + cap 15 trigger). Yeh form
  sirf shakal + halki UX checks (file type/size) hai. `disabled` sirf UI aasani
  hai - server phir bhi cap enforce karta hai.

  Kaamyaabi par: file input reset ho jata hai (dubara wahi file na chip jaye) aur
  list revalidatePath se khud refresh hoti hai.
*/

function SubmitButton({ atCap }: { atCap: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending || atCap}>
      <Upload aria-hidden="true" />
      {pending ? "Uploading" : "Upload image"}
    </Button>
  );
}

export function HomeImageForm({ count }: { count: number }) {
  const [state, formAction] = useFormState(uploadHomeImageAction, EMPTY_HOME_IMAGE_ACTION_STATE);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  const atCap = count >= HOME_IMAGE_MAX;
  const remaining = Math.max(0, HOME_IMAGE_MAX - count);

  // Kaamyaab upload ke baad form saaf karo (file + alt + preview).
  React.useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return null;
      });
    }
  }, [state]);

  // Preview URL ko unmount par cleanup.
  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[7rem,1fr] sm:items-start">
        {/* Thumbnail preview (client-only, upload se pehle). */}
        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-ink-50 sm:aspect-square">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus aria-hidden="true" className="size-6 text-ink-400" />
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="home-image-file">
              Image <span className="text-state-danger">*</span>
            </Label>
            <Input
              id="home-image-file"
              name="image"
              type="file"
              accept={HOME_IMAGE_ACCEPT}
              required
              disabled={atCap}
              onChange={onFileChange}
              className="cursor-pointer file:mr-3 file:cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP, AVIF or GIF, up to 3 MB. Wide (landscape) images look best.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="home-image-alt">Description (optional)</Label>
            <Input
              id="home-image-alt"
              name="altText"
              maxLength={200}
              disabled={atCap}
              placeholder="What the image shows, for screen readers"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton atCap={atCap} />
        <span className="text-xs tabular-nums text-muted-foreground">
          {count} of {HOME_IMAGE_MAX} used
          {atCap ? " (limit reached)" : ` · ${remaining} left`}
        </span>
        {state.error ? (
          <span role="alert" className="text-sm text-state-danger">
            {state.error}
          </span>
        ) : state.ok ? (
          <span role="status" className="text-sm text-state-success">
            Uploaded.
          </span>
        ) : null}
      </div>

      {atCap ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          You have reached the limit of {HOME_IMAGE_MAX} images. Remove one below to add another.
        </p>
      ) : null}
    </form>
  );
}
