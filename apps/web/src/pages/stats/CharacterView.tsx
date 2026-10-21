import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { StatsPanel } from "@legacy/app/bridge/stats-view-model.ts";
import { DamagePath } from "../../features/stats/DamagePath";
import { StatSheet } from "../../features/stats/StatSheet";
import { STATS_BUTTON } from "../../features/stats/stat-sheet-classes";
import { useViewSource } from "../../ui/use-view-source";

const PANELS: { id: StatsPanel; label: string }[] = [
  { id: "sheet", label: "Stat sheet" },
  { id: "damage-path", label: "Damage path" },
];

// The Stats view: the build status, the Stat sheet / Damage path switch and the two panels, from the planner's "stats"
// source (src/app/bridge/stats-view-model.ts). The page heading is not shown (the legacy hid it too); its status
// elements stay for the tests and the planner. On a wide but short window the switch moves up into the panel's
// controls row (a negative margin; the row leaves room for it), and on a wide one the stat sheet's two banners sit side
// by side.
export function CharacterView() {
  const view = useViewSource("stats");
  const panel = view?.panel ?? "sheet";
  return (
    <section id="character-view" className="app-view leading-[normal]" hidden>
      <div className="talent-page-heading hidden">
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
      <div
        id="stats-panel-options"
        className="mb-4 flex gap-2 compact:relative compact:z-1 compact:-mb-8 compact:w-max"
        role="tablist"
        aria-label="Stats layout"
      >
        {PANELS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            data-stats-panel={item.id}
            aria-selected={item.id === panel}
            className={`${STATS_BUTTON} on:border-accent on:bg-accent/10 on:text-accent${item.id === panel ? " active" : ""}`}
            onClick={() => plannerCommands().setStatsPanel(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        id="stat-sheet"
        className="min-[1101px]:grid min-[1101px]:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] min-[1101px]:gap-2.5"
        hidden={view?.panel !== "sheet"}
      >
        {view ? <StatSheet sheet={view.sheet} /> : null}
      </div>
      <div id="damage-path" hidden={view?.panel !== "damage-path"}>
        {view ? <DamagePath view={view.damagePath} /> : null}
      </div>
    </section>
  );
}
