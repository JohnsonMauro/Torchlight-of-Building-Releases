// The Stats view's stat sheet: the active skill picker with the report button, the skill's damage banner (the training
// dummy recount with its sources that a click leaves out of the view, or the older 5 s / 20 s tiles, or "Damage not
// modeled"), the Effective HP banner and the Character stats tabs, whose rows open to the lines behind them. The data is
// the planner's "stats" source (src/app/bridge/stats-view-model.ts); the skill, the report and the recount sources are
// planner commands. The CSS styles the recount legend and bar by data-recount-source and "Show all" by
// data-recount-show-all, so they stay.
import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { readStoredStatTab, storeStatTab } from "@legacy/app/stats/stat-sheet-tabs.js";
import type {
  RecountView,
  StatDamageView,
  StatDrillView,
  StatRowView,
  StatSheetView,
  StatTabView,
} from "@legacy/app/bridge/stats-view-model.ts";
import type { NumberText } from "@legacy/app/stats/number-text.ts";
import { EffectiveHp } from "./EffectiveHp";
import { NumberToggle } from "./NumberToggle";

const INCLUDED_HINT = "Click to leave this source out of the view";
const EXCLUDED_HINT = "Click to include it again";

/** Enter or Space on a focusable non-button element acts as a click. */
function activateOnKey(event: KeyboardEvent, act: () => void) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  act();
}

export function ReportCalculationButton() {
  return (
    <button
      type="button"
      className="stat-sheet-report"
      title="Copy the build code and open a GitHub form to report a damage figure that differs in game"
      onClick={() => plannerCommands().reportCalculation()}
    >
      Report calculation issue
    </button>
  );
}

