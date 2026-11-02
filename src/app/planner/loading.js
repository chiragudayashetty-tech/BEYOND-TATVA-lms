import { LoadingState, SkeletonBar, SkeletonPanel } from "@/components/LoadingSkeleton";

export default function PlannerLoading() {
  return <LoadingState label="study planner">
    <div className="mb-6 space-y-2"><SkeletonBar className="h-8 w-48" /><SkeletonBar className="h-4 w-80 max-w-full" /></div>
    <SkeletonPanel><div className="flex items-center justify-between gap-3"><SkeletonBar className="h-11 w-11" /><SkeletonBar className="h-6 w-40" /><SkeletonBar className="h-11 w-11" /></div>
      <div className="mt-5 grid grid-cols-7 gap-1 sm:gap-2">{[...Array(35)].map((_, item) => <SkeletonBar key={item} className="aspect-square w-full rounded-lg" />)}</div>
    </SkeletonPanel>
  </LoadingState>;
}
