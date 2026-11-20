import FactLoader from "@/components/FactLoader";

// Shared by every loading.js: a thin top progress bar plus one light, centred loader with rotating
// facts, study tips and nudges (no heavy skeleton grids to render while the page streams in).
export function LoadingState({ label = "page" }) {
  return (
    <div className="min-h-screen">
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/15">
        <div className="bt-bar h-full w-2/5 animate-[nav-progress_1s_ease-in-out_infinite]" />
      </div>
      <FactLoader label={label} />
    </div>
  );
}
