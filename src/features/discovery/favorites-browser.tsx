"use client";

import * as React from "react";

import Link from "next/link";
import { GitCompare, X } from "lucide-react";

import { RatingStars } from "@/components/common/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PersonAvatar } from "@/features/people/person-avatar";
import { FavoriteButton } from "@/features/discovery/favorite-button";
import { COMPARE_MAX, COMPARE_MIN, type SavedPerson } from "@/features/discovery/types";
import type { PersonCategory } from "@/features/people/types";
import { getCategoryMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";

/*
  FavoritesBrowser - README §45 (favourites) + §43 (compare ka entry point).

  Do kaam:
   1) Har saved profile ko dikhata hai, sath "Saved" toggle (hata dene ke liye).
   2) 2..4 profiles chun kar unhe /compare par le jata hai.

  COMPARE EK CATEGORY: compare_people ek hi category ke log leti hai (teacher ke
  sath teacher, lab ke sath lab). Isliye pehla chunte hi baaki categories ke
  checkboxes band ho jate hain, ek narm hint ke sath. Yeh sirf UI ka anusaasan
  hai; asli natija DB usi category par deti hai.

  SELECTION SIRF IS PAGE KA: chunao is page ki list tak mehdood hai (client
  state), isliye "select karo phir compare" ek nazar me samajh aata hai.
*/

/** Compare ke liye person ki category: primary, warna pehla role, warna teacher. */
function compareCategory(person: SavedPerson): PersonCategory {
  return person.primaryCategory ?? person.roles[0]?.category ?? "teacher";
}

function SavedCard({
  person,
  selected,
  disabled,
  onToggle,
}: {
  person: SavedPerson;
  selected: boolean;
  disabled: boolean;
  onToggle: (id: string) => void;
}) {
  const meta = getCategoryMeta(compareCategory(person));
  const role = person.roles.find((item) => item.isPrimary) ?? person.roles[0];
  const checkboxId = `compare-${person.id}`;

  return (
    <Card
      className={cn(
        "relative flex flex-col p-5 transition-[border-color,box-shadow] duration-150 ease-out",
        selected && "border-primary/50 shadow-card-hover",
      )}
    >
      <div className="flex items-start gap-3.5">
        <PersonAvatar name={person.name} gender={person.gender} photoUrl={person.photoUrl} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold leading-snug tracking-tight text-foreground">
            <Link
              href={`/people/${person.slug}`}
              className="rounded-sm outline-none transition-colors duration-150 ease-out hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {person.name}
            </Link>
          </h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {role?.title ?? person.headline ?? meta.singular}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Badge variant="category">{meta.singular}</Badge>
        {role?.department ? <Badge variant="brand">{role.department}</Badge> : null}
      </div>

      <div className="mt-4 border-t border-border/80 pt-3.5">
        <RatingStars value={person.rating} count={person.reviewCount} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <label
          htmlFor={checkboxId}
          className={cn(
            "inline-flex items-center gap-2 text-sm font-medium",
            disabled ? "cursor-not-allowed text-ink-400" : "cursor-pointer text-ink-700",
          )}
        >
          <input
            id={checkboxId}
            type="checkbox"
            checked={selected}
            disabled={disabled}
            onChange={() => onToggle(person.id)}
            className="size-4 rounded border-ink-300 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed"
          />
          Compare
        </label>

        <FavoriteButton personId={person.id} personName={person.name} initialSaved />
      </div>
    </Card>
  );
}

export function FavoritesBrowser({ people }: { people: SavedPerson[] }) {
  const [selected, setSelected] = React.useState<string[]>([]);

  // Pehla chuna hua jis category ka hai, compare usi category me hota hai.
  const lockedCategory = React.useMemo<PersonCategory | null>(() => {
    if (selected.length === 0) return null;
    const first = people.find((person) => person.id === selected[0]);
    return first ? compareCategory(first) : null;
  }, [people, selected]);

  const toggle = React.useCallback((id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length >= COMPARE_MAX
          ? current
          : [...current, id],
    );
  }, []);

  const canCompare = selected.length >= COMPARE_MIN && selected.length <= COMPARE_MAX;
  const compareHref = canCompare
    ? `/compare?ids=${selected.join(",")}&category=${lockedCategory ?? "teacher"}`
    : "#";

  return (
    <>
      <ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((person) => {
          const isSelected = selected.includes(person.id);
          // Alag category ho, ya 4 pehle hi chune hue hon, to naya chunao band.
          const blockedByCategory =
            lockedCategory !== null && compareCategory(person) !== lockedCategory;
          const blockedByMax = !isSelected && selected.length >= COMPARE_MAX;

          return (
            <li key={person.id} className="flex">
              <SavedCard
                person={person}
                selected={isSelected}
                disabled={!isSelected && (blockedByCategory || blockedByMax)}
                onToggle={toggle}
              />
            </li>
          );
        })}
      </ul>

      {/* Sticky compare bar - sirf tab jab kuch chuna gaya ho. */}
      {selected.length > 0 ? (
        <div className="sticky bottom-4 z-20 mt-6">
          <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-card-hover">
            <p className="text-sm text-ink-700">
              <span className="font-semibold text-foreground">{selected.length}</span> selected
              {!canCompare ? (
                <span className="text-muted-foreground">
                  {" "}
                  {selected.length < COMPARE_MIN
                    ? `(pick at least ${COMPARE_MIN})`
                    : `(up to ${COMPARE_MAX})`}
                </span>
              ) : null}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelected([])}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-[0.8125rem] font-medium text-ink-700 transition-colors duration-150 ease-out hover:border-ink-400 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <X aria-hidden="true" className="size-4" />
                Clear
              </button>
              {canCompare ? (
                <Link
                  href={compareHref}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-[0.8125rem] font-medium text-primary-foreground shadow-xs transition-colors duration-150 ease-out hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <GitCompare aria-hidden="true" className="size-4" />
                  Compare {selected.length}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-md bg-primary/40 px-3.5 text-[0.8125rem] font-medium text-primary-foreground"
                >
                  <GitCompare aria-hidden="true" className="size-4" />
                  Compare
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
