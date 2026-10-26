import Link from "next/link";
import { Suspense } from "react";
import { HomeImageCarousel } from "@/features/home/home-image-carousel";
import { getActiveHomeImages } from "@/features/home/home-images-data";
import { HomeSearch } from "@/features/home/home-search";
import { ArrowRight } from "@/components/ui/icons";
async function CampusPhotos() {
  const images = await getActiveHomeImages();
  return <HomeImageCarousel images={images} />;
}

export function Hero() {
  return (
    <section className="campus-hero" aria-labelledby="home-heading">
      <Suspense fallback={null}>
        <CampusPhotos />
      </Suspense>
      <div className="container relative z-10 flex min-h-[610px] flex-col justify-center py-12 md:min-h-[650px] md:py-16">
        <div className="w-full max-w-[670px]">
          <div className="hero-copy max-w-[580px] rounded-lg p-5 sm:p-7 md:p-8">
            <p className="eyebrow flex items-center gap-3">
              <span className="h-px w-7 bg-primary" />
              Sindh Madressatul Islam University · Karachi
            </p>
            <h1
              id="home-heading"
              className="editorial-title mt-6 text-[2.8rem] leading-[1.08] text-foreground sm:text-[3.7rem] lg:text-[4.5rem]"
            >
              A campus.
              <br />A thousand experiences.
            </h1>
            <p className="mt-5 max-w-[390px] text-[15px] leading-7 text-ink-700">
              Before your first semester or your next course, hear from students
              who have been there.
            </p>
          </div>
          <HomeSearch className="mt-8 max-w-[510px]" />
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px]">
            <Link
              href="/teachers"
              data-tour="explore"
              className="inline-flex items-center gap-2 font-semibold text-primary"
            >
              Explore teacher reviews
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <span className="text-ink-600">
              Open to everyone. No sign-in to read.
            </span>
          </div>
        </div>
        <div className="hero-caption mt-10 flex w-fit items-center gap-3 rounded-md px-3 py-2 lg:absolute lg:bottom-12 lg:right-8 lg:mt-0">
          <span className="h-px w-8 bg-current" />
          <span>SMIU, through a student lens.</span>
        </div>
      </div>
      <div className="relative z-10 border-t border-border/70 bg-background/90">
        <div className="container grid grid-cols-2 divide-x divide-border py-5 md:grid-cols-4">
          {[
            ["01", "New to SMIU?", "Explore campus feedback", "/uni-staff"],
            [
              "02",
              "Planning a course?",
              "Read teacher experiences",
              "/teachers",
            ],
            [
              "03",
              "Already a student?",
              "Share your perspective",
              "/auth/signup",
            ],
            ["04", "Coming back?", "Open your dashboard", "/student"],
          ].map(([number, title, label, href]) => (
            <Link
              key={number}
              href={href}
              data-tour={href === "/auth/signup" ? "account" : undefined}
              className="group flex gap-3 px-4 py-2 first:pl-0 md:px-6"
            >
              <span className="pt-1 text-[10px] font-semibold text-primary">
                {number}
              </span>
              <div>
                <span className="block text-[13px] font-semibold">{title}</span>
                <span className="mt-1 block text-[11px] text-muted-foreground group-hover:text-primary">
                  {label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
