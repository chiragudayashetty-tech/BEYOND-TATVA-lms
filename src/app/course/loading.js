import { LoadingFrame } from "@/components/LoadingSkeleton";
import { Card } from "@/components/ui";

function Bar({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />;
}

export default function CourseLoading() {
  return (
    <LoadingFrame>
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]" role="status" aria-label="Loading course">
      <span className="sr-only">Loading course…</span>
      <div className="min-w-0 space-y-6">
        <Card pad={false} className="overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="space-y-4 p-6">
              <Bar className="h-6 w-20" /><Bar className="h-9 w-3/4" />
              <Bar className="h-4 w-full" /><Bar className="h-4 w-5/6" />
              <div className="grid grid-cols-3 gap-3 pt-2">{[0, 1, 2].map((item) => <Bar key={item} className="h-16" />)}</div>
            </div>
            <Bar className="min-h-48 rounded-none" />
          </div>
        </Card>
        <Card title="Modules">
          <ol className="space-y-6">
            {[0, 1, 2, 3].map((item) => (
              <li key={item} className="flex gap-4">
                <Bar className="h-10 w-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-3">
                  <Bar className="h-4 w-28" /><Bar className="h-6 w-2/3" />
                  <Bar className="aspect-video w-full max-w-sm" />
                  <Bar className="h-4 w-5/6" />
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
      <aside className="hidden space-y-4 xl:block">
        {[0, 1, 2].map((item) => <Card key={item}><Bar className="h-5 w-2/3" /><Bar className="mt-3 h-4 w-full" /><Bar className="mt-2 h-4 w-4/5" /></Card>)}
      </aside>
    </div>
    </LoadingFrame>
  );
}
