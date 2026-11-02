import { LoadingState, SkeletonBar, SkeletonRows } from "@/components/LoadingSkeleton";

export default function AssignmentsLoading() {
  return <LoadingState label="assignments">
    <div className="mb-6 space-y-2"><SkeletonBar className="h-8 w-44" /><SkeletonBar className="h-4 w-80 max-w-full" /></div>
    {[0, 1, 2].map((module) => <section key={module}><SkeletonBar className="mb-2 h-4 w-40" /><div className="card divide-y divide-border overflow-hidden px-4"><SkeletonRows count={2} /></div></section>)}
  </LoadingState>;
}
