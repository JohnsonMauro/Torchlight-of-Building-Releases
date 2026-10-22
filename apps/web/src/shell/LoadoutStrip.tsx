import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { ActiveBuildTab } from "../features/builds/ActiveBuildTab";
import { openDialog } from "../ui/dialog-registry";
import { useViewSource } from "../ui/use-view-source";
import { ShellAction } from "./ShellAction";

// The open build under the header, beside the view rail: its name in a flat block (ActiveBuildTab: the pencil
// beside it renames it), and on the right whether it is saved (the planner's "buildStatus" source;
// phones keep only the dot) and its actions. The build's
// tabs open each build section (BuildTabs), not this strip.

function SaveStatus() {
  const status = useViewSource("buildStatus");
  const unsaved = status?.save === "unsaved";
  return (
    <div className={`loadout-status flex items-center gap-2 text-xs ${unsaved ? "text-warn" : "text-muted"}`}>
      <i
        className={`size-1.5 shrink-0 rounded-full ${unsaved ? "bg-warn" : status?.save === "none" ? "bg-dim" : "bg-ok"}`}
      />
      <span className="max-md:hidden">{status?.text ?? "Autosaved locally"}</span>
    </div>
  );
}

function BuildActions() {
  return (
    <div className="build-actions flex gap-1.5">
      <ShellAction
        id="import-game-log"
        label="Import from game"
        title="Import a build from the game log"
        onClick={() => plannerCommands().openGameLogImport()}
        icon={
          <>
            <path d="M6 3h8l4 4v6M14 3v4h4M6 3v18h6" />
            <path d="M18 15v6m-3-3 3 3 3-3" />
          </>
        }
      />
      <ShellAction
        id="import-build"
        label="Import"
        title="Import build"
        onClick={() => openDialog("import-build-dialog")}
        icon={<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4" />}
      />
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
  return (
    <div
      className="relative z-10 ml-16 flex min-h-[54px] flex-wrap items-stretch gap-x-3 border-b border-line bg-surface px-6 max-sm:px-3"
      aria-label="Active loadout"
    >
      <ActiveBuildTab />
      <div className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5 py-2">
        <SaveStatus />
        <BuildActions />
      </div>
    </div>
  );
}
