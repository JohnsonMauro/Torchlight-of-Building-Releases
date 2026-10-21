import type { ReactNode } from "react";
import { CharacterColumn } from "../features/hero/HeroPanel";
import { useWorkspace } from "../ui/use-workspace";

const GUTTER = "ml-16 px-6 pt-6 pb-20 max-[760px]:px-3 max-[760px]:pt-4 max-[760px]:pb-28";
const BUILD_GRID =
  "grid grid-cols-[minmax(240px,300px)_minmax(0,1fr)] items-start gap-6 max-[900px]:grid-cols-1 max-[900px]:gap-4";

/**
 * The page's content: on a build tab, the character column and the open tab's section beside it; a focused view
 * (builds, stats, configuration) shows its page alone. `children` are the sections, rendered once by AppShell, so a
 * switch re-renders this frame only (each section hides itself, useViewOpen).
 */
export function PageMain({ children }: { children: ReactNode }) {
  const { focused } = useWorkspace();
  return (
    <main className={focused ? GUTTER : `${GUTTER} ${BUILD_GRID}`}>
      <CharacterColumn className={`col-start-1 row-start-1 self-start ${focused ? "hidden" : ""}`} />
      {children}
    </main>
  );
}
