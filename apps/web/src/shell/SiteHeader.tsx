import type { ReactNode } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { openDialog } from "../ui/dialog-registry";
import { StrokeIcon } from "../ui/StrokeIcon";

// The page header: the planner's name and the open build's actions, over a gold hairline. `site-header` is the find
// bar's anchor (src/app/planner/find-bar.js); the workspace views sit in the rail beside the page (ViewRail), which
// starts under the header, so the header keeps a fixed height: 66px, or 108px on phones, where the actions (icons only
// below lg) wrap under the name.

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
      className={`flex h-[38px] items-center justify-center gap-1.5 px-[11px] text-[0.68rem] font-[650] uppercase ${
        danger
          ? "cursor-pointer rounded-[3px] border border-[#c46b39] bg-[linear-gradient(180deg,#633025_0%,#43231f_50%,#251a1c_100%)] text-[#ffbd8b] shadow-[inset_0_1px_rgb(255_198_150/0.2),0_0_12px_rgb(197_78_37/0.14)] hover:border-[#e7a05d] hover:text-[#ffe0c4] focus-visible:border-[#e7a05d] focus-visible:outline-none"
          : "btn-bronze"
      }`}
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
  return (
    <header className="site-header sticky top-0 z-20 flex h-[66px] flex-wrap content-center items-center gap-x-3 gap-y-1.5 bg-[linear-gradient(180deg,rgb(20_24_31/0.98),rgb(10_14_20/0.96))] pr-[18px] pl-[22px] shadow-[0_8px_30px_rgb(0_0_0/0.42),inset_0_-1px_rgb(240_132_53/0.09)] max-sm:h-[108px] max-sm:px-3">
      <a
        className="flex shrink-0 items-baseline gap-3 no-underline max-sm:h-13 max-sm:items-center"
        href="./"
        aria-label="Torchlight of Building home"
      >
        <span className="text-gilded font-display text-xl font-black tracking-[0.06em] uppercase max-sm:text-lg">
          Torchlight of Building
        </span>
        <span className="text-[0.7rem] font-semibold tracking-[0.22em] text-[#c9b58d] uppercase max-md:hidden">
          SS14 · Tartarus
        </span>
      </a>
      <div className="header-actions ml-auto flex gap-1.5 max-sm:mr-auto max-sm:ml-0">
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
      </div>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 -bottom-px h-px bg-[linear-gradient(90deg,#f9ca65_0%,#e8ad4f_38%,#9a6d37_75%,#59452f_100%)]"
      />
    </header>
  );
}
