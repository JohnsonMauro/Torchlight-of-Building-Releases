import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { openDialog } from "../ui/dialog-registry";

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="./" aria-label="Torchlight of Building home">
        {" "}
        <img
          className="brand-image"
          src="./src/assets/torchlight-build-planner-logo.png"
          alt="Torchlight Infinite Build Planner"
        />{" "}
      </a>
      <div className="season-heading" aria-label="SS14 TartarUS">
        <span>SS14</span> <img src="./src/assets/tartarus-wordmark.png" alt="TartarUS" />
      </div>
      <nav className="view-nav" aria-label="Builder sections">
        <button className="view-tab active" type="button" data-view="talents" aria-label="Build" title="Build">
          <svg className="view-tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m13 3 8 8-3 3-8-8z" />
            <path d="m11 8-7 7a2 2 0 0 0 3 3l7-7" />
          </svg>
          <span>Build</span>
        </button>{" "}
        <button className="view-tab" type="button" data-view="character" aria-label="Stats" title="Stats">
          <svg className="view-tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 20h18M5 17v3m5-7v7m5-5v5m5-10v10" />
            <path d="m4 11 5-4 5 3 6-6m-4 0h4v4" />
          </svg>
          <span>Stats</span>
        </button>{" "}
        <button className="view-tab" type="button" data-view="configuration" aria-label="Config" title="Config">
          <svg className="view-tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M10 2h4l.6 2.3 1.8.8 2.1-1.2 2.8 2.8-1.2 2.1.8 1.8L23 11v4l-2.3.6-.8 1.8 1.2 2.1-2.8 2.8-2.1-1.2-1.8.8L14 24h-4l-.6-2.3-1.8-.8-2.1 1.2-2.8-2.8 1.2-2.1-.8-1.8L1 15v-4l2.3-.6.8-1.8-1.2-2.1 2.8-2.8 2.1 1.2 1.8-.8z"
              transform="translate(0 -1) scale(.92) translate(1 1)"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>Config</span>
        </button>{" "}
        <button className="view-tab" type="button" data-view="builds" aria-label="Notes" title="Notes">
          <svg className="view-tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 3h12v13M8 7h6M8 10h4M5 3v18h11" />
            <path d="m12 17 7-7 2 2-7 7-3 1z" />
          </svg>
          <span>Notes</span>
        </button>
      </nav>
      <div className="header-actions">
        <button className="button button-secondary command-button" type="button" data-view="builds">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="4" width="8" height="7" rx="1" />
            <rect x="13" y="4" width="8" height="7" rx="1" />
            <rect x="3" y="13" width="8" height="7" rx="1" />
            <rect x="13" y="13" width="8" height="7" rx="1" />
          </svg>
          Builds
        </button>{" "}
        <button
          id="import-game-log"
          className="button button-secondary command-button"
          type="button"
          title="Import a build from the game log"
          onClick={() => plannerCommands().openGameLogImport()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 3h8l4 4v6M14 3v4h4M6 3v18h6" />
            <path d="M18 15v6m-3-3 3 3 3-3" />
          </svg>
          Import from game
        </button>{" "}
        <button
          id="import-build"
          className="button button-secondary command-button"
          type="button"
          title="Import build"
          onClick={() => openDialog("import-build-dialog")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4" />
          </svg>
          Import
        </button>{" "}
        <button
          id="export-build"
          className="button button-secondary command-button"
          type="button"
          title="Copy build code to clipboard"
          onClick={() => plannerCommands().exportBuild()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 16V4m-4 4 4-4 4 4M4 17v4h16v-4" />
          </svg>
          Export
        </button>{" "}
        <button
          id="reset-build"
          className="button command-button"
          type="button"
          onClick={() => openDialog("reset-build-confirm")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 11a8 8 0 1 1 2.3 6M4 4v7h7" />
          </svg>
          Reset Build
        </button>
      </div>
    </header>
  );
}
