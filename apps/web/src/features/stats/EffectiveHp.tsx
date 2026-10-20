// The stat sheet's Effective HP banner, in the damage recount's style: the weakest-type figures, the damage type table,
// the ailment and crowd control checklist on the right, the layer chips and "How this is calculated". The data is
// src/app/stats/effective-hp-view.ts; every hover text comes from there.
import type { EffectiveHpView, EhpFigureView } from "@legacy/app/stats/effective-hp-view.ts";
import { NumberToggle } from "./NumberToggle";

function Figure({ figure, hero = false }: { figure: EhpFigureView; hero?: boolean }) {
  return (
    <div
      className={`dummy-recount-row ehp-row${hero ? " dummy-recount-hero" : ""}`}
      data-ehp-field={figure.key}
      title={figure.note || undefined}
    >
      <span className="dummy-recount-label ehp-label">{figure.label}</span>
      <NumberToggle id={`ehp:${figure.key}`} text={figure.value} className="dummy-recount-value ehp-value" />
    </div>
  );
}

function Details({ details }: { details: EffectiveHpView["details"] }) {
  return (
    <details className="dummy-recount-details">
      <summary>How this is calculated</summary>
      <ul className="dummy-recount-assumptions">
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
      <p className="damage-bucket-footnote">
        Not an in-game figure: the Armor and Evasion formulas are TLIDB&apos;s beta-data text and no hit test has
        calibrated them.
      </p>
    </details>
  );
}

export function EffectiveHp({ view }: { view: EffectiveHpView }) {
  return (
    <section className="stat-sheet-banner stat-sheet-banner-wide stat-sheet-ehp-banner" aria-label="Effective HP">
      <h2>
        Effective HP <small>Level {view.enemyLevel} hits</small>
      </h2>
      <section className="dummy-recount-panel ehp-panel">
        <header className="dummy-recount-head">
          <span className="dummy-recount-tab">Defense (Level {view.enemyLevel})</span>
          <span
            className="dummy-recount-duration"
            title="Character level is not stored in the build; it sets base Life and Evasion"
          >
            Character <strong>Lv.{view.characterLevel}</strong> assumed
          </span>
        </header>
        <div className="ehp-body">
          <div className="ehp-main">
            <div className="dummy-recount-body">
              <Figure figure={view.weakest} hero />
              <div className="dummy-recount-pair">
                {view.pair.map((figure) => (
                  <Figure key={figure.key} figure={figure} />
                ))}
              </div>
            </div>
            <table className="ehp-types">
              <thead>
                <tr>
                  <th scope="col">Damage type</th>
                  <th scope="col" className="ehp-mitigation">
                    Hit mitigation
                  </th>
                  <th scope="col">Guaranteed</th>
                  <th scope="col">vs attacks</th>
                  <th scope="col">vs spells</th>
                  <th
                    scope="col"
                    className="ehp-dot"
                    title="Damage over time: Life + Energy Shield ÷ resistance and non-hit damage taken; the ailment of that type below"
                  >
                    vs DoT
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.types.map((item) => (
                  <tr key={item.type}>
                    <th scope="row">{item.type}</th>
                    <td className="ehp-mitigation" title={item.mitigationTitle}>
                      {item.mitigation}
                    </td>
                    <td>{item.guaranteed}</td>
                    <td title={item.attackTitle}>{item.expectedAttack}</td>
                    <td title={item.spellTitle}>{item.expectedSpell}</td>
                    <td className="ehp-dot" title={item.dotTitle}>
                      {item.dot}
                      {item.ailment ? (
                        <small className="ehp-dot-ailment">{`${item.ailment.name} ${item.ailment.text}`}</small>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className="ehp-checklist" aria-label="Ailment and crowd control immunity">
            <span className="dummy-recount-mix-title">Ailments and crowd control</span>
            <ul>
              {view.checklist.map((item) => (
                <li key={item.label} className={`ehp-check ehp-check-${item.status}`} title={item.title || undefined}>
                  <i className="ehp-mark" aria-hidden="true">
                    {item.mark}
                  </i>
                  <span className="ehp-check-name">
                    {item.label}
                    {item.likely ? (
                      <>
                        {" "}
                        <em>likely</em>
                      </>
                    ) : null}
                  </span>
                  <span className="ehp-check-status">{item.statusText}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
      <footer className="dummy-recount-foot">
        <div className="ehp-layers">
          {view.layers.map((layer) => (
            <span key={layer.label} className="ehp-layer" title={layer.title}>
              <span>{layer.label}</span>
              <strong>{layer.value}</strong>
            </span>
          ))}
        </div>
        <Details details={view.details} />
      </footer>
    </section>
  );
}
