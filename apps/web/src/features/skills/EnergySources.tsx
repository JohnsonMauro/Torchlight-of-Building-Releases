// The "i" left of the Energy total: hovering, focusing or pressing it shows where the available Energy comes from (each
// equipped gear piece that gives Energy, weapons first, and the character level's), from the "skills" source's energy.
import type { EnergyView } from "@legacy/app/bridge/skills-view-model.ts";
import { HINT_BUTTON } from "../../ui/hint-button-classes";
import { Tooltip } from "../../ui/tooltip/Tooltip";

const ROW = "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 text-sm/snug";

export function EnergySources({ energy }: { energy: EnergyView | undefined }) {
  return (
    <Tooltip
      content={() => (energy ? { body: <EnergySourcesCard energy={energy} />, kind: "qol-help-tooltip" } : null)}
      toggle
    >
      <button type="button" className={HINT_BUTTON} aria-label="Energy sources">
        i
      </button>
    </Tooltip>
  );
}

function EnergySourcesCard({ energy }: { energy: EnergyView }) {
  const gear = energy.gear.reduce((sum, piece) => sum + piece.value, 0);
  return (
    <>
      <strong className="block text-base font-bold text-accent">{`Energy · ${energy.available} available`}</strong>
      <ul className="mt-1.5 grid gap-1">
        {energy.gear.map((piece, index) => (
          <li key={index} className={`${ROW} text-text`}>
            <span className="min-w-0">
              <span className="text-muted">{piece.slot}</span> · {piece.item}
            </span>
            <span className="tabular-nums">{piece.value}</span>
          </li>
        ))}
        <li className={`${ROW} border-t border-line pt-1 font-bold text-text`}>
          <span>Gear</span>
          <span className="tabular-nums">{gear}</span>
        </li>
        <li className={`${ROW} font-bold text-text`}>
          <span>Level</span>
          <span className="tabular-nums">{energy.fromLevel}</span>
        </li>
      </ul>
    </>
  );
}
