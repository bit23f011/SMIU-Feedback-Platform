"use client";
import { PersonCard } from "@/features/people/person-card";
import type { PersonCategory, PersonSummary } from "@/features/people/types";
import { cn } from "@/lib/utils";
export function ProfileMarquee({
  people,
  category,
  reverse = false,
  label,
}: {
  people: PersonSummary[];
  category: PersonCategory;
  reverse?: boolean;
  label: string;
}) {
  return (
    <div
      className={cn("profile-marquee", reverse && "is-reverse")}
      role="region"
      aria-label={label}
    >
      <div className="container mb-4 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <div className="marquee-viewport">
        <div className="marquee-track">
          <ul className="marquee-group">
            {people.map((person) => (
              <li key={person.id}>
                <PersonCard
                  person={person}
                  contextCategory={category}
                  className="h-full"
                />
              </li>
            ))}
          </ul>
          <div aria-hidden="true" className="marquee-group marquee-copy">
            {people.map((person) => (
              <div key={person.id}>
                <PersonCard
                  person={person}
                  contextCategory={category}
                  className="h-full"
                  tabIndex={-1}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
