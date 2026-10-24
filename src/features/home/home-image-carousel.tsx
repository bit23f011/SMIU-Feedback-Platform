"use client";
import * as React from "react";
import { useReducedMotion } from "framer-motion";
import type { HomeHeroImage } from "@/features/home/home-images-data";
import { cn } from "@/lib/utils";

export function HomeImageCarousel({ images }: { images: HomeHeroImage[] }) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const reduce = useReducedMotion();
  React.useEffect(() => {
    if (images.length < 2 || paused || reduce) return;
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % images.length),
      8000,
    );
    return () => window.clearInterval(timer);
  }, [images.length, paused, reduce]);
  React.useEffect(() => {
    if (index >= images.length) setIndex(0);
  }, [images.length, index]);
  if (!images.length) return null;
  return (
    <>
      <div className="campus-backdrop" aria-hidden="true">
        {images.map((image, i) => (
          <img
            key={image.id}
            src={image.url}
            alt=""
            loading={i < 2 ? "eager" : "lazy"}
            draggable={false}
            className={cn("campus-backdrop-image", i === index && "is-current")}
          />
        ))}
      </div>
      <div className="campus-veil" aria-hidden="true" />
      {images.length > 1 ? (
        <div
          className="campus-photo-controls"
          role="group"
          aria-label="Campus photographs"
        >
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={
              paused ? "Play campus slideshow" : "Pause campus slideshow"
            }
            aria-pressed={paused}
            className="photo-control"
          >
            {paused ? "Play" : "Pause"}
          </button>
          <span aria-hidden="true" className="opacity-40">
            /
          </span>
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => {
                setIndex(i);
                setPaused(true);
              }}
              aria-label={"Show campus photo " + (i + 1)}
              aria-pressed={index === i}
              className={cn(
                "size-2 rounded-full bg-current transition-opacity",
                index === i ? "opacity-100" : "opacity-35 hover:opacity-70",
              )}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
