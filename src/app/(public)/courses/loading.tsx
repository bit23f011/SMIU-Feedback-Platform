import { ListSkeleton } from "@/components/common/loading-state";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container py-10 md:py-12">
      <div className="border-b border-border pb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-8 w-40" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="mt-8 h-11 w-full max-w-xl rounded-md" />
      <ListSkeleton rows={6} className="mt-8" />
    </div>
  );
}
