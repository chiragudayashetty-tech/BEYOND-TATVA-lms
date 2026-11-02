import { LoadingState, SkeletonBar, SkeletonPanel } from "@/components/LoadingSkeleton";

export default function QuizLoading() {
  return <LoadingState label="quiz">
    <SkeletonBar className="mb-4 h-10 w-44" />
    <SkeletonPanel><SkeletonBar className="h-7 w-2/3" /><SkeletonBar className="mt-3 h-4 w-4/5" />
      <div className="mt-6 space-y-3"><SkeletonBar className="h-20 w-full" />{[0, 1, 2, 3].map((item) => <SkeletonBar key={item} className="h-12 w-full" />)}<SkeletonBar className="h-12 w-full" /></div>
    </SkeletonPanel>
  </LoadingState>;
}
