import { LoadingState, SkeletonBar, SkeletonPanel } from "@/components/LoadingSkeleton";

export default function DashboardLoading() {
  return <LoadingState label="your dashboard">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((item) => <SkeletonPanel key={item}><SkeletonBar className="h-4 w-2/3" /><SkeletonBar className="mt-3 h-8 w-1/3" /><SkeletonBar className="mt-2 h-3 w-4/5" /></SkeletonPanel>)}</div>
    <div className="grid gap-4 lg:grid-cols-2"><SkeletonPanel><SkeletonBar className="h-6 w-2/3" /><SkeletonBar className="mt-3 aspect-video w-full" /></SkeletonPanel><SkeletonPanel><SkeletonBar className="h-6 w-2/3" /><SkeletonBar className="mt-3 h-24 w-full" /></SkeletonPanel></div>
    <SkeletonPanel title="Your journey"><div className="space-y-3">{[0, 1, 2].map((item) => <SkeletonBar key={item} className="h-20 w-full" />)}</div></SkeletonPanel>
  </LoadingState>;
}
