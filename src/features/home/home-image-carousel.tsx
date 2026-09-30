"use client";

import * as React from "react";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { HomeHeroImage } from "@/features/home/home-images-data";

/*
  Homepage hero ka rotating image panel (headline ke bagal wali khali jagah).

  - Images admin set karta hai (DB se aati hain); yahan koi hardcoded image nahi.
  - Khud ba khud badalti hain (auto-rotate). Ruk jati hain jab: user hover/focus
    kare, ek hi image ho, ya prefers-reduced-motion on ho (accessibility - kuch
    logon ko khudkaar harkat se ghabrahat hoti hai).
  - Har image click karne par lightbox me poori khulti hai (view). Escape/backdrop
    band karta hai; arrow keys se agli/pichli.
  - Reduced-motion par cross-fade/animation 0s - image turant badalti hai, koi
    slide/zoom nahi.

  Yeh sirf presentation hai; kya dikhana hai woh server (RLS public-read) tay
  karta hai.
*/

const ROTATE_MS = 5000;

export function HomeImageCarousel({ images }: { images: HomeHeroImage[] }) {
  const count = images.length;
  const reduce = useReducedMotion() ?? false;

  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);

  const go = React.useCallback(
    (dir: number) => setIndex((i) => (((i + dir) % count) + count) % count),
    [count],
  );

  // Agar admin image hata de aur index range se bahar ho jaye to reset.
  React.useEffect(() => {
    if (index > count - 1) setIndex(0);
  }, [count, index]);

  // Auto-rotate. Ek image / hover-focus / reduced-motion / lightbox khula ho to ruko.
  React.useEffect(() => {
    if (count <= 1 || paused || reduce || lightboxOpen) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [count, paused, reduce, lightboxOpen]);

  // Lightbox: body scroll lock + keyboard (Escape band, arrows navigate).
  React.useEffect(() => {
    if (!lightboxOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      else if (event.key === "ArrowRight" && count > 1) go(1);
      else if (event.key === "ArrowLeft" && count > 1) go(-1);
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen, count, go]);

  if (count === 0) return null;

  const active = images[Math.min(index, count - 1)];
  const multiple = count > 1;

  return (
    <>
      <div
        className="group relative"
        role="region"
        aria-roledescription="carousel"
        aria-label="Homepage highlights"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-ink-100 shadow-sm">
          {images.map((image, i) => (
            <motion.img
              key={image.id}
              src={image.url}
              alt={image.alt}
              draggable={false}
              loading={i === 0 ? "eager" : "lazy"}
              initial={false}
              animate={{ opacity: i === index ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.6, ease: "easeInOut" }}
              aria-hidden={i === index ? undefined : true}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ))}

          {/* Poore panel par ek button: click => lightbox. */}
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label={active?.alt ? `View image: ${active.alt}` : "View image larger"}
            className="absolute inset-0 flex items-end justify-end p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <span className="pointer-events-none inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <Maximize2 aria-hidden="true" className="size-3.5" />
              View
            </span>
          </button>

          {/* Prev / next (sirf ek se ziyada image par). Button ke upar paint hote hain. */}
          {multiple ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex size-9 items-center justify-center rounded-full bg-white/85 text-ink-800 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
              >
                <ChevronLeft aria-hidden="true" className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next image"
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex size-9 items-center justify-center rounded-full bg-white/85 text-ink-800 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
              >
                <ChevronRight aria-hidden="true" className="size-5" />
              </button>
            </>
          ) : null}
        </div>

        {/* Dots */}
        {multiple ? (
          <div className="mt-3 flex items-center justify-center gap-2">
            {images.map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${count}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "h-2 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  i === index ? "w-5 bg-primary" : "w-2 bg-ink-300 hover:bg-ink-400",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Lightbox (poori image). */}
      <AnimatePresence>
        {lightboxOpen ? (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 sm:p-8"
            initial={{ opacity: reduce ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reduce ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            onClick={() => setLightboxOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={active?.alt || "Image viewer"}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X aria-hidden="true" className="size-5" />
            </button>

            {multiple ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  go(-1);
                }}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronLeft aria-hidden="true" className="size-6" />
              </button>
            ) : null}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active?.url}
              alt={active?.alt ?? ""}
              draggable={false}
              onClick={(event) => event.stopPropagation()}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            />

            {multiple ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  go(1);
                }}
                aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronRight aria-hidden="true" className="size-6" />
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
