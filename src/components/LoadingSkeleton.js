import { Card } from "@/components/ui";

// Same frame as app/loading.js (top progress bar, top bar, page padding, room for the sidebar), so the
// screen doesn't jump between the skeleton and the real page.
export function LoadingFrame({ children }) {
  return (
    <div className="min-h-screen lg:pl-64">
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/15">
        <div className="bt-bar h-full w-2/5 animate-[nav-progress_1s_ease-in-out_infinite]" />
      </div>
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6 lg:px-8">
        <SkeletonBar className="h-6 w-32" />
        <div className="ml-auto flex gap-2"><SkeletonBar className="h-11 w-11 rounded-xl" /><SkeletonBar className="h-11 w-11 rounded-full" /></div>
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">{children}</div>
    </div>
  );
}

export function LoadingState({ label, children, className = "space-y-6" }) {
  return <LoadingFrame>
    <div role="status" aria-label={`Loading ${label}`} className={className}>
      <span className="sr-only">Loading {label}…</span>
      <OrbitLoader label={label} />
      {children}
    </div>
  </LoadingFrame>;
}

export function SkeletonBar({ className = "" }) {
  return <div aria-hidden="true" className={`bt-skeleton rounded-lg bg-surface-2 ${className}`} />;
}

export function SkeletonPanel({ title, children, className = "" }) {
  return <Card title={title} className={className}>{children}</Card>;
}

export function SkeletonRows({ count = 4, className = "" }) {
  return <div className={className}>{Array.from({ length: count }, (_, index) => <div key={index} aria-hidden="true" className="flex items-center gap-3 border-b border-border py-3 last:border-0">
    <SkeletonBar className="h-10 w-10 shrink-0 rounded-xl" />
    <div className="min-w-0 flex-1 space-y-2"><SkeletonBar className="h-4 w-2/3" /><SkeletonBar className="h-3 w-1/3" /></div>
    <SkeletonBar className="h-6 w-16 shrink-0" />
  </div>)}</div>;
}

const TIPS = ["Warming up the AI…", "Fetching your stuff…", "Almost there…", "Fun fact: AI learns from examples, just like you!"];

// Brand mark with orbiting dots plus rotating friendly lines, shown above every skeleton.
export function OrbitLoader({ label }) {
  return <div aria-hidden="true" className="flex items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-3">
    <div className="bt-orbit shrink-0">
      <span className="bt-ring"><i /></span><span className="bt-ring"><i /></span><span className="bt-ring"><i /></span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/mark-trim.png" alt="" />
    </div>
    <div className="min-w-0 text-sm">
      <p className="font-semibold">Loading {label}</p>
      <p className="bt-tips text-muted">{TIPS.map((tip) => <span key={tip}>{tip}</span>)}</p>
    </div>
  </div>;
}
