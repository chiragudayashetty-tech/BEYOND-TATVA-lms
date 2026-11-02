import { LoadingState, SkeletonBar } from "@/components/LoadingSkeleton";

// Shown the instant a link is tapped, for every page without its own loading.js. With it, Next.js
// prefetches each page up to this point, so taps feel immediate even before the server answers.
export default function Loading() {
  return (
    <LoadingState label="page" className="space-y-4">
      <SkeletonBar className="h-8 w-2/3 max-w-sm" />
      <SkeletonBar className="h-4 w-5/6 max-w-md" />
      <div className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <SkeletonBar key={i} className="h-32 rounded-2xl" />)}
      </div>
      <SkeletonBar className="h-48 rounded-2xl" />
    </LoadingState>
  );
}
