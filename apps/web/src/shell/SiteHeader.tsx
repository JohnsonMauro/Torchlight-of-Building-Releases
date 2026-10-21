import type { ReactNode } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { openDialog } from "../ui/dialog-registry";

// The page header: the brand, the workspace views and the open build's actions. The view tabs keep the "view-tab"
// class and data-view (src/app/planner/workspace.js marks the active one); `site-header` is the find bar's anchor
// (src/app/find-bar.js). Narrow screens wrap the actions onto their own row and show their icons only.

interface ViewTabProps {
  view: string;
  label: string;
  icon: ReactNode;
}

const viewTabs: ViewTabProps[] = [
  {
    view: "talents",
    label: "Build",
    icon: (
      <>
        <path d="m13 3 8 8-3 3-8-8z" />
        <path d="m11 8-7 7a2 2 0 0 0 3 3l7-7" />
      </>
    ),
  },
  {
    view: "character",
    label: "Stats",
    icon: (
      <>
        <path d="M3 20h18M5 17v3m5-7v7m5-5v5m5-10v10" />
        <path d="m4 11 5-4 5 3 6-6m-4 0h4v4" />
      </>
    ),
  },
  {
    view: "configuration",
    label: "Config",
    icon: (
      <>
        <path
          d="M10 2h4l.6 2.3 1.8.8 2.1-1.2 2.8 2.8-1.2 2.1.8 1.8L23 11v4l-2.3.6-.8 1.8 1.2 2.1-2.8 2.8-2.1-1.2-1.8.8L14 24h-4l-.6-2.3-1.8-.8-2.1 1.2-2.8-2.8 1.2-2.1-.8-1.8L1 15v-4l2.3-.6.8-1.8-1.2-2.1 2.8-2.8 2.1 1.2 1.8-.8z"
          transform="translate(0 -1) scale(.92) translate(1 1)"
        />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
  {
    view: "builds",
    label: "Notes",
    icon: (
      <>
        <path d="M5 3h12v13M8 7h6M8 10h4M5 3v18h11" />
        <path d="m12 17 7-7 2 2-7 7-3 1z" />
      </>
    ),
  },
];

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="size-4 shrink-0 fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ViewTab({ view, label, icon }: ViewTabProps) {
  return (
    <button
      className={`view-tab group relative flex h-9 cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-3 text-sm font-semibold text-muted transition-colors hover:bg-raised hover:text-text focus-visible:outline-2 focus-visible:outline-frost [&.active]:bg-raised [&.active]:text-ember ${view === "talents" ? "active" : ""}`}
      type="button"
      data-view={view}
      title={label}
    >
      <Icon>{icon}</Icon>
      <span>{label}</span>
      <span
        aria-hidden="true"
        className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-ember opacity-0 group-[.active]:opacity-100"
      />
    </button>
  );
}

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
      className={`flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-frost ${
        danger
          ? "border-ember/50 text-ember hover:bg-ember/15"
          : "border-line bg-surface text-text hover:border-muted hover:bg-raised"
      }`}
      type="button"
      title={title}
      data-view={view}
      onClick={onClick}
    >
      <Icon>{icon}</Icon>
      <span className="max-sm:sr-only">{label}</span>
    </button>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-20 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-ink/95 px-4 py-2.5 shadow-[0_8px_30px_rgb(0_0_0/0.4)] backdrop-blur md:px-6">
      <a className="flex items-baseline gap-3 no-underline" href="./" aria-label="Torchlight of Building home">
        <span className="font-display text-xl font-semibold tracking-wide text-text">
          Torchlight <span className="text-ember">of</span> Building
        </span>
        <span className="text-[0.7rem] font-semibold tracking-[0.22em] text-muted uppercase">SS14 · Tartarus</span>
      </a>
      <nav className="flex gap-1 max-lg:order-last max-lg:w-full max-lg:overflow-x-auto" aria-label="Builder sections">
        {viewTabs.map((tab) => (
          <ViewTab key={tab.view} {...tab} />
        ))}
      </nav>
      <div className="header-actions ml-auto flex flex-wrap gap-1.5">
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
    </header>
  );
}
