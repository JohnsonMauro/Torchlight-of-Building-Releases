// The stat sheet's Effective HP banner, in the damage recount's style: the weakest-type figures, the damage type table,
// the ailment and crowd control checklist on the right, the layer chips and "How this is calculated". The data is
// src/app/stats/effective-hp-view.ts; every hover text comes from there. The banner is a size container: below 700px
// the checklist moves under the figures, below 500px the figures stack and the table drops its mitigation column.
import type { EffectiveHpView, EhpFigureView } from "@legacy/app/stats/effective-hp-view.ts";
import { NumberToggle } from "./NumberToggle";
import {
  ASSUMPTIONS,
  BANNER,
  BANNER_TITLE,
  CAPTION,
  CELL,
  CHIP,
  DETAILS,
  DETAILS_SUMMARY,
  FIGURES,
  FOOT,
  FOOTNOTE,
  HEAD_CELL,
  HERO,
  HERO_LABEL,
  HERO_VALUE,
  PAIR,
  PANEL,
  PANEL_HEAD,
  PANEL_NOTE,
  PANEL_NOTE_VALUE,
  PANEL_TAB,
  PANEL_WELL,
  ROW,
  ROW_LABEL,
  ROW_VALUE,
} from "./stat-sheet-classes";

// The checklist's mark and status color by status: ok immune, warn partial, danger unprotected.
const CHECK_TONE: Record<string, string> = {
  immune: "text-ok",
  conditional: "text-warn",
  reduced: "text-warn",
  worse: "text-danger",
  none: "text-danger",
};
// The damage type table's narrow-banner tightening.
const TYPE_CELL = `${CELL} whitespace-nowrap @max-[500px]:px-1 @max-[500px]:py-1`;
const MITIGATION = "@max-[500px]:hidden";
const TYPE_HEAD = `${HEAD_CELL} @max-[500px]:px-1 @max-[500px]:tracking-normal`;

function Figure({ figure, hero = false }: { figure: EhpFigureView; hero?: boolean }) {
  return (
    <div className={hero ? HERO : `${ROW} py-2`} data-ehp-field={figure.key} title={figure.note || undefined}>
      <span className={hero ? HERO_LABEL : ROW_LABEL}>{figure.label}</span>
      <NumberToggle
        id={`ehp:${figure.key}`}
        text={figure.value}
        className={`dummy-recount-value ${hero ? HERO_VALUE : ROW_VALUE}`}
      />
    </div>
  );
}

function Details({ details }: { details: EffectiveHpView["details"] }) {
  return (
    <details className={DETAILS}>
      <summary className={DETAILS_SUMMARY}>How this is calculated</summary>
      <ul className={ASSUMPTIONS}>
        <li>
          {`Pool = Life × (1 − sealed %) + Energy Shield${details.barrier ? ` + ${details.barrier} absorb` : ""}. Life = (${details.baseLife} base + flat) × (1 + increased %) × additional; Energy Shield = (gear + flat) × (1 + increased %) × additional. TLIDB: 50 Life +13 per level, no base Energy Shield, Energy Shield is deducted before Life.`}
        </li>
        <li>
          {
            'Guaranteed EHP = pool ÷ [(1 − Armor reduction) × (1 − resistance) × Π(1 + additional damage taken)]. With damage taken conversion ("Converts X% of Erosion Damage taken to Cold Damage") each share takes its new type\'s mitigation and the shares are summed (TLIDB Damage Type Conversion: the type changes before Damage Mitigation; past 100% the sources are scaled to 100%; it applies to hits and damage over time). Expected = guaranteed ÷ [(1 − evade) × (1 − avoid) × (1 − block chance × block ratio)].'
          }
        </li>
        <li>
          {
            'vs damage over time = (Life × (1 − sealed %) + Energy Shield) ÷ [(1 − resistance) × Π(1 + additional damage taken that is not hit-only) × Π(1 + additional Damage Over Time taken)]. No Barrier (it absorbs Hit Damage), no Armor, evasion or block (TLIDB: defensive mechanics against Hit Damage), no chance to avoid damage. The ailment of each type (Trauma · Physical, Ignite · Fire, Wilt · Erosion) also takes its own lines: "additional Ignite Damage taken" multiplies (game mod 4); "Wilt / Trauma Damage taken" lines add together (game mod 3). Immune ailments show Immune; a summed reduction of 100% or more (damage taken, effect received, chance to avoid) counts as immunity (user rule 2026-10-13).'
          }
        </li>
        <li>
          {`Injury Buffer (${details.injuryBuffer}) delays part of each hit; the total is unchanged, so it does not change EHP. Energy Shield charge and Life regeneration are not counted.`}
        </li>
        {details.assumptions.map((text, index) => (
          <li key={`a${index}`}>{`Assumed: ${text}`}</li>
        ))}
        {details.provisional.map((text, index) => (
          <li key={`p${index}`}>{`Provisional: ${text}`}</li>
        ))}
        <li>
          Checklist mapping: TLIDB Ailment page (Ignite, Frostbite, Freeze, Shock, Numbed, Trauma, Wilt) and Crowd
          Control Effects page (Frostbite, Freeze, Paralysis, Knockback, Weaken, Slow, Taunt, Blinding). TLIDB has no
          Stun entry.
        </li>
      </ul>
      <p className={FOOTNOTE}>
        Not an in-game figure: the Armor and Evasion formulas are TLIDB&apos;s beta-data text and no hit test has
        calibrated them.
      </p>
    </details>
  );
}

