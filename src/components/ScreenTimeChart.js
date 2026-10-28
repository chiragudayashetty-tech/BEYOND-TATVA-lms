// Stacked bars: learning time in Beyond Tattva vs the rest of the device's screen time.
export default function ScreenTimeChart({ data, showDevice = true }) {
  const max = Math.max(...data.map((d) => (showDevice ? d.device : d.app)));
  return (
    <div>
      <div className="flex h-48 items-end gap-3">
        {data.map((d) => {
          const total = showDevice ? d.device : d.app;
          return (
            <div key={d.day} className="group flex flex-1 flex-col items-center gap-2">
              <span className="text-xs text-muted opacity-0 transition group-hover:opacity-100">
                {Math.floor(total / 60)}h {total % 60}m
              </span>
              <div className="flex w-full max-w-10 flex-col justify-end overflow-hidden rounded-lg" style={{ height: `${(total / max) * 150}px` }}>
                {showDevice && <div className="flex-1 bg-slate-600/50" />}
                <div className="bg-teal" style={{ height: `${(d.app / total) * 100}%` }} />
              </div>
              <span className="text-xs text-muted">{d.day}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-5 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-teal" /> Learning in Beyond Tattva</span>
        {showDevice && <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-slate-600/50" /> Other apps on the phone</span>}
      </div>
    </div>
  );
}
