import { LoadingState, SkeletonBar, SkeletonPanel } from "@/components/LoadingSkeleton";

export default function ProfileLoading() {
  return <LoadingState label="profile">
    <SkeletonBar className="mb-6 h-8 w-32" />
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <SkeletonPanel><div className="flex flex-col items-center py-4"><SkeletonBar className="h-20 w-20 rounded-full" /><SkeletonBar className="mt-4 h-6 w-40" /><SkeletonBar className="mt-2 h-4 w-48 max-w-full" /><SkeletonBar className="mt-4 h-20 w-full" /></div></SkeletonPanel>
      <div className="space-y-6"><SkeletonPanel title="Preferences"><SkeletonBar className="my-3 h-12 w-full" /><SkeletonBar className="h-12 w-full" /></SkeletonPanel><SkeletonPanel title="Account">{[0, 1, 2, 3].map((item) => <SkeletonBar key={item} className="my-2 h-12 w-full" />)}</SkeletonPanel></div>
    </div>
  </LoadingState>;
}
