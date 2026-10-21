import { ActiveBuildTab } from "../features/builds/ActiveBuildTab";
import { HelpButton } from "../ui/HelpButton";
import { useWorkspace } from "../ui/use-workspace";

// The open build under the header, beside the view rail: its name in a flat block (ActiveBuildTab: right-click or the
// rename key renames it); whether it is saved sits in the header (SiteHeader). Beside the name, the build's tabs, one
// per part of the character as in the game: each is a "view-tab" with data-view (its section, #<view>-view), lit from
// the workspace source.
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
      <ActiveBuildTab />
      <HelpButton topic="builds" label="Builds" className="self-center" />
      <BuildTabs />
    </div>
  );
}