function RecountPanel({ recount }: { recount: RecountView }) {
  // A bar segment is gone once its source is left out: the focus moves to that source's legend item.
  const legend = useRef(new Map<string, HTMLLIElement>());
  const toggle = (key: string) => plannerCommands().toggleRecountSource(key);
  const fromBar = (key: string) => {
    toggle(key);
    legend.current.get(key)?.focus();
  };
  const [average, highest, last] = recount.fields;
  const field = (item: RecountView["fields"][number], hero = false) => (
    <div
      className={`dummy-recount-row${hero ? " dummy-recount-hero" : ""}`}
      data-recount-field={item.key}
      title={item.note || undefined}
    >
      <span className="dummy-recount-label">{item.label}</span>
      <NumberToggle id={`recount:${item.key}`} text={item.value} className="dummy-recount-value" />
    </div>
  );
  return (
    <section className="dummy-recount-panel" aria-label="Training dummy recount">
      <header className="dummy-recount-head">
        <span className="dummy-recount-tab">Damage (Level 85)</span>
        <button type="button" className="qol-help" data-qol-help="recount" aria-label="Dummy recount controls">
          ?
        </button>
        <span
          className="dummy-recount-duration"
          data-recount-field="duration"
          title={`Fixed ${recount.spanSeconds}-second dummy window`}
        >
          Duration <strong>{recount.duration}</strong> Seconds
        </span>
      </header>
      <div className="dummy-recount-body">
        {field(average, true)}
        <div className="dummy-recount-pair">
          {field(highest)}
          {field(last)}
        </div>
      </div>
      {recount.sources.length ? (
        <div className="dummy-recount-mix">
          <span className="dummy-recount-mix-title">{`Share by source over ${recount.spanSeconds} s`}</span>
          <div className="dummy-recount-mix-bar" role="group" aria-label={recount.summary}>
            {recount.sources
              .filter((item) => !item.excluded)
              .map((item) => (
                <i
                  key={item.key}
                  style={{ "--mix-color": item.color, width: item.width } as CSSProperties}
                  role="button"
                  tabIndex={0}
                  data-recount-source={item.key}
                  aria-pressed="true"
                  title={`${item.label}: ${item.share}. ${INCLUDED_HINT}`}
                  aria-label={`${item.label}: ${item.share}`}
                  onClick={() => fromBar(item.key)}
                  onKeyDown={(event) => activateOnKey(event, () => fromBar(item.key))}
                />
              ))}
          </div>
          <ul className="dummy-recount-mix-legend">
            {recount.sources.map((item) => (
              <li
                key={item.key}
                ref={(element) => {
                  if (element) legend.current.set(item.key, element);
                  else legend.current.delete(item.key);
                }}
                className={item.excluded ? "is-excluded" : undefined}
                style={{ "--mix-color": item.color } as CSSProperties}
                role="button"
                tabIndex={0}
                data-recount-source={item.key}
                aria-pressed={!item.excluded}
                title={item.excluded ? EXCLUDED_HINT : INCLUDED_HINT}
                onClick={() => toggle(item.key)}
                onKeyDown={(event) => activateOnKey(event, () => toggle(item.key))}
              >
                <span>{item.label}</span>
                <b>{item.share}</b>
              </li>
            ))}
          </ul>
          {recount.shown < recount.sources.length ? (
            <p className="dummy-recount-mix-note">
              {`Showing ${recount.shown} of ${recount.sources.length} sources · `}
              <a
                href="#"
                data-recount-show-all=""
                onClick={(event) => {
                  event.preventDefault();
                  plannerCommands().showAllRecountSources();
                }}
              >
                Show all
              </a>
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function RecountDetails({ recount }: { recount: RecountView }) {
  return (
    <details className="dummy-recount-details">
      <summary>How this is calculated</summary>
      {recount.sources.length ? (
        <table className="dummy-recount-sources">
          <thead>
            <tr>
              <th scope="col">Source</th>
              <th scope="col">{`DPS over ${recount.spanSeconds} s`}</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            {recount.sources.map((item) => (
              <tr key={item.key}>
                <th scope="row">{item.label}</th>
                <td>{item.dps}</td>
                <td>{item.share}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {recount.assumptions.length ? (
        <ul className="dummy-recount-assumptions">
          {recount.assumptions.map((text, index) => (
            <li key={index}>{text}</li>
          ))}
        </ul>
      ) : null}
      <p className="damage-bucket-footnote">Values are expected values; the in-game meter varies run to run.</p>
    </details>
  );
}

function TotalModeled({ total }: { total: NumberText | null }) {
  return (
    <>
      <span>Total modeled DPS</span>
      {total === null ? <strong>—</strong> : <NumberToggle id="stat:totalModeledDps" text={total} />}
      <small>Theoretical source damage mix; this is not the level-85 dummy estimate.</small>
    </>
  );
}

function Damage({ damage }: { damage: StatDamageView }) {
  if (damage.kind === "not-modeled")
    return (
      <>
        <strong>Damage not modeled</strong>
        <span>Known mechanics for this skill are shown below; its damage is not included in the planner total.</span>
      </>
    );
  if (damage.kind === "recount")
    return (
      <>
        <RecountPanel recount={damage.recount} />
        <footer className="dummy-recount-foot">
          <div className="dummy-recount-secondary">
            <TotalModeled total={damage.totalModeled} />
          </div>
          {damage.beamLine ? <span>{damage.beamLine}</span> : null}
          <RecountDetails recount={damage.recount} />
        </footer>
      </>
    );
  return (
    <>
      <div className="stat-sheet-dps-grid">
        {damage.tiles.map((tile) => (
          <div key={tile.label}>
            <span>{tile.label}</span>
            <strong>{tile.value}</strong>
            <small>{tile.note}</small>
          </div>
        ))}
        <div>
          <TotalModeled total={damage.totalModeled} />
        </div>
      </div>
      <span>{damage.beamLine}</span>
    </>
  );
}

function Drill({ drill }: { drill: StatDrillView }) {
  return (
    <div className="stat-drill">
      <p className="stat-drill-formula">{drill.formula}</p>
      {drill.notes.map((note, index) => (
        <p key={index} className="stat-drill-note">
          {note}
        </p>
      ))}
      {drill.groups.length ? (
        <ul className="stat-drill-groups">
          {drill.groups.map((group) => (
            <li key={group.name} className="stat-drill-group">
              <div className="stat-drill-group-head">
                <span>{group.name}</span>
                <strong>{group.total}</strong>
              </div>
              <ul>
                {group.lines.map((line, index) => (
                  <li key={index}>
                    <span>{line.text}</span>
                    <strong>{line.value}</strong>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function StatRow({ row }: { row: StatRowView }) {
  const inner = (
    <>
      <span className="stat-row-label">{row.label}</span>
      <strong className="stat-row-value">
        {row.value}
        {row.detail ? <small>{row.detail}</small> : null}
      </strong>
    </>
  );
  if (!row.drill)
    return (
      <div className="stat-sheet-row" title={row.title || undefined}>
        {inner}
      </div>
    );
  return (
    <details className="stat-sheet-row stat-sheet-row-drill">
      <summary title={row.title || undefined}>{inner}</summary>
      <Drill drill={row.drill} />
    </details>
  );
}

const TAB_KEYS: Record<string, (index: number, count: number) => number> = {
  ArrowRight: (index, count) => (index + 1) % count,
  ArrowLeft: (index, count) => (index - 1 + count) % count,
  Home: () => 0,
  End: (_index, count) => count - 1,
};

/** The Character stats panel; the open tab is remembered for the session (src/app/stats/stat-sheet-tabs.js). */
function StatPanel({ tabs }: { tabs: StatTabView[] }) {
  const [stored, setStored] = useState(() => readStoredStatTab());
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  if (!tabs.length) return null;
  // A stored tab the build has no rows for falls back to Offense.
  const selected = tabs.find((tab) => tab.key === stored) || tabs.find((tab) => tab.key === "offense") || tabs[0];
  const select = (key: string) => {
    setStored(key);
    storeStatTab(key);
  };
  return (
    <section className="stat-panel" aria-label="Character stats">
      <header className="stat-panel-head">
        <h2>
          Character stats
          <button type="button" className="qol-help" data-qol-help="stats" aria-label="Character stats controls">
            ?
          </button>
        </h2>
        <p>Only stats the build has are listed. Open a row for the lines behind it.</p>
      </header>
      <div className="stat-panel-tabs" role="tablist" aria-label="Stat categories">
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            ref={(element) => {
              if (element) buttons.current.set(tab.key, element);
              else buttons.current.delete(tab.key);
            }}
            type="button"
            role="tab"
            id={`stat-tab-${tab.key}`}
            aria-controls={`stat-tabpanel-${tab.key}`}
            aria-selected={tab === selected}
            tabIndex={tab === selected ? 0 : -1}
            className={tab === selected ? "active" : undefined}
            onClick={() => select(tab.key)}
            onKeyDown={(event) => {
              const next = TAB_KEYS[event.key]?.(index, tabs.length);
              if (next === undefined) return;
              event.preventDefault();
              select(tabs[next].key);
              buttons.current.get(tabs[next].key)?.focus();
            }}
          >
            {tab.title}
            <small>{tab.rowCount}</small>
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <section
          key={tab.key}
          role="tabpanel"
          id={`stat-tabpanel-${tab.key}`}
          aria-labelledby={`stat-tab-${tab.key}`}
          hidden={tab !== selected}
        >
          {tab.sections.map((section, index) => (
            <details key={`${index}:${section.key}`} className="stat-section" open>
              <summary>
                <span className="stat-section-title">{section.title}</span>
                <span className="stat-section-count">{section.rows.length}</span>
              </summary>
              <div className="stat-section-body">
                {section.rows.map((row, rowIndex) => (
                  <StatRow key={`${rowIndex}:${row.label}`} row={row} />
                ))}
              </div>
            </details>
          ))}
        </section>
      ))}
    </section>
  );
}

export function StatSheet({ sheet }: { sheet: StatSheetView }) {
  return (
    <>
      <div className="stat-sheet-controls">
        <label htmlFor="stat-sheet-skill">Active skill</label>
        <select
          id="stat-sheet-skill"
          value={sheet.selected}
          onChange={(event) => plannerCommands().selectStatSheetSkill(event.target.value)}
        >
          {sheet.options.map((option, index) => (
            <option key={`${index}:${option.value}`} value={option.value}>
              {option.name}
            </option>
          ))}
        </select>
        <ReportCalculationButton />
        <span>{sheet.active ? "Active" : "Inactive · insufficient Energy"}</span>
      </div>
      <section className="stat-sheet-banner stat-sheet-banner-wide">
        <h2>
          {sheet.skillName} <small>Level {sheet.skillLevel}</small>
        </h2>
        <Damage damage={sheet.damage} />
      </section>
      <EffectiveHp view={sheet.ehp} />
      <div className="stat-sheet-layout">
        <StatPanel tabs={sheet.tabs} />
      </div>
      <p className="stat-sheet-note">
        The Character stats panel lists only what the build has: stat totals sum every recognized stat line from gear,
        talents, cores, prisms, slates, pacts, kismets, hero memories and traits, including lines with no dummy-damage
        effect, and each row opens to its lines by source (sums for flat and increased, products for additional). Life,
        Mana, Energy Shield, Armor and Evasion combine those lines with TLIDB&apos;s per-level base values at the
        Effective HP banner&apos;s assumed character level. Resistances show the applied value with the uncapped total
        and maximum. Values with incomplete formulas are omitted.
      </p>
    </>
  );
}
