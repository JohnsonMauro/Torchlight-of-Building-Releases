export function ImportGameLogDialog() {
  return (
    <dialog
      id="import-game-log-dialog"
      className="reset-build-confirm import-build-dialog import-game-log-dialog"
      aria-labelledby="import-game-log-title"
    >
      <h2 id="import-game-log-title">Import from game</h2>
      <p id="import-game-log-found" className="game-log-found" hidden />
      <p id="import-game-log-auto-privacy" className="game-log-privacy" hidden>
        Read from the game's log folder on this computer by the planner. Only build data is kept; nothing is uploaded or
        stored.
      </p>
      <p className="game-log-choose" hidden>
        <button type="button" className="game-log-link" data-game-log-choose-file="">
          Choose a different file…
        </button>
      </p>
      <p className="game-log-picker" hidden>
        {"Pick "}
        <code>UE_game.log</code>
        {" from "}
        <code>{"<Torchlight Infinite>\\UE_game\\TorchLight\\Saved\\Logs"}</code>
        {" (with Steam, by default "}
        <code>C:\Program Files (x86)\Steam\steamapps\common\Torchlight Infinite\UE_game\TorchLight\Saved\Logs</code>).
        The game writes your build to it each time you log in to a character.
      </p>
      <label className="game-log-picker" hidden>
        Game log
        <input id="import-game-log-file" type="file" accept=".log" />
      </label>
      <p className="game-log-picker game-log-privacy" hidden>
        The log is read in this browser only. It is not uploaded or stored.
      </p>
      <p id="import-game-log-reason" className="game-log-reason" hidden />
      <p id="import-game-log-status" className="game-log-status" role="status" aria-live="polite" />
      <div id="import-game-log-snapshots" />
      <div id="import-game-log-summary" />
      <div>
        <button type="button" data-cancel-import-game-log="">
          Cancel
        </button>
        <button type="button" data-import-game-log-build="" disabled>
          Import as new build
        </button>
      </div>
    </dialog>
  );
}
