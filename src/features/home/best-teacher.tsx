import * as React from "react";

import { Section } from "@/components/common/section";
import { Skeleton } from "@/components/ui/skeleton";
import { TopPersonCard } from "@/features/home/top-person-card";
import { getTopPersonByCategory } from "@/features/people/queries";

/*
  Best teacher - homepage ka ek hi "highlight" slot.

  Ab yeh asli data par chalta hai: `getTopPersonByCategory` wohi teacher deta
  hai jiske paas minimum verified reviews hain aur average sab se upar hai.
  Koi eligible na ho to card khud imandar empty state dikhata hai.

  YAAD RAHE: yahan kabhi koi hardcoded SMIU teacher ka naam mat likhna. Agar
  demo data chahiye to wo seed/dev data me ho, production component me nahi.

  Pehle is section ke sath ek lamba "How the top spot is earned" panel tha
  (verified students only / minimum reviews / averaged never hand-picked). Wo
  teeno baatein ek hi jumle me aa jati hain, is liye ab ek line hai.

  Fetch Suspense ke andar hai (FeaturedPeople wala pattern) taake heading foran
  aaye aur card ki jagah usi shape ka skeleton rahe.
*/

async function TopTeacher() {
  const topTeacher = await getTopPersonByCategory({ category: "teacher" });

  return (
    <TopPersonCard
      person={topTeacher}
      noun="teacher"
      browseHref="/teachers"
      browseLabel="Browse teachers"
    />
  );
}

export function BestTeacher() {
  return (
    <Section
      id="best-teacher"
      eyebrow="Highlight"
      title="Top rated teacher"
      description="Rankings are based on verified student ratings and the minimum review threshold."
      tinted
    >
      <React.Suspense fallback={<Skeleton className="h-[9.5rem] w-full rounded-lg" />}>
        <TopTeacher />
      </React.Suspense>
    </Section>
  );
}
