import { Card, Empty } from "@/components/ui";

export function BarChart({ title, data, format = (value) => String(value), colors = ["bg-primary", "bg-primary/70", "bg-success", "bg-warning", "bg-danger"] }) {
  if (!data?.length) return <Card title={title}><Empty title="No data yet" body="This chart will fill in as activity is recorded." /></Card>;
  const max = Math.max(1, ...data.map((item) => Number(item.value) || 0));
  return <Card title={title}>
    <div className="overflow-x-auto pb-2"><div className="flex min-h-56 min-w-max items-end gap-3 px-2 pt-8">
      {data.map((item, index) => <div key={`${item.label}-${index}`} className="flex w-16 flex-col items-center gap-2" title={`${item.label}: ${format(item.value)}`}>
        <span className="text-xs font-semibold tabular-nums">{format(item.value)}</span>
        <div className={`w-9 rounded-t-lg ${colors[index % colors.length]}`} style={{ height: `${Math.max(4, (Number(item.value) / max) * 140)}px` }} />
        <span className="w-full break-words text-center text-[11px] leading-tight text-muted">{item.label}</span>
      </div>)}
    </div></div>
  </Card>;
}

export function FunnelCard({ stages }) {
  return <Card title="Student journey">
    {stages.length ? <ol className="space-y-2">{stages.map((stage, index) => <li key={stage.key} className="rounded-xl border border-border bg-surface-2 p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><span className="font-medium">{index + 1}. {stage.label}</span><strong className="tabular-nums">{stage.count}</strong></div>
      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted"><span>{stage.ofSignups == null ? "–" : `${stage.ofSignups}%`} of sign-ups</span><span>{index === 0 ? "Starting point" : stage.conversion == null ? "– from previous (no students at previous stage)" : `${stage.conversion}% from previous`}</span></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(stage.ofSignups ?? 0, 100)}%` }} /></div>
    </li>)}</ol> : <Empty title="No sign-ups in this range" body="Choose a longer date range to see the student journey." />}
  </Card>;
}
