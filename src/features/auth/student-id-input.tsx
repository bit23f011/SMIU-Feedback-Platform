"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { STUDENT_EMAIL_DOMAIN } from "@/features/auth/schemas";
import { cn } from "@/lib/utils";

/*
  StudentIdInput - Student ID field jismein domain suffix (@stu.smiu.edu.pk)
  field ke andar hi ek locked addon ki tarah nazar aata hai.

  MAQSAD: user ko saaf dikhe ke usay sirf ID likhni hai, domain khud lagta hai.
  Pehle kai log poora email (id@stu.smiu.edu.pk) type kar dete the, jis se server
  par domain DO BAAR lag jata (id@stu.smiu.edu.pk@stu.smiu.edu.pk) aur "match nahi
  hua" error aata. Ab domain sirf padhne ke liye chipka hua hai.

  ZAROORI: yeh sirf DIKHAWA + suhoolat hai, security nahi. Asli email server par
  hi banti hai (schemas.ts -> studentIdToEmail). Is liye agar user phir bhi kahin
  se "@..." paste kar de to hum usay yahin chup-chaap saaf kar dete hain taake
  double-domain wala masla dobara na ho. Jo naam/value server ko jata hai wo waisa
  hi hai jaisa pehle tha (name={name}), is liye koi auth logic nahi badalta.

  Uncontrolled bhi chal jata hai (JS off) aur controlled bhi (signup preview ke
  liye value/onChange diye ja sakte hain).
*/

export interface StudentIdInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "onChange" | "value"> {
  /** Controlled value (optional). Diya to component controlled ho jata hai. */
  value?: string;
  /** Saaf ki hui ID wapas deta hai (domain hissa hata kar). */
  onValueChange?: (cleaned: string) => void;
}

/*
  User jo bhi likhe usmein se domain/@ hissa nikaal do.

  - "bit21f002@stu.smiu.edu.pk" -> "bit21f002"
  - "bit21f002@" -> "bit21f002"
  - Beech me @ aaye to pehle @ se pehle wala hissa hi rakho.
  Spaces bhi hata dete hain kyunki ID me space hota hi nahi.
*/
function stripDomain(raw: string): string {
  const noSpace = raw.replace(/\s+/g, "");
  const at = noSpace.indexOf("@");
  return at === -1 ? noSpace : noSpace.slice(0, at);
}

export const StudentIdInput = React.forwardRef<HTMLInputElement, StudentIdInputProps>(
  ({ className, value, onValueChange, "aria-describedby": describedBy, ...props }, ref) => {
    const suffix = `@${STUDENT_EMAIL_DOMAIN}`;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const cleaned = stripDomain(event.target.value);
      // Agar domain paste hua tha to input ki visible value bhi foran theek kar do.
      if (cleaned !== event.target.value) {
        event.target.value = cleaned;
      }
      onValueChange?.(cleaned);
    };

    return (
      /*
        Ek "control group" jo bilkul Input jaisa dikhta hai: bahar wali border/ring
        yahan aati hai, andar wala input border-less hai. Is tarah focus ring poore
        group par aata hai aur domain suffix usi box ka hissa lagta hai.
      */
      <div
        className={cn(
          "flex h-10 w-full items-stretch overflow-hidden rounded-md border border-input bg-background shadow-xs",
          "transition-[border-color,box-shadow] duration-150 ease-out",
          "focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/35",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-within:ring-destructive/30",
          className,
        )}
        aria-invalid={props["aria-invalid"]}
      >
        <input
          {...props}
          ref={ref}
          type="text"
          inputMode="text"
          value={value}
          onChange={handleChange}
          aria-describedby={describedBy}
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-foreground outline-none",
            "placeholder:text-ink-400",
            "disabled:cursor-not-allowed disabled:text-ink-500",
          )}
        />
        {/*
          Domain suffix: sirf dikhawa, tab-stop nahi, screen reader se chhupa (label/hint
          me domain ka zikr pehle se hai). Halka background taake "locked" mehsoos ho.
        */}
        <span
          aria-hidden="true"
          className="pointer-events-none flex select-none items-center whitespace-nowrap border-l border-border bg-ink-50 px-3 text-sm text-muted-foreground"
        >
          {suffix}
        </span>
      </div>
    );
  },
);
StudentIdInput.displayName = "StudentIdInput";
