import type { ReactNode } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { openDialog } from "../ui/dialog-registry";
import { StrokeIcon } from "../ui/StrokeIcon";
import { toggleTheme } from "../ui/theme";
import { useViewSource } from "../ui/use-view-source";

// The page header: the planner's name, whether the open build is saved (the planner's "buildStatus" source; phones
// drop Manage Loadouts, the Builds action opens the same view) and the open build's actions, over a bottom line.
// `site-header` is the find bar's anchor (src/app/planner/find-bar.js); the workspace views sit in the rail beside the
// page (ViewRail), which starts under the header, so the header keeps a fixed height: 66px, or 108px on phones, where
// the actions (icons only below lg) wrap under the name.

interface ActionProps {
  id?: string;
  label: string;
  title?: string;
  icon: ReactNode;
  danger?: boolean;
  onClick?: () => void;
  view?: string;
}

function Action({ id, label, title, icon, danger, onClick, view }: ActionProps) {
  return (
    <button
      id={id}
      className={`${danger ? "btn-danger" : "btn"} h-9 px-3 text-xs font-semibold uppercase`}
      type="button"
      title={title}
      data-view={view}
      onClick={onClick}
    >
      <StrokeIcon className="size-4">{icon}</StrokeIcon>
      <span className="max-lg:sr-only">{label}</span>
    </button>
  );
}

export function SiteHeader() {
  const status = useViewSource("buildStatus");
  const unsaved = status?.save === "unsaved";
  return (
    <header className="site-header sticky top-0 z-20 flex h-[66px] flex-wrap content-center items-center gap-x-3 gap-y-1.5 border-b border-line bg-surface px-6 max-sm:h-[108px] max-sm:px-3">
      <a
        className="flex shrink-0 items-baseline gap-3 no-underline max-sm:h-13 max-sm:items-center"
        href="./"
        aria-label="Torchlight of Building home"
      >
        <span className="font-display text-xl font-bold tracking-wider text-accent uppercase max-sm:text-lg">
          Torchlight of Building
        </span>
        <span className="text-xs font-semibold tracking-widest text-muted uppercase max-md:hidden">
          SS14 · Tartarus
        </span>
      </a>
      <div
        className={`loadout-status ml-auto flex items-center gap-2 px-3 text-xs max-md:px-2 ${unsaved ? "text-warn" : "text-muted"}`}
      >
        <i
          className={`size-1.5 shrink-0 rounded-full ${unsaved ? "bg-warn" : status?.save === "none" ? "bg-dim" : "bg-ok"}`}
        />
        <span className="max-md:hidden">{status?.text ?? "Autosaved locally"}</span>
        <button
          type="button"
          className="btn ml-3 h-7 px-2.5 text-xs whitespace-nowrap max-md:ml-1 max-sm:hidden"
          data-view="builds"
        >
          Manage Loadouts
        </button>
        <button
          type="button"
          className="btn ml-3 h-7 px-2.5 text-xs whitespace-nowrap max-md:ml-1 max-sm:px-1.5"
          data-report-bug=""
          title="Open a GitHub form to report a planner bug"
        >
          Report bug
        </button>
      </div>
      <div className="header-actions flex gap-1.5 max-sm:mr-auto">
        <Action
          label="Builds"
          view="builds"
          icon={
            <>
              <rect x="3" y="4" width="8" height="7" rx="1" />
              <rect x="13" y="4" width="8" height="7" rx="1" />
              <rect x="3" y="13" width="8" height="7" rx="1" />
              <rect x="13" y="13" width="8" height="7" rx="1" />
            </>
          }
        />
        <Action
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
        <Action
          id="import-build"
          label="Import"
          title="Import build"
          onClick={() => openDialog("import-build-dialog")}
          icon={<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4" />}
        />
        <Action
          id="export-build"
          label="Export"
          title="Copy build code to clipboard"
          onClick={() => plannerCommands().exportBuild()}
          icon={<path d="M12 16V4m-4 4 4-4 4 4M4 17v4h16v-4" />}
        />
        <Action
          id="reset-build"
          label="Reset Build"
          danger
          onClick={() => openDialog("reset-build-confirm")}
          icon={<path d="M4 11a8 8 0 1 1 2.3 6M4 4v7h7" />}
        />
        <Action
          id="theme-toggle"
          label="Theme"
          title="Switch between the light and dark theme"
          onClick={() => toggleTheme()}
          icon={<path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" />}
        />
      </div>
    </header>
  );
}
