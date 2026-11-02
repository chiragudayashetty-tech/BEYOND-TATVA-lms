import { LoadingState, SkeletonBar, SkeletonPanel } from "@/components/LoadingSkeleton";

export default function ProgressLoading() {
  return <LoadingState label="your progress">
    <div className="mb-6 space-y-2"><SkeletonBar className="h-8 w-48" /><SkeletonBar className="h-4 w-72 max-w-full" /></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((item) => <SkeletonPanel key={item}><SkeletonBar className="h-4 w-2/3" /><SkeletonBar className="mt-3 h-8 w-1/3" /><SkeletonBar className="mt-2 h-3 w-4/5" /></SkeletonPanel>)}</div>
    <SkeletonPanel title="By module"><div className="space-y-4">{[0, 1, 2, 3].map((item) => <div key={item} className="flex items-center gap-4"><SkeletonBar className="h-8 w-8 shrink-0" /><div className="flex-1 space-y-2"><SkeletonBar className="h-4 w-full" /><SkeletonBar className="h-2 w-full" /></div></div>)}</div></SkeletonPanel>
  </LoadingState>;
}
