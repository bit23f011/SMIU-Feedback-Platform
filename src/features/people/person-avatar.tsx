import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initialsFromName } from "@/lib/utils";
import type { PersonGender } from "@/features/people/types";

/*
  PersonAvatar - MVP me koi photo upload nahi hai, isliye default illustration
  gender se choose hoti hai (male / female), aur gender maloom na ho to neutral.

  Design decision: teeno illustrations ek hi quiet tint me hain. Male ko neela aur
  female ko gulabi karna ek cliché hai aur professional bhi nahi lagta - farq sirf
  silhouette ka hai.

  photoUrl tab hi use hota hai jab admin ne koi official photo set ki ho.
*/

const GENDER_LABEL: Record<"male" | "female" | "unknown", string> = {
  male: "Default profile illustration",
  female: "Default profile illustration",
  unknown: "Default profile illustration",
};

function DefaultAvatarArt({ gender }: { gender: PersonGender | null }) {
  const key = gender ?? "unknown";

  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label={GENDER_LABEL[key]}
      className="h-full w-full bg-indigo-50 text-indigo-300"
    >
      {/* Shoulders - teeno variants me ek jaise. */}
      <path
        fill="currentColor"
        d="M24 30c8.4 0 15 4.6 15 11.3V48H9v-6.7C9 34.6 15.6 30 24 30z"
      />

      {gender === "female" ? (
        <>
          {/* Lambe baal (dono taraf) */}
          <path
            fill="currentColor"
            d="M24 6c6.6 0 11.5 4.6 11.5 11.2 0 3.4-.4 6.9-1.4 10.1-.3 1-1.8.8-1.8-.3V19a8.3 8.3 0 0 0-16.6 0v8c0 1.1-1.5 1.3-1.8.3-1-3.2-1.4-6.7-1.4-10.1C12.5 10.6 17.4 6 24 6z"
          />
          <circle fill="currentColor" cx="24" cy="19.5" r="8" />
        </>
      ) : gender === "male" ? (
        <>
          <circle fill="currentColor" cx="24" cy="19.5" r="8" />
          {/* Chhoti hair cap */}
          <path
            fill="currentColor"
            d="M16 18.5a8 8 0 0 1 16 0c1.2-6.6-2.7-11-8-11s-9.2 4.4-8 11z"
          />
        </>
      ) : (
        <circle fill="currentColor" cx="24" cy="19.5" r="8.5" />
      )}
    </svg>
  );
}

export interface PersonAvatarProps {
  name: string;
  gender?: PersonGender | null;
  photoUrl?: string | null;
  className?: string;
}

export function PersonAvatar({ name, gender = null, photoUrl, className }: PersonAvatarProps) {
  return (
    <Avatar className={cn("h-11 w-11", className)}>
      {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
      <AvatarFallback className="bg-transparent p-0" delayMs={photoUrl ? 300 : 0}>
        {/* Illustration hi primary fallback hai; initials sirf tab jab SVG na chale. */}
        <DefaultAvatarArt gender={gender} />
        <span className="sr-only">{initialsFromName(name)}</span>
      </AvatarFallback>
    </Avatar>
  );
}
