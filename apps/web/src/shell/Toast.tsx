import { useEffect, useState } from "react";
import { useViewSource } from "../ui/use-view-source";

// The toast: an accent strip at the bottom centre that shows each message of the planner's "toast" source
// (src/app/planner/page.js showToast) for a moment; it slides up and fades in, and never takes a click.
const TOAST =
  "pointer-events-none fixed bottom-5.5 left-1/2 z-50 max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-sm bg-accent-strong px-4 py-2.5 font-bold text-on-accent shadow-lg shadow-shadow transition duration-200";
const SHOWN_FOR_MS = 2200;

export function Toast() {
  const toast = useViewSource("toast");
  const count = toast?.count ?? 0;
  const [hiddenCount, setHiddenCount] = useState(0);
  useEffect(() => {
    if (!count) return;
    const timer = setTimeout(() => setHiddenCount(count), SHOWN_FOR_MS);
    return () => clearTimeout(timer);
  }, [count]);
  const shown = count > hiddenCount;
  return (
    <div
      id="toast"
      className={`${TOAST} ${shown ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"}`}
      role="status"
      aria-live="polite"
    >
      {toast?.message}
    </div>
  );
}
