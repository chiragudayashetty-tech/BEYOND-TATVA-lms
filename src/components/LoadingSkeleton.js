import { Card } from "@/components/ui";

export function LoadingState({ label, children, className = "space-y-6" }) {
  return <div role="status" aria-label={`Loading ${label}`} className={className}>
    <span className="sr-only">Loading {label}…</span>
    {children}
  </div>;
}

export function SkeletonBar({ className = "" }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />;
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
