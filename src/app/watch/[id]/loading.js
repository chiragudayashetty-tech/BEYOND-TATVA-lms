import { LoadingFrame } from "@/components/LoadingSkeleton";
import { Card } from "@/components/ui";

function Bar({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />;
}

export default function WatchLoading() {
  return (
    <LoadingFrame>
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_320px]" role="status" aria-label="Loading lesson">
      <span className="sr-only">Loading lesson…</span>
      <div className="min-w-0 space-y-5">
        <div className="space-y-2"><Bar className="h-4 w-28" /><Bar className="h-8 w-2/3" /></div>
        <Bar className="aspect-video w-full rounded-2xl" />
        <Card title="About this lesson"><Bar className="h-4 w-full" /><Bar className="mt-2 h-4 w-4/5" /></Card>
        <Card title="Quick check"><Bar className="h-5 w-3/4" /><Bar className="mt-4 h-12 w-full" /><Bar className="mt-2 h-12 w-full" /></Card>
      </div>
      <aside className="space-y-4">
        <Card title="Lessons">{[0, 1, 2, 3].map((item) => <div key={item} className="flex gap-3 py-3"><Bar className="h-9 w-9 shrink-0" /><div className="flex-1 space-y-2"><Bar className="h-4 w-2/3" /><Bar className="h-3 w-1/2" /></div></div>)}</Card>
      </aside>
    </div>
    </LoadingFrame>
  );
}
