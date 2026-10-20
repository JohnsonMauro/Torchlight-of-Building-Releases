// "Import from game" (the header's button): the game log the planner's local reader found, or the file picker; the
// logins of the log, and the chosen one's summary; Import as new build. The planner opens it (looking the log up) and
// announces the "gameLogImport" source; reading a file, choosing a login and importing are planner commands, and
// closing it drops everything. The CSS styles the Import button by data-import-game-log-build, so it stays.
import { useEffect, useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { GameLogFromView, GameLogSummaryView } from "@legacy/app/bridge/game-log-import-view.ts";
import { useViewSource } from "../../ui/use-view-source";

function FromCell({ from }: { from: GameLogFromView }) {
  if (!from) return <td />;
  return (
    <td>
      {from.text}
      {from.stale ? (
        <small className="game-log-changed" title={from.stale}>
          from an older login; may be outdated
        </small>
      ) : null}
    </td>
  );
}

function Summary({ summary, selectedId }: { summary: GameLogSummaryView; selectedId: string | null }) {
  return (
    <>
      {summary.gaps ? (
        <p className="game-log-changed">{`Some sections weren't in the game log: ${summary.gaps}. Log out and back in, then import again.`}</p>
      ) : null}
      <p className="game-log-step">{`Snapshot from ${summary.stamp}`}</p>
      <table className="game-log-counts">
        <thead>
          <tr>
            <th scope="col">Section</th>
            <th scope="col">Imported</th>
            <th scope="col">Not imported</th>
            {summary.fromColumn ? <th scope="col">From</th> : null}
          </tr>
        </thead>
        <tbody>
          {summary.sections.map((section) => (
            <tr key={section.label}>
              <th scope="row">{section.label}</th>
              <td>{section.imported}</td>
              <td>{section.skipped}</td>
              {summary.fromColumn ? <FromCell from={section.from} /> : null}
            </tr>
          ))}
        </tbody>
      </table>
      {summary.changed ? (
        <p className="game-log-changed">
          The build changed after this login. The game writes the build only at login, so log in again to import the
          current build.
        </p>
      ) : null}
      {summary.skipped.length ? (
        // Closed again for every login, as the planner's markup was.
        <details key={selectedId ?? ""} className="game-log-skipped">
          <summary>{`Not imported (${summary.skipped.length})`}</summary>
          <ul>
            {summary.skipped.map((entry, index) => (
              <li key={index}>
                <b>{entry.section}</b>
                {` ${entry.item}`}
                {entry.reason ? <small>{entry.reason}</small> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {summary.notices.map((text, index) => (
        <p key={index} className="game-log-provisional">
          {text}
        </p>
      ))}
      {summary.provisional ? <p className="game-log-provisional">{`Provisional: ${summary.provisional}`}</p> : null}
    </>
  );
}

export function ImportGameLogDialog() {
  const view = useViewSource("gameLogImport");
  const dialog = useRef<HTMLDialogElement>(null);
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
      ref={dialog}
      className="reset-build-confirm import-build-dialog import-game-log-dialog"
      aria-labelledby="import-game-log-title"
      onClose={() => plannerCommands().closeGameLogImport()}
    >
      <h2 id="import-game-log-title">Import from game</h2>
      <p id="import-game-log-found" className="game-log-found" hidden={!view?.found}>
        {view?.found ? (
          <>
            {"Found "}
            <strong>{view.found.name}</strong>
            {` (updated ${view.found.updated})`}
          </>
        ) : null}
      </p>
      <p id="import-game-log-auto-privacy" className="game-log-privacy" hidden={!view?.found}>
        Read from the game's log folder on this computer by the planner. Only build data is kept; nothing is uploaded or
        stored.
      </p>
      <p className="game-log-choose" hidden={!view?.chooseOther}>
        <button
          type="button"
          className="game-log-link"
          onClick={() => {
            focusPicker.current = true;
            plannerCommands().showGameLogPicker();
          }}
        >
          Choose a different file…
        </button>
      </p>
      <p className="game-log-picker" hidden={!picker}>
        {"Pick "}
        <code>UE_game.log</code>
        {" from "}
        <code>{"<Torchlight Infinite>\\UE_game\\TorchLight\\Saved\\Logs"}</code>
        {" (with Steam, by default "}
        <code>C:\Program Files (x86)\Steam\steamapps\common\Torchlight Infinite\UE_game\TorchLight\Saved\Logs</code>).
        The game writes your build to it each time you log in to a character.
      </p>
      <label className="game-log-picker" hidden={!picker}>
        Game log
        <input
          // A new opening starts with no file chosen.
          key={view?.session ?? 0}
          id="import-game-log-file"
          ref={fileInput}
          type="file"
          accept=".log"
          onChange={(event) => plannerCommands().chooseGameLogFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <p className="game-log-picker game-log-privacy" hidden={!picker}>
        The log is read in this browser only. It is not uploaded or stored.
      </p>
      <p id="import-game-log-reason" className="game-log-reason" hidden={!view?.reason}>
        {view?.reason}
      </p>
      <p id="import-game-log-status" className="game-log-status" role="status" aria-live="polite">
        {!status ? null : "text" in status ? (
          status.text
        ) : (
          <>
            <span>{status.message}</span>
            {status.details ? <small className="game-log-details">{status.details}</small> : null}
          </>
        )}
      </p>
      <div id="import-game-log-snapshots">
        {view?.logins.length ? (
          <>
            <p className="game-log-step">Characters found in this log</p>
            <ul className="game-log-snapshots">
              {view.logins.map((login) => {
                const selected = login.id === view.selectedId;
                return (
                  <li key={login.id}>
                    <button
                      type="button"
                      className={selected ? "active" : ""}
                      aria-pressed={selected}
                      onClick={() => plannerCommands().selectGameLogSnapshot(login.id)}
                    >
                      <strong>{login.title}</strong>
                      <span>{login.when}</span>
                      {login.changed ? <small className="game-log-changed">{login.changed}</small> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </div>
      <div id="import-game-log-summary">
        {view?.summary ? <Summary summary={view.summary} selectedId={view.selectedId} /> : null}
      </div>
      <div>
        <button type="button" onClick={() => dialog.current?.close()}>
          Cancel
        </button>
        <button
          type="button"
          data-import-game-log-build=""
          disabled={!view?.summary}
          onClick={() => plannerCommands().importGameLogBuild()}
        >
          Import as new build
        </button>
      </div>
    </dialog>
  );
}
