import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container py-10 md:py-12">
      <Skeleton className="h-4 w-32" />
      <div className="mt-6 flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:gap-6">
        <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="mt-3 h-4 w-48" />
          <div className="mt-4 flex gap-1.5">
            <Skeleton className="h-6 w-28 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
          <Skeleton className="mt-5 h-5 w-40" />
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-lg lg:col-span-2" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    </div>
  );
}
