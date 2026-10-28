import TopNav from "./TopNav";
import BottomNav from "./BottomNav";

export default function StudentFrame({ children }) {
  return (
    <div className="min-h-screen bg-background pb-28 md:pb-12">
      <TopNav />
      {children}
      <BottomNav />
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 px-4 pb-2 pt-6 sm:px-8 lg:px-12">
      <div>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
