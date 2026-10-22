import type { ReactNode } from "react";
import { CharacterColumn } from "../features/hero/HeroPanel";
import { useWorkspace } from "../ui/use-workspace";
import { PageNotices } from "./PageNotices";

const GUTTER = "px-6 pt-6 pb-20 max-[760px]:px-3 max-[760px]:pt-4 max-[760px]:pb-28";
/** Room for the view rail, which the Workspace does not show. */
const RAIL_ROOM = "ml-16";
const BUILD_GRID =
  "grid grid-cols-[minmax(240px,300px)_minmax(0,1fr)] items-start gap-6 max-[900px]:grid-cols-1 max-[900px]:gap-4";

/**
 * The page's content, beside the view rail (none on the Workspace): the page's notices over it; then, on a build tab, the character column and the open tab's
 * section beside it; a focused view (builds, stats, configuration) shows its page alone. `children` are the sections,
 * rendered once by AppShell, so a switch re-renders this frame only (each section hides itself, useViewOpen).
 */
export function PageMain({ children }: { children: ReactNode }) {
  const { view, focused } = useWorkspace();
  return (
    <main className={`${GUTTER} ${view === "builds" ? "" : RAIL_ROOM}`}>
      <PageNotices />
      <div className={focused ? undefined : BUILD_GRID}>
        <CharacterColumn className={`col-start-1 row-start-1 self-start ${focused ? "hidden" : ""}`} />
        {children}
      </div>
    </main>
  );
}
