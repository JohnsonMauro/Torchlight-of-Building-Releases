// Import from game: the local reader's snapshots or a picked UE_game.log, and the build it becomes.
import { heroById } from "#engine";
import {
  importReportText,
  importSnapshot,
  listSnapshots,
  loadGameIdMap,
  readGameLogFile,
} from "../../game-log/game-log-import.js";
import { displayTexts } from "../bridge/display-text.ts";
import {
  gameLogAutoSnapshots,
  gameLogBuildName,
  gameLogFileStatus,
  gameLogFolders,
  gameLogFound,
  gameLogListFailedStatus,
  gameLogLogins,
  gameLogSummary,
} from "../bridge/game-log-import-view.ts";
import { closeDialog, openDialog } from "../bridge/dialogs.ts";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { showToast } from "../planner/page.js";
import { applyPlannerState, persistPlannerState, renderCandidateViews } from "../planner/session.js";
import { activateWorkspaceView } from "../planner/workspace.js";
import { createBuild, loadPlannerState } from "../storage/build-library.ts";

export const gameLogImportCommands = {
  // Import from game (apps/web/src/features/builds/ImportGameLogDialog.tsx).
  openGameLogImport,
  chooseGameLogFile,
  showGameLogPicker: () => setGameLogView({ chooseOther: false, picker: true }),
  selectGameLogSnapshot,
  importGameLogBuild,
  closeGameLogImport: resetGameLogImport,
};
export const gameLogImportViewSources = {
  // The Import from game dialog.
  gameLogImport: gameLogImportSource,
};
// Import from game (apps/web/src/features/builds/ImportGameLogDialog.tsx shows the "gameLogImport" source). On open the
// planner asks its local reader for UE_game.log (the pnpm dev server /api/game-log/snapshots, or the desktop bridge);
// both return only sanitised build dumps (src/game-log/game-log-local.js). Without it, or when the user asks, the picked
// log is read in the page. Everything is dropped with the dialog, and an import always adds a new library entry.
let gameLogSources = new Map(),
  gameLogRows = [],
  gameLogImport = null,
  gameLogReadToken = 0,
  gameLogSession = 0;
const CLOSED_GAME_LOG_VIEW = {
  found: null,
  chooseOther: false,
  picker: false,
  folders: [],
  reason: "",
  status: null,
  selectedId: null,
};
let gameLogView = CLOSED_GAME_LOG_VIEW;
const gameLogLocalServer = () =>
  /^https?:$/.test(location.protocol) && ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
const autoGameLogUnavailable = () =>
  gameLogLocalServer() || typeof window.tliDesktop?.gameLogSnapshots === "function"
    ? "Automatic lookup needs the planner's local dev server (pnpm dev) or the desktop app."
    : "Choose your UE_game.log.";
