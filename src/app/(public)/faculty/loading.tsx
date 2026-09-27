import { PersonGridSkeleton } from "@/components/common/loading-state";
import { Skeleton } from "@/components/ui/skeleton";

// Route-level loading UI - shape asli page jaisi hai taake layout jump na ho.
export default function Loading() {
  return (
    <div className="container py-10 md:py-12">
      <div className="border-b border-border pb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-8 w-56" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
        <div className="mt-5 flex gap-1.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-28 rounded-md" />
          ))}
        </div>
      </div>
      <Skeleton className="mt-8 h-11 w-full max-w-xl rounded-md" />
      <PersonGridSkeleton className="mt-8" />
    </div>
  );
}
