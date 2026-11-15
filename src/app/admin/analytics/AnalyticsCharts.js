import { Card, Empty } from "@/components/ui";

export function FunnelCard({ stages }) {
  return <Card title="Student journey">
    {stages.length ? <ol className="space-y-2">{stages.map((stage, index) => <li key={stage.key} className="rounded-xl border border-border bg-surface-2 p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><span className="font-medium">{index + 1}. {stage.label}</span><strong className="tabular-nums">{stage.count}</strong></div>
      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted"><span>{stage.ofSignups == null ? "–" : `${stage.ofSignups}%`} of sign-ups</span><span>{index === 0 ? "Starting point" : stage.conversion == null ? "– from previous (no students at previous stage)" : `${stage.conversion}% from previous`}</span></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(stage.ofSignups ?? 0, 100)}%` }} /></div>
    </li>)}</ol> : <Empty title="No sign-ups in this range" body="Choose a longer date range to see the student journey." />}
  </Card>;
}
