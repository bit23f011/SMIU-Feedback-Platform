import { ShieldCheck } from "lucide-react";

import { CategoryChips } from "@/features/home/browse-categories";
import { HomeSearch } from "@/features/home/home-search";
import { SITE } from "@/lib/constants";

/*
  Hero - homepage ka pehla block.

  Headline jaan boojh kar "Understand your learning experience." hai, "find the
  right teacher for your course" nahi: students khud teacher choose nahi karte,
  is liye wo promise jhooti hoti. Yahan wada sirf itna hai ke jo experience tum
  guzarne wale ho, usko pehle se samajh sakte ho.

  Spacing: navbar ke foran neeche ka gap pehle bohat bara tha. Ab top padding
  chhoti hai (pt-8 / md:pt-10) taake pehli asli cheez jaldi nazar aaye, magar
  neeche ka rhythm wahi rehta hai.

  Primary action ek hi hai: search (teacher ya course). Uske neeche paanch
  category chips secondary raasta hain. Koi bara graphic, koi gradient nahi:
  weight typography aur spacing se aata hai.
*/
export function Hero() {
  return (
    <section>
      <div className="container pb-12 pt-8 md:pb-16 md:pt-10">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-1.5 rounded-md border border-coral-200 bg-coral-50 px-2 py-0.5 text-xs font-medium text-coral-700 dark:text-coral-300">
            <ShieldCheck aria-hidden="true" className="size-3" />
            ONLY VERIFIED STUDENT REVIEWS
          </p>

          <h1 className="mt-5 text-pretty text-display-md font-semibold text-foreground md:text-display-lg">
            Understand your learning experience.
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-600">
            Read what {SITE.university.shortName} students experienced with their teachers, labs,
            faculty and campus staff. Add your own review without your name being revealed.
          </p>
        </div>

        {/* Primary action */}
        <HomeSearch className="mt-8" />

        {/* Small category navigation - search ka halka sa alternative raasta. */}
        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Or browse
          </span>
          <CategoryChips />
        </div>
      </div>
    </section>
  );
}
