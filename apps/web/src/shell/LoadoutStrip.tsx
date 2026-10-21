import { HelpButton } from "../ui/HelpButton";
import { useWorkspace } from "../ui/use-workspace";

// The open build under the header, beside the view rail: its name in a flat block (right-click or the rename key
// renames it, src/app/builds/build-library-controller.js); whether it is saved sits in the header (SiteHeader).
// src/app/planner/page.js updateStorageStatus fills the tab's <span> and <strong>; renaming marks the tab "renaming"
// and puts a .loadout-tab-rename input in it. Beside the name, the build's tabs, one per part of the character as in
// the game: each is a "view-tab" with data-view (its section, #<view>-view), lit from the workspace source.
const buildTabs = [
  ["hero", "Hero Trait"],
  ["follower", "Follower"],
  ["skills", "Skills"],
  ["equipment", "Gear"],
  ["pacts", "Pacts"],
  ["talents", "Talent"],
] as const;

/** The build's tabs; the open one is lit (`active`), none while a focused view is open. */
function BuildTabs() {
  const open = useWorkspace();
  return (
    <nav className="ml-4 flex min-w-0 items-stretch overflow-x-auto max-sm:ml-1" aria-label="Build sections">
      {buildTabs.map(([view, label]) => (
        <button
          key={view}
          type="button"
          className={`view-tab tab shrink-0 px-4 text-xs font-bold tracking-wider uppercase ${open.view === view ? "active" : ""}`}
          data-view={view}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

export function LoadoutStrip() {
  return (
    <div
      className="relative z-10 ml-16 flex min-h-[54px] items-stretch border-b border-line bg-surface px-6 max-sm:px-3"
      aria-label="Active loadout"
    >
      <div
        className="loadout-tab group/tab min-w-[275px] cursor-context-menu self-center py-2 pr-3.5 focus-visible:outline-2 focus-visible:outline-accent max-sm:min-w-0 max-sm:flex-[0_1_275px] [&_.loadout-tab-rename]:block [&_.loadout-tab-rename]:w-full [&_.loadout-tab-rename]:max-w-[245px] [&_.loadout-tab-rename]:border-0 [&_.loadout-tab-rename]:border-b [&_.loadout-tab-rename]:border-line-strong [&_.loadout-tab-rename]:bg-transparent [&_.loadout-tab-rename]:p-0 [&_.loadout-tab-rename]:font-display [&_.loadout-tab-rename]:text-sm [&_.loadout-tab-rename]:font-bold [&_.loadout-tab-rename]:tracking-wider [&_.loadout-tab-rename]:text-accent [&_.loadout-tab-rename]:uppercase [&_.loadout-tab-rename]:caret-accent [&_.loadout-tab-rename]:outline-none [&_.loadout-tab-rename:focus]:border-accent"
        tabIndex={0}
        title="Right-click to rename"
      >
        <span className="block text-[10px] font-bold tracking-widest text-muted uppercase">Active build</span>
        <strong className="mt-0.5 block max-w-[245px] truncate font-display text-sm font-bold tracking-wider text-accent uppercase group-[.renaming]/tab:hidden">
          Loading build…
        </strong>
      </div>
      <HelpButton topic="builds" label="Builds" className="self-center" />
      <BuildTabs />
    </div>
  );
}
