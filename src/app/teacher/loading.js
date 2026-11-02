import { LoadingState, SkeletonBar, SkeletonPanel, SkeletonRows } from "@/components/LoadingSkeleton";

export default function TeacherLoading() {
  return <LoadingState label="your class">
    <div className="mb-6 space-y-2"><SkeletonBar className="h-8 w-48" /><SkeletonBar className="h-4 w-32" /></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[0, 1, 2].map((item) => <SkeletonPanel key={item}><SkeletonBar className="h-4 w-2/3" /><SkeletonBar className="mt-3 h-8 w-1/3" /></SkeletonPanel>)}</div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]"><SkeletonPanel title="Students"><SkeletonRows count={5} /></SkeletonPanel><SkeletonPanel title="Class progress"><SkeletonBar className="h-40 w-full" /></SkeletonPanel></div>
  </LoadingState>;
}
