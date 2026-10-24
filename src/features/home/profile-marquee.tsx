"use client";
import { useState } from "react";
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
  const [paused, setPaused] = useState(false);
  return (
    <div
      className={cn("profile-marquee", reverse && "is-reverse")}
      data-paused={paused ? "true" : "false"}
      role="region"
      aria-label={label}
    >
      <div className="container mb-4 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          {paused ? "Resume movement" : "Pause movement"}
        </button>
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
          <div aria-hidden="true" inert className="marquee-group marquee-copy">
            {people.map((person) => (
              <div key={person.id}>
                <PersonCard
                  person={person}
                  contextCategory={category}
                  className="h-full"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
