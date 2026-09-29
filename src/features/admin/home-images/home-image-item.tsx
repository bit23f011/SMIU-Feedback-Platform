"use client";

import * as React from "react";

import { useFormState, useFormStatus } from "react-dom";
import { ExternalLink, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteHomeImageAction } from "@/features/admin/home-images/actions";
import { EMPTY_HOME_IMAGE_ACTION_STATE } from "@/features/admin/home-images/form-state";
import type { AdminHomeImage } from "@/features/admin/home-images/types";

/*
  Ek hero image ka admin card: preview + description + remove.

  SECURITY: delete deleteHomeImageAction -> admin_delete_home_image (is_admin())
  tak jata hai. Yahan ka button authority nahi. Preview click nayi tab me poori
  image kholta hai (public URL).
*/

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="destructive" disabled={pending}>
      <Trash2 aria-hidden="true" />
      {pending ? "Removing" : "Remove image"}
    </Button>
  );
}

export function HomeImageItem({ image, position }: { image: AdminHomeImage; position: number }) {
  const [state, formAction] = useFormState(deleteHomeImageAction, EMPTY_HOME_IMAGE_ACTION_STATE);

  return (
    <li className="list-none overflow-hidden rounded-lg border border-border bg-card">
      {/* Click -> nayi tab me poori image. */}
      <a
        href={image.url}
        target="_blank"
        rel="noreferrer"
        className="group relative block aspect-video overflow-hidden bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={image.altText ?? ""}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
        />
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[0.6875rem] font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <ExternalLink aria-hidden="true" className="size-3" />
          Open
        </span>
        <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[0.6875rem] font-medium tabular-nums text-white">
          #{position}
        </span>
      </a>

      <div className="p-4">
        <p className="min-h-[1.25rem] text-sm leading-relaxed text-ink-700">
          {image.altText ? image.altText : <span className="text-muted-foreground">No description</span>}
        </p>

        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-state-danger [&::-webkit-details-marker]:hidden">
            Remove
          </summary>
          <div className="mt-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              This deletes the image from the homepage and from storage for good.
            </p>
            <form action={formAction} className="mt-3 flex flex-wrap items-center gap-3">
              <input type="hidden" name="imageId" value={image.id} />
              <DeleteButton />
              {state.error ? (
                <span role="alert" className="text-sm text-state-danger">
                  {state.error}
                </span>
              ) : null}
            </form>
          </div>
        </details>
      </div>
    </li>
  );
}
