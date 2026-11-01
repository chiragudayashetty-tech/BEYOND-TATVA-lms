import { Card } from "@/components/ui";

function Bar({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />;
}

export default function AdminLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading Studio">
      <span className="sr-only">Loading Studio…</span>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[0, 1, 2, 3].map((item) => <Card key={item}><Bar className="h-4 w-2/3" /><Bar className="mt-3 h-8 w-1/3" /><Bar className="mt-2 h-3 w-4/5" /></Card>)}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card title="Release schedule">{[0, 1, 2, 3, 4].map((item) => <div key={item} className="flex items-center gap-3 border-b border-border py-3 last:border-0"><Bar className="h-10 w-10 shrink-0 rounded-xl" /><div className="min-w-0 flex-1 space-y-2"><Bar className="h-4 w-2/3" /><Bar className="h-3 w-1/3" /></div><Bar className="h-6 w-16" /></div>)}</Card>
        <div className="space-y-4">
          <Card><Bar className="h-5 w-2/3" /><Bar className="mt-3 h-4 w-full" /></Card>
          <Card><Bar className="h-5 w-1/2" /><Bar className="mt-3 h-4 w-3/4" /></Card>
          <Card title="Studio"><div className="space-y-4">{[0, 1, 2, 3].map((item) => <div key={item} className="flex gap-3"><Bar className="h-8 w-8 shrink-0" /><Bar className="h-8 flex-1" /></div>)}</div></Card>
        </div>
      </div>
    </div>
  );
}
