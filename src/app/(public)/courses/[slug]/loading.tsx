import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/common/loading-state";

export default function Loading() {
  return (
    <div className="container py-10 md:py-12">
      <Skeleton className="h-4 w-28" />
      <div className="mt-6 border-b border-border pb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-8 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        <div className="mt-4 flex gap-1.5">
          <Skeleton className="h-6 w-28 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-md" />
        </div>
      </div>
      <ListSkeleton rows={4} className="mt-8" />
    </div>
  );
}
