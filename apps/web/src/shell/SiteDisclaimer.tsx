import { useWorkspace } from "../ui/use-workspace";

// The disclaimer, fixed to the bottom of the window beside the view rail (the whole width on the Workspace, which has
// none); <main> keeps room for it under its content. Pointer events pass through it (its link apart), so a drag or drop
// near the window's bottom reaches the page.
export function SiteDisclaimer() {
  const besideRail = useWorkspace().view !== "builds";
  return (
    <footer
      data-site-footer=""
      className={`pointer-events-none fixed right-0 bottom-0 z-10 border-t border-line bg-surface/95 px-6 py-2 text-center text-xs leading-normal wrap-anywhere text-muted ${besideRail ? "left-16" : "left-0"}`}
    >
      <p>
        Torchlight of Building is an unofficial fan-made planner. It is not affiliated with, endorsed by, or connected
        to XD Inc. or the Torchlight: Infinite developers. Torchlight: Infinite and its names, art and data are the
        property of their respective owners. Game data via TLIDB (
        <a
          className="pointer-events-auto hover:underline"
          href="https://tlidb.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          tlidb.com
        </a>
        ).
      </p>
    </footer>
  );
}
