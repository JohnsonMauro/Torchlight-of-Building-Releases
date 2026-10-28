// "Import from game" (the header's button): the game log the planner's local reader found (and its folder), or the file
// picker with the log folders to copy into the system's file dialog; the logins of the log, and the chosen one's summary; Import as new build. The planner opens it (looking the log up) and
// announces the "gameLogImport" source; reading a file, choosing a login and importing are planner commands, and
// closing it drops everything.
import { useEffect, useRef, useState } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { GameLogFolderView, GameLogSummaryView } from "@legacy/app/bridge/game-log-import-view.ts";
import {
  fieldControlClass,
  fieldHelpClass,
  fieldLabelClass,
  plainDialogActionsClass,
  plainDialogButtonClass,
  primaryDialogButtonClass,
  plainDialogClass,
  plainDialogTextClass,
  plainDialogTitleClass,
} from "../../ui/dialog-classes";
import { closeDialog, registerDialog } from "../../ui/dialog-registry";
import { StrokeIcon } from "../../ui/StrokeIcon";
import { useViewSource } from "../../ui/use-view-source";
import { ICON_BUTTON } from "./build-classes";

// A warning (a changed build, a part the log left out) and a step's heading.
const CHANGED = "block text-xs text-warn";
const STEP = `mt-4 mb-2 ${fieldLabelClass}`;
const CODE = "text-xs text-accent wrap-anywhere";
// The import's limits: a short warning list, each line what is missing and what to do.
const WARNINGS =
  "game-log-warnings mt-2.5 grid gap-1 rounded-sm border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn";
// A login to choose; the chosen one (.active) accent-edged.
const LOGIN =
  "grid w-full cursor-pointer gap-0.5 rounded-sm border border-line bg-sunken px-3 py-2 text-left text-xs text-text hover:border-line-strong focus-visible:outline-2 focus-visible:outline-accent on:border-accent on:bg-accent/10";

/** A log folder: what it is, its path, and a button that copies the path (a check for a moment once copied). */
function GameLogFolder({ folder }: { folder: GameLogFolderView }) {
  const [copied, setCopied] = useState(false);
  const path = useRef<HTMLElement>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(folder.path);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // No clipboard (an insecure page, a denied permission): select the path so Ctrl+C copies it.
      if (path.current) getSelection()?.selectAllChildren(path.current);
    }
  };
  return (
    <li className="game-log-folder flex items-center gap-1.5">
      <span className="grid min-w-0 flex-1 gap-0.5">
        {folder.label ? <small className="text-xs text-muted">{folder.label}</small> : null}
        <code ref={path} className={CODE}>
          {folder.path}
        </code>
      </span>
      <button
        type="button"
        className={ICON_BUTTON}
        aria-label={copied ? "Folder path copied" : "Copy folder path"}
        title={copied ? "Copied" : "Copy folder path"}
        onClick={copy}
      >
        <StrokeIcon className="size-3.5">
          {copied ? (
            <path d="m5 12 5 5 9-10" />
          ) : (
            <>
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V6a2 2 0 0 1 2-2h9" />
            </>
          )}
        </StrokeIcon>
      </button>
    </li>
  );
}

