import { LoadingState, SkeletonBar, SkeletonPanel, SkeletonRows } from "@/components/LoadingSkeleton";

export default function PipelineLoading() {
  return <LoadingState label="Studio pipeline">
    <div className="mb-6 space-y-2"><SkeletonBar className="h-8 w-44" /><SkeletonBar className="h-4 w-full max-w-xl" /></div>
    <div className="mb-4 flex gap-2"><SkeletonBar className="h-11 w-40" /><SkeletonBar className="h-11 w-40" /></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{[0, 1, 2, 3, 4].map((item) => <SkeletonPanel key={item}><SkeletonBar className="h-4 w-2/3" /><SkeletonBar className="mt-3 h-8 w-1/3" /></SkeletonPanel>)}</div>
    <SkeletonPanel className="mt-6"><div className="mb-3 flex flex-wrap gap-3"><SkeletonBar className="h-11 w-full sm:w-52" /><SkeletonBar className="h-11 w-28" /><SkeletonBar className="h-11 w-32" /></div><SkeletonRows count={6} /></SkeletonPanel>
  </LoadingState>;
}
