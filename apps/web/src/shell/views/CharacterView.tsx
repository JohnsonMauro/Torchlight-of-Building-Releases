import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { StatsPanel } from "@legacy/app/bridge/stats-view-model.ts";
import { DamagePath } from "../../features/stats/DamagePath";
import { StatSheet } from "../../features/stats/StatSheet";
import { useViewSource } from "../../ui/use-view-source";

const PANELS: { id: StatsPanel; label: string }[] = [
  { id: "sheet", label: "Stat sheet" },
  { id: "damage-path", label: "Damage path" },
];

// The Stats view: the build status, the Stat sheet / Damage path switch and the two panels, from the planner's "stats"
// source (src/app/bridge/stats-view-model.ts).
export function CharacterView() {
  const view = useViewSource("stats");
  const panel = view?.panel ?? "sheet";
  return (
    <section id="character-view" className="app-view" hidden>
      <div className="talent-page-heading">
        <div>
          <p className="eyebrow">Candidate build</p>
          <h1>Stats</h1>
          <p className="muted">
            See modeled damage first. Open the sections below for sources, defense, and calculations.
          </p>
        </div>
        <div className="talent-total">
          <span>Build status</span>
          <strong id="character-status" className={view?.status.warning ? "warning" : undefined}>
            {view?.status.text ?? "—"}
          </strong>
          <small id="character-status-detail">{view?.status.detail}</small>
        </div>
      </div>
      <div id="stats-panel-options" className="stats-panel-options" role="tablist" aria-label="Stats layout">
        {PANELS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            data-stats-panel={item.id}
            aria-selected={item.id === panel}
            className={item.id === panel ? "active" : undefined}
            onClick={() => plannerCommands().setStatsPanel(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div id="stat-sheet" hidden={view?.panel !== "sheet"}>
        {view ? <StatSheet sheet={view.sheet} /> : null}
      </div>
      <div id="damage-path" hidden={view?.panel !== "damage-path"}>
        {view ? <DamagePath view={view.damagePath} /> : null}
      </div>
    </section>
  );
}
