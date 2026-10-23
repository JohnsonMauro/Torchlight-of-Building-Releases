import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { ActiveBuildTab } from "../features/builds/ActiveBuildTab";
import { openDialog } from "../ui/dialog-registry";
import { useViewSource } from "../ui/use-view-source";
import { useWorkspace } from "../ui/use-workspace";
import { ShellAction } from "./ShellAction";

// The open build under the header, beside the view rail: its name in a flat block (ActiveBuildTab: the pencil
// beside it renames it), and on the right the season it was made in when that is an earlier one, whether it is saved (the
// planner's "buildStatus" source;
// phones keep only the dot) and its actions (Export, Reset Build). The Workspace shows no strip: importing a build is
// its own (BuildsPage). The build's tabs open each build section (BuildTabs), not this strip.

function SaveStatus() {
  const status = useViewSource("buildStatus");
  const unsaved = status?.save === "unsaved";
  return (
    <div className={`loadout-status flex items-center gap-2 text-xs ${unsaved ? "text-warn" : "text-muted"}`}>
      <i className={`size-1.5 shrink-0 rounded-full ${unsaved ? "bg-warn" : "bg-ok"}`} />
      <span className="max-md:hidden">{status?.text ?? "Autosaved locally"}</span>
    </div>
  );
}

// A build made in an earlier season: that season, and until dismissed what carrying it into the current one removed (the
// list opens under the summary).
function SeasonStatus() {
  const season = useViewSource("buildStatus")?.season;
  if (!season) return null;
  return (
    <div className="build-season flex flex-wrap items-center gap-2 text-xs text-warn">
      <span className="rounded-sm border border-warn/40 bg-warn/15 px-2 py-0.5 font-bold" title={season.detail}>
        {season.text}
      </span>
      {season.change ? (
        <div className="flex min-w-0 items-start gap-2">
          <details className="min-w-0">
            <summary className="cursor-pointer">{season.change.summary}</summary>
            {season.change.removed.length ? (
              <ul className="mt-1 list-disc pl-5 text-muted">
                {season.change.removed.map((part, index) => (
                  <li key={index}>{part}</li>
                ))}
              </ul>
            ) : null}
          </details>
          <button
            type="button"
            className="cursor-pointer text-lg/none text-muted hover:text-text"
            aria-label="Dismiss the season change"
            onClick={() => plannerCommands().dismissSeasonChange()}
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}

function BuildActions() {
  return (
    <div className="build-actions flex gap-1.5">
      <ShellAction
        id="export-build"
        label="Export"
        title="Copy build code to clipboard"
        onClick={() => plannerCommands().exportBuild()}
        icon={<path d="M12 16V4m-4 4 4-4 4 4M4 17v4h16v-4" />}
      />
      <ShellAction
        id="reset-build"
        label="Reset Build"
        danger
        onClick={() => openDialog("reset-build-confirm")}
        icon={<path d="M4 11a8 8 0 1 1 2.3 6M4 4v7h7" />}
      />
    </div>
  );
}

export function LoadoutStrip() {
  if (useWorkspace().view === "builds") return null;
  return (
    <div
      className="relative z-10 ml-16 flex min-h-[54px] flex-wrap items-stretch gap-x-3 border-b border-line bg-surface px-6 max-sm:px-3"
      aria-label="Active loadout"
    >
      <ActiveBuildTab />
      <div className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5 py-2">
        <SeasonStatus />
        <SaveStatus />
        <BuildActions />
      </div>
    </div>
  );
}