function Summary({ summary }: { summary: GameLogSummaryView }) {
  return (
    <>
      <p className={STEP}>{`Snapshot from ${summary.stamp}`}</p>
      {summary.warnings.length ? (
        <ul className={WARNINGS} role="note">
          {summary.warnings.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export function ImportGameLogDialog() {
  const view = useViewSource("gameLogImport");
  const fileInput = useRef<HTMLInputElement>(null);
  // "Choose a different file…" moves the focus to the file picker once it shows.
  const focusPicker = useRef(false);
  const picker = Boolean(view?.picker);
  useEffect(() => {
    if (!picker || !focusPicker.current) return;
    focusPicker.current = false;
    fileInput.current?.focus();
  }, [picker]);
  const status = view?.status ?? null;
  return (
    <dialog
      id="import-game-log-dialog"
      ref={registerDialog}
      className={`${plainDialogClass} w-125`}
      aria-labelledby="import-game-log-title"
      onClose={() => plannerCommands().closeGameLogImport()}
    >
      <h2 id="import-game-log-title" className={plainDialogTitleClass}>
        Import from game
      </h2>
      <p id="import-game-log-found" className={`game-log-found ${plainDialogTextClass}`} hidden={!view?.found}>
        {view?.found ? (
          <>
            {"Found "}
            <strong className="text-accent">{view.found.name}</strong>
            {` (updated ${view.found.updated})`}
          </>
        ) : null}
      </p>
      {view?.found?.folder ? (
        <ul className="game-log-found-folder mt-1.5 grid">
          <GameLogFolder folder={{ label: "", path: view.found.folder }} />
        </ul>
      ) : null}
      <p id="import-game-log-auto-privacy" className={`mt-2 ${fieldHelpClass}`} hidden={!view?.found}>
        Read from the game's log folder on this computer by the planner. Only build data is kept; nothing is uploaded or
        stored.
      </p>
      <p className="mt-1.5" hidden={!view?.chooseOther}>
        <button
          type="button"
          className="cursor-pointer text-xs text-accent underline hover:text-accent-strong"
          onClick={() => {
            focusPicker.current = true;
            plannerCommands().showGameLogPicker();
          }}
        >
          Choose a different file…
        </button>
      </p>
      <p className={plainDialogTextClass} hidden={!picker}>
        {"Pick "}
        <code className={CODE}>UE_game.log</code>
        {" from the game's log folder. The game writes your build to it each time you log in to a character."}
      </p>
      <div hidden={!picker || !view?.folders.length}>
        <p className={STEP}>Log folders</p>
        <ul className="game-log-folders grid gap-2">
          {view?.folders.map((folder) => (
            <GameLogFolder key={folder.path} folder={folder} />
          ))}
        </ul>
      </div>
      <label className={`mt-4 grid gap-2 ${fieldLabelClass}`} hidden={!picker}>
        Game log
        <input
          // A new opening starts with no file chosen.
          key={view?.session ?? 0}
          id="import-game-log-file"
          ref={fileInput}
          type="file"
          accept=".log"
          className={`${fieldControlClass} font-normal file:mr-2.5 file:btn file:px-2.5 file:py-1 file:text-xs`}
          onChange={(event) => plannerCommands().chooseGameLogFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <p className={`mt-2 ${fieldHelpClass}`} hidden={!picker}>
        The log is read in this browser only. It is not uploaded or stored.
      </p>
      <p id="import-game-log-reason" className={`game-log-reason mt-2 ${fieldHelpClass}`} hidden={!view?.reason}>
        {view?.reason}
      </p>
      <p id="import-game-log-status" className={`text-warn ${status ? "mt-3" : ""}`} role="status" aria-live="polite">
        {!status ? null : "text" in status ? (
          status.text
        ) : (
          <>
            <span>{status.message}</span>
            {status.details ? (
              <small className="game-log-details mt-1 block text-xs text-muted">{status.details}</small>
            ) : null}
          </>
        )}
      </p>
      <div id="import-game-log-snapshots">
        {view?.logins.length ? (
          <>
            <p className={STEP}>Characters found in this log</p>
            <p className={`mb-2 ${fieldHelpClass}`}>
              The game saves your build when you enter a character, not when you change maps. Changed something? Go back
              to character select and enter again first.
            </p>
            <ul className="game-log-snapshots grid gap-1.5">
              {view.logins.map((login) => {
                const selected = login.id === view.selectedId;
                return (
                  <li key={login.id}>
                    <button
                      type="button"
                      className={`${selected ? "active" : ""} ${LOGIN}`}
                      aria-pressed={selected}
                      onClick={() => plannerCommands().selectGameLogSnapshot(login.id)}
                    >
                      <strong className="text-sm text-accent">{login.title}</strong>
                      <span className="text-muted">{login.when}</span>
                      {login.changed ? <small className={CHANGED}>{login.changed}</small> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </div>
      <div id="import-game-log-summary">{view?.summary ? <Summary summary={view.summary} /> : null}</div>
      <div className={plainDialogActionsClass}>
        <button type="button" className={plainDialogButtonClass} onClick={() => closeDialog("import-game-log-dialog")}>
          Cancel
        </button>
        <button
          type="button"
          data-import-game-log-build=""
          className={primaryDialogButtonClass}
          disabled={!view?.summary}
          onClick={() => plannerCommands().importGameLogBuild()}
        >
          Import as new build
        </button>
      </div>
    </dialog>
  );
}
