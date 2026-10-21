// The open view, from the planner's "workspace" source (src/app/planner/workspace.js): which section shows, which tab is
// lit and how the page lays out are rendered from it.
import { useViewSource } from "./use-view-source";

export interface Workspace {
  view: string;
  focused: boolean;
}

const FIRST_TAB: Workspace = { view: "hero", focused: false };

/** The open view; before the planner has loaded, the build's first tab. */
export function useWorkspace(): Workspace {
  return useViewSource("workspace") ?? FIRST_TAB;
}

/** Whether `view` (a section's #<view>-view) is the open one. */
export function useViewOpen(view: string): boolean {
  return useWorkspace().view === view;
}
