import { CircleCheck } from "lucide-react";

// Result line under a Studio form: { ok, message? } or { ok: false, error }.
export default function FormStatus({ state }) {
  if (!state) return null;
  return state.ok
    ? <span role="status" className="inline-flex items-center gap-1 text-sm text-success"><CircleCheck className="h-4 w-4" /> {state.message ?? "Saved"}</span>
    : <span role="alert" className="text-sm text-danger">{state.error}</span>;
}
