import { LoadingState, SkeletonBar, SkeletonPanel, SkeletonRows } from "@/components/LoadingSkeleton";

export default function ReconcileLoading() {
  return <LoadingState label="payment reconciliation">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div className="space-y-2"><SkeletonBar className="h-8 w-64" /><SkeletonBar className="h-4 w-80 max-w-full" /></div><SkeletonBar className="h-11 w-40" /></div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <SkeletonPanel key={item}><SkeletonBar className="h-4 w-2/3" /><SkeletonBar className="mt-3 h-8 w-1/2" /></SkeletonPanel>)}</div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_2fr]"><SkeletonPanel title="By source"><SkeletonBar className="h-24 w-full" /></SkeletonPanel><SkeletonPanel title="Needs attention"><SkeletonRows count={3} /></SkeletonPanel></div>
    <SkeletonPanel title="All payments"><SkeletonRows count={5} /></SkeletonPanel>
  </LoadingState>;
}
