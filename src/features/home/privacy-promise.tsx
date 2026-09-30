import { Check, X } from "lucide-react";

import { Section } from "@/components/common/section";

/*
  Privacy - product ka trust anchor.

  Do halki si columns: green = jo hum karte hain, red = jo kabhi nahi hota.
  Rang jaan boojh kar bohat halka hai (state-*-soft background + thin border):
  bare red/green blocks alarm jaise lagte hain, jabke yahan message sukoon ka
  hai. Dono colours CSS variables se aate hain, is liye dark theme me khud
  adjust ho jate hain.
*/

const WE_DO = [
  "Reviews are published with no link back to who wrote them.",
  "We confirm you study here with one single verification email.",
  "Moderation happens on the server, never in your browser.",
] as const;

const WE_NEVER = [
  "Your name, student ID or email is never shown on a public page.",
  "Your review is never traced back to you for anyone else to see.",
  "Your address is never used for marketing.",
] as const;

export function PrivacyPromise() {
  return (
    <Section
      id="privacy"
      eyebrow="Privacy"
      title="Your privacy is the point"
      description="Reviews are only honest when they are safe to write. Your identity never reaches the people you review."
      className="scroll-mt-20"
      tinted
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-state-success/25 bg-state-success-soft p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span
              aria-hidden="true"
              className="flex size-5 items-center justify-center rounded-full border border-state-success/35 text-state-success"
            >
              <Check className="size-3" />
            </span>
            What SMIU Feedback Platform does
          </h3>
          <ul className="mt-3 list-none space-y-2.5">
            {WE_DO.map((item) => (
              <li key={item} className="text-sm leading-relaxed text-ink-700">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-state-danger/25 bg-state-danger-soft p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span
              aria-hidden="true"
              className="flex size-5 items-center justify-center rounded-full border border-state-danger/35 text-state-danger"
            >
              <X className="size-3" />
            </span>
            What never happens
          </h3>
          <ul className="mt-3 list-none space-y-2.5">
            {WE_NEVER.map((item) => (
              <li key={item} className="text-sm leading-relaxed text-ink-700">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        You can delete your account whenever you want. Your reviews stay, fully anonymised.
      </p>
    </Section>
  );
}