export function EffectiveHp({ view }: { view: EffectiveHpView }) {
  return (
    <section className={BANNER} aria-label="Effective HP">
      <h2 className={BANNER_TITLE}>
        Effective HP <small className={CHIP}>{`Level ${view.enemyLevel} hits`}</small>
      </h2>
      <section className={PANEL}>
        <header className={PANEL_HEAD}>
          <span className={PANEL_TAB}>{`Defense (Level ${view.enemyLevel})`}</span>
          <span
            className={PANEL_NOTE}
            title="Character level is not stored in the build; it sets base Life and Evasion"
          >
            Character <strong className={PANEL_NOTE_VALUE}>{`Lv.${view.characterLevel}`}</strong> assumed
          </span>
        </header>
        <div className="grid flex-1 grid-cols-[minmax(0,1.55fr)_minmax(265px,1fr)] @max-[700px]:grid-cols-1">
          <div className="flex min-w-0 flex-col">
            <div className={`${FIGURES} grid-cols-[minmax(18rem,1fr)_minmax(0,max-content)] @max-[500px]:grid-cols-1`}>
              <Figure figure={view.weakest} hero />
              <div className={`${PAIR} border-l @max-[500px]:border-t @max-[500px]:border-l-0`}>
                {view.pair.map((figure) => (
                  <Figure key={figure.key} figure={figure} />
                ))}
              </div>
            </div>
            <table className="ehp-types w-full border-collapse border-t border-line text-xs">
              <thead>
                <tr>
                  <th scope="col" className={`${TYPE_HEAD} text-left whitespace-nowrap`}>
                    Damage type
                  </th>
                  <th scope="col" className={`${TYPE_HEAD} ${MITIGATION} text-right`}>
                    Hit mitigation
                  </th>
                  <th scope="col" className={`${TYPE_HEAD} text-right`}>
                    Guaranteed
                  </th>
                  <th scope="col" className={`${TYPE_HEAD} text-right`}>
                    vs attacks
                  </th>
                  <th scope="col" className={`${TYPE_HEAD} text-right`}>
                    vs spells
                  </th>
                  <th
                    scope="col"
                    className={`${TYPE_HEAD} border-l border-l-line text-right`}
                    title="Damage over time: Life + Energy Shield ÷ resistance and non-hit damage taken; the ailment of that type below"
                  >
                    vs DoT
                  </th>
                </tr>
              </thead>
              <tbody className="[&>tr:last-child>*]:border-b-0">
                {view.types.map((item) => (
                  <tr key={item.type}>
                    <th
                      scope="row"
                      className={`${TYPE_CELL} w-[1%] text-left font-semibold tracking-widest text-text uppercase @max-[500px]:tracking-wide`}
                    >
                      {item.type}
                    </th>
                    <td className={`${TYPE_CELL} text-right ${MITIGATION} text-muted`} title={item.mitigationTitle}>
                      {item.mitigation}
                    </td>
                    <td className={`${TYPE_CELL} text-right font-semibold text-text`}>{item.guaranteed}</td>
                    <td className={`${TYPE_CELL} text-right font-semibold text-text`} title={item.attackTitle}>
                      {item.expectedAttack}
                    </td>
                    <td className={`${TYPE_CELL} text-right font-semibold text-text`} title={item.spellTitle}>
                      {item.expectedSpell}
                    </td>
                    <td
                      className={`${TYPE_CELL} border-l border-l-line text-right font-semibold text-text`}
                      title={item.dotTitle}
                    >
                      {item.dot}
                      {item.ailment ? (
                        <small className="mt-0.5 block text-xs font-normal whitespace-normal text-dim">{`${item.ailment.name} ${item.ailment.text}`}</small>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside
            className={`grid content-start gap-2 border-l border-line ${PANEL_WELL} px-3.5 py-3 @max-[700px]:gap-1 @max-[700px]:border-t @max-[700px]:border-l-0 @max-[700px]:py-2 compact:gap-1 compact:py-2`}
            aria-label="Ailment and crowd control immunity"
          >
            <span className={CAPTION}>Ailments and crowd control</span>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-4 gap-y-0.5">
              {view.checklist.map((item) => (
                <li
                  key={item.label}
                  className="grid grid-cols-[auto_6rem_minmax(0,1fr)] items-center gap-x-2 border-b border-line py-1 text-xs text-muted last:border-b-0 @max-[700px]:py-0.5 compact:py-0.5"
                  title={item.title || undefined}
                >
                  <i
                    className={`inline-grid size-4 place-items-center rounded-sm border border-current text-[10px] leading-none font-bold not-italic ${CHECK_TONE[item.status] ?? ""} ${item.status === "none" ? "opacity-55" : ""}`}
                    aria-hidden="true"
                  >
                    {item.mark}
                  </i>
                  <span>
                    {item.label}
                    {item.likely ? (
                      <>
                        {" "}
                        <em className="ml-1 text-[10px] tracking-wide text-warn uppercase not-italic">likely</em>
                      </>
                    ) : null}
                  </span>
                  <span
                    className={`justify-self-start text-xs font-bold tracking-wider whitespace-nowrap uppercase ${CHECK_TONE[item.status] ?? ""}`}
                  >
                    {item.statusText}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
      <footer className={FOOT}>
        <div className="flex flex-wrap gap-x-2 gap-y-1.5 compact:gap-x-1.5 compact:gap-y-1">
          {view.layers.map((layer) => (
            <span
              key={layer.label}
              className="ehp-layer inline-flex items-baseline gap-1.5 rounded-sm border border-line bg-raised px-2 py-0.5"
              title={layer.title}
            >
              <span className="text-[10px] font-bold tracking-wider text-muted uppercase">{layer.label}</span>
              <strong className="text-xs text-text tabular-nums">{layer.value}</strong>
            </span>
          ))}
        </div>
        <Details details={view.details} />
      </footer>
    </section>
  );
}
