import * as React from "react";

import Link from "next/link";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PersonGridSkeleton } from "@/components/common/loading-state";
import { Section } from "@/components/common/section";
import { Button } from "@/components/ui/button";
import { PersonGrid } from "@/features/people/person-card";
import { listPeopleByCategory } from "@/features/people/queries";

/*
  Featured profiles - homepage par kuch asli profile cards.

  Yeh data seedha database se aata hai (RLS ke through, sirf is_active rows).
  Koi hard-coded naam, koi demo rating nahi: jitne teachers reference data me
  hain, unme se pehle chhe dikhte hain. Agar table khali ho to page jhooth
  bolne ke bajaye saaf keh deta hai ke abhi koi profile nahi.

  Grid Suspense ke andar hai taake heading foran nazar aaye aur cards ki jagah
  usi shape ka skeleton dikhe - layout hilta nahi.
*/

const FEATURED_LIMIT = 6;

async function FeaturedPeopleGrid() {
  const { people, failed } = await listPeopleByCategory({
    category: "teacher",
    limit: FEATURED_LIMIT,
  });

  if (failed) {
    return (
      <ErrorState
        title="We could not load profiles"
        description="This section is temporarily unavailable. Please refresh the page or try again shortly."
      />
    );
  }

  if (people.length === 0) {
    return (
      <EmptyState
        icon={<Users />}
        title="No profiles are listed yet"
        description="Teacher profiles appear here as soon as they are added to the directory."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/teachers">Open the directory</Link>
          </Button>
        }
      />
    );
  }

  return <PersonGrid people={people} contextCategory="teacher" />;
}

export function FeaturedPeople() {
  return (
    <Section
      id="profiles"
      eyebrow="Profiles"
      title="Start with a few teachers"
      description="Every person on ProfAura has exactly one profile, even when they hold more than one role."
      link={{ href: "/teachers", label: "See all teachers" }}
    >
      <React.Suspense fallback={<PersonGridSkeleton count={FEATURED_LIMIT} />}>
        <FeaturedPeopleGrid />
      </React.Suspense>
    </Section>
  );
}
