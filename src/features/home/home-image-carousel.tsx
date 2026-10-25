"use client";
import * as React from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import type { HomeHeroImage } from "@/features/home/home-images-data";
import { cn } from "@/lib/utils";

export function HomeImageCarousel({ images }: { images: HomeHeroImage[] }) {
  const [index, setIndex] = React.useState(0);
  const reduce = useReducedMotion();
  React.useEffect(() => {
    if (images.length < 2 || reduce) return;
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % images.length),
      8000,
    );
    return () => window.clearInterval(timer);
  }, [images.length, reduce]);
  React.useEffect(() => {
    if (index >= images.length) setIndex(0);
  }, [images.length, index]);
  if (!images.length) return null;
  return (
    <>
      <div className="campus-backdrop" aria-hidden="true">
        {images.map((image, i) => (
          <Image
            key={image.id}
            src={image.url}
            alt=""
            fill
            sizes="100vw"
            unoptimized
            priority={i === 0}
            loading={i < 2 ? "eager" : "lazy"}
            draggable={false}
            className={cn("campus-backdrop-image", i === index && "is-current")}
          />
        ))}
      </div>
      {images.length > 1 ? (
        <div
          className="campus-photo-controls"
          role="group"
          aria-label="Campus photographs"
        >
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={"Show campus photo " + (i + 1)}
              aria-pressed={index === i}
              className={cn(
                "flex size-6 items-center justify-center rounded-full transition-opacity after:size-2 after:rounded-full after:bg-current",
                index === i ? "opacity-100" : "opacity-50 hover:opacity-80",
              )}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
