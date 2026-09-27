import { Section } from "@/components/common/section";

/*
  How it works - numbering yahan sahi hai kyunke sequence sach me ordered hai.

  Pehle char steps the aur teesra step verification ko alag cheez bana kar
  dikhata tha. Ab teen steps hain: dhoondo, parho, review likho. Verification
  sign-in ka hissa hai, apna alag step nahi - usi tarah jaise asli experience
  me hota hai.
*/
const STEPS = [
  {
    title: "Search a teacher or course",
    body: "Look up a name or course code, or open the category you need.",
  },
  {
    title: "Explore verified student ratings",
    body: "Each profile shows its ratings, criteria scores and public profile information.",
  },
  {
    title: "Sign in and submit feedback",
    body: "A verified SMIU student account lets you submit structured feedback without your name being attached.",
  },
] as const;

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      eyebrow="How it works"
      title="Three steps"
      description="Verification keeps reviews coming from real students of this university."
      className="scroll-mt-20 border-t border-border"
    >
      <ol className="grid list-none gap-x-6 gap-y-8 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="border-t border-border pt-4">
            <span
              aria-hidden="true"
              className="inline-flex size-7 items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 text-[0.8125rem] font-semibold text-indigo-700 dark:text-indigo-200"
            >
              {index + 1}
            </span>
            <h3 className="mt-3 font-display text-base font-semibold text-foreground">
              {step.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