function gameLogImportSource() {
  return {
    session: gameLogSession,
    ...displayTexts({
      ...gameLogView,
      logins: gameLogLogins(gameLogRows),
      summary: gameLogImport ? gameLogSummary(gameLogImport.report) : null,
    }),
  };
}
function setGameLogView(changes) {
  gameLogView = { ...gameLogView, ...changes };
  viewSourceChanged("gameLogImport");
}
function clearGameLogResults() {
  gameLogSources = new Map();
  gameLogRows = [];
  gameLogImport = null;
  gameLogView = { ...gameLogView, selectedId: null };
}
function resetGameLogImport() {
  gameLogReadToken += 1;
  clearGameLogResults();
  gameLogView = CLOSED_GAME_LOG_VIEW;
  viewSourceChanged("gameLogImport");
}
async function requestGameLogSnapshots() {
  if (typeof window.tliDesktop?.gameLogSnapshots === "function") return window.tliDesktop.gameLogSnapshots();
  // Only the local dev server (pnpm dev) has the reader; a static host (GitHub Pages) goes straight to the picker.
  if (!gameLogLocalServer()) return null;
  const response = await fetch("api/game-log/snapshots", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok || !/json/.test(response.headers.get("content-type") || "")) return null;
  return response.json();
}
async function findGameLog() {
  const token = gameLogReadToken;
  setGameLogView({ status: { text: "Looking for UE_game.log…" } });
  let result;
  try {
    result = await requestGameLogSnapshots();
  } catch {
    result = null;
  }
  if (token !== gameLogReadToken) return;
  const auto = result?.found && Array.isArray(result.files) ? gameLogAutoSnapshots(result.files) : null;
  const folders = gameLogFolders(Array.isArray(result?.searched) ? result.searched : null);
  if (!auto?.rows.length) {
    setGameLogView({
      status: null,
      picker: true,
      folders,
      reason: result && result.found === false && result.reason ? result.reason : autoGameLogUnavailable(),
    });
    return;
  }
  gameLogSources = auto.sources;
  gameLogRows = auto.rows;
  setGameLogView({
    status: null,
    found: gameLogFound(result.files[0], result.folder || ""),
    chooseOther: true,
    folders,
  });
  await selectGameLogSnapshot(gameLogRows[0].id);
}
async function selectGameLogSnapshot(id) {
  const source = gameLogSources.get(id),
    token = gameLogReadToken;
  if (!source) return;
  setGameLogView({ selectedId: id });
  try {
    const idMap = await loadGameIdMap();
    if (token !== gameLogReadToken) return;
    gameLogImport = importSnapshot(source.scan, source.dumpId, idMap);
    setGameLogView({ status: null });
  } catch {
    if (token !== gameLogReadToken) return;
    gameLogImport = null;
    setGameLogView({ status: { text: "This snapshot could not be turned into a build." } });
  }
}
function openGameLogImport() {
  resetGameLogImport();
  gameLogSession += 1;
  openDialog("import-game-log-dialog");
  findGameLog();
}
async function chooseGameLogFile(file) {
  const token = ++gameLogReadToken;
  clearGameLogResults();
  if (!file) {
    setGameLogView({ status: null });
    return;
  }
  setGameLogView({ found: null, reason: "", status: { text: "Reading the log…" } });
  // Read in this browser only (readGameLogFile never throws; its status says which problem it was); nothing is
  // uploaded or stored. A failure after a good read (id map, listing) is the planner's, not the file's.
  const idMapPromise = loadGameIdMap();
  idMapPromise.catch(() => {});
  const read = await readGameLogFile(file);
  if (token !== gameLogReadToken) return;
  if (read.status !== "ok") {
    setGameLogView({ status: gameLogFileStatus(read, file.name) });
    return;
  }
  try {
    const idMap = await idMapPromise,
      scan = read.scan;
    if (token !== gameLogReadToken) return;
    gameLogSources = new Map(scan.dumps.map((dump) => [dump.id, { scan, dumpId: dump.id }]));
    gameLogRows = listSnapshots(scan, idMap).sort((a, b) => (a.stamp < b.stamp ? 1 : -1));
    setGameLogView({ status: gameLogFileStatus(read, file.name) });
  } catch (error) {
    if (token === gameLogReadToken) {
      clearGameLogResults();
      setGameLogView({ status: gameLogListFailedStatus(error, file.name) });
    }
  }
}
function importGameLogBuild() {
  if (!gameLogImport) return;
  persistPlannerState();
  const { state, report } = gameLogImport;
  const imported = createBuild({
    name: gameLogBuildName(heroById(state.hero.selectedHeroId)?.name, report.source?.stamp),
    notes: importReportText(report),
    state,
    activate: true,
    origin: "game-log",
  });
  applyPlannerState(loadPlannerState());
  renderCandidateViews();
  closeDialog("import-game-log-dialog");
  activateWorkspaceView("builds", { scroll: false });
  showToast(`${imported.name} imported and active`);
}
