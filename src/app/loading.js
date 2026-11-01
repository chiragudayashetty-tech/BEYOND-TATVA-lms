// Shown the instant a link is tapped, for every page without its own loading.js. With it, Next.js
// prefetches each page up to this point, so taps feel immediate even before the server answers.
function Bar({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />;
}

export default function Loading() {
  return (
    <div className="min-h-screen lg:pl-64" role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/15">
        <div className="h-full w-2/5 bg-primary animate-[nav-progress_1s_ease-in-out_infinite]" />
      </div>
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6 lg:px-8">
        <Bar className="h-6 w-32" />
        <div className="ml-auto flex gap-2"><Bar className="h-11 w-11 rounded-xl" /><Bar className="h-11 w-11 rounded-full" /></div>
      </div>
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 pt-6 sm:px-6 lg:px-8">
        <Bar className="h-8 w-2/3 max-w-sm" />
        <Bar className="h-4 w-5/6 max-w-md" />
        <div className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Bar key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Bar className="h-48 rounded-2xl" />
      </div>
    </div>
  );
}
