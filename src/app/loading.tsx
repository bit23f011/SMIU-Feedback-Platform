import { AuraLoader } from "@/components/brand/aura-loader";

// Root loading state - navigation/suspense ke dauran dikhta hai. Aura loader typing
// animation chalata hai (reduced-motion par static "Aura+").
export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <AuraLoader size="lg" label="Loading ProfAura" />
    </div>
  );
}
