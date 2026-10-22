// The build tabs' strip at the top of each build section (BuildTabs): one tab per section, its "?" right beside its label.
// On a narrow screen the tabs wrap to a second line rather than scroll the open one out of sight.
export const BUILD_TAB_STRIP =
  "build-tabs relative flex min-h-[50px] flex-wrap items-stretch gap-x-1 border-b border-line bg-raised px-2";
// A tab: its label and its "?", lit and underlined together. Its label is grabbed to drag it: while dragged it follows
// the pointer above the others and lets the pointer find the tab under it.
export const BUILD_TAB = "flex shrink-0 items-center rounded-t-sm px-2";
export const BUILD_TAB_DRAGGED = "pointer-events-none relative z-10 bg-surface shadow-lg shadow-shadow";
export const BUILD_TAB_TARGET = "bg-accent/10";
const BUILD_TAB_BUTTON =
  "cursor-grab touch-none self-stretch border-0 bg-transparent px-1 py-2.5 whitespace-nowrap transition-colors duration-200 focus-visible:outline-none max-[520px]:py-2 max-[520px]:text-sm max-[520px]:tracking-wide";
/** The label's look: accent while its tab is open, muted (text on hover or focus) otherwise. */
export const buildTabButton = (open: boolean) =>
  `${BUILD_TAB_BUTTON} ${open ? "text-accent" : "text-muted hover:text-text focus-visible:text-text"}`;
// The open tab's underline, one for the strip: BuildTabs places it under the open tab (label and "?") and slides it
// there from where the last strip had it, so switching tabs moves it across (its place and its width).
export const BUILD_TAB_UNDERLINE =
  "pointer-events-none absolute top-0 left-0 h-0.5 bg-accent opacity-0 transition-[transform,width] duration-250 ease-out motion-reduce:transition-none";
