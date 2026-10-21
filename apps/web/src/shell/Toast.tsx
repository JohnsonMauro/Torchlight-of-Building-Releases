// The toast: an accent strip at the bottom centre that src/app/planner/page.js's showToast fills and shows (.visible)
// for a moment; it slides up and fades in, and never takes a click.
const TOAST =
  "pointer-events-none fixed bottom-5.5 left-1/2 z-50 max-w-[calc(100vw-32px)] -translate-x-1/2 translate-y-5 rounded-sm bg-accent-strong px-4 py-2.5 font-bold text-on-accent opacity-0 shadow-lg shadow-shadow transition duration-200 [&.visible]:translate-y-0 [&.visible]:opacity-100";

export function Toast() {
  return <div id="toast" className={TOAST} role="status" aria-live="polite" />;
}
