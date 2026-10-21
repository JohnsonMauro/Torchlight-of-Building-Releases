// The Stats view's stat sheet: the active skill picker with the report button, the skill's damage banner (the training
// dummy recount with its sources that a click leaves out of the view, or the older 5 s / 20 s tiles, or "Damage not
// modeled"), the Effective HP banner and the Character stats tabs, whose rows open to the lines behind them. The data is
// the planner's "stats" source (src/app/bridge/stats-view-model.ts); the skill, the report and the recount sources are
// planner commands. The banners' shared class lists are stat-sheet-classes.ts; each banner is a size container, so
// its inside follows its own width.
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
import { HelpButton } from "../../ui/HelpButton";
import { EffectiveHp } from "./EffectiveHp";
import { NumberToggle } from "./NumberToggle";
import {
  ASSUMPTIONS,
  BANNER,
  BANNER_TITLE,
  CAPTION,
  CARD,
  CELL,
  CHIP,
  DETAILS,
  DETAILS_SUMMARY,
  FIGURES,
  FOOT,
  FOOTNOTE,
  HEAD_CELL,
  HEAD_STRIP,
  HERO,
  HERO_LABEL,
  HERO_VALUE,
  PAIR,
  PANEL,
  PANEL_HEAD,
  PANEL_NOTE,
  PANEL_NOTE_VALUE,
  PANEL_TAB,
  ROW,
  ROW_LABEL,
  ROW_VALUE,
  STATS_BUTTON,
} from "./stat-sheet-classes";
import { tabKeyTarget } from "./tab-keys";

// A Character stats row (a plain row, or a drill-down row's summary): label left, value right, a hairline under it.
const STAT_ROW = "border-b border-white/7 text-[0.74rem] text-[#bfcbd5] last:border-b-0";
const STAT_ROW_LINE = "flex justify-between gap-[0.6rem] py-[0.3rem]";
const DRILL_TEXT = "mb-[0.3rem] text-[0.66rem] leading-[1.4]";
// A Character stats tab, the open one with an ember underline, and its row count chip.
const STAT_TAB =
  "group relative inline-flex cursor-pointer items-baseline gap-[0.4rem] px-[0.6rem] py-[0.65rem] text-[0.72rem] font-bold tracking-[0.06em] text-[#a9bac8] uppercase hover:text-[#dcebf5] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ffbd82] max-[560px]:px-[0.45rem] max-[560px]:py-[0.55rem] max-[560px]:text-[0.66rem] on:text-[#fff3e2] on:after:absolute on:after:inset-x-0 on:after:-bottom-px on:after:h-0.5 on:after:bg-[linear-gradient(90deg,#ffbd82,#db9850)] on:after:shadow-[0_0_8px_rgb(219_152_80/0.55)] on:after:content-['']";
const STAT_TAB_COUNT =
  "rounded-[3px] border border-white/10 px-[0.38rem] py-[0.08rem] text-[0.6rem] tracking-normal text-[#8ea0ad] tabular-nums group-on:border-[#a67736] group-on:bg-[#2d241a] group-on:text-[#ffd39b]";
// A recount source in the bar or the legend: a click leaves it out of the view.
const SOURCE_TOGGLE =
  "cursor-pointer focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#f09a42]";
// A Character stats section's chevron: right when closed, down when open.
const SECTION_CHEVRON =
  "before:size-[0.38rem] before:shrink-0 before:-rotate-45 before:border-r-2 before:border-b-2 before:border-[#ffbd82] before:transition-transform before:content-[''] group-open/section:before:-mt-[0.2rem] group-open/section:before:mr-[0.15rem] group-open/section:before:rotate-45";
// One of the older 5 s / 20 s tiles.
const DPS_TILE = "grid content-start gap-1 rounded border border-white/12 bg-[#18232e] p-[0.6rem]";

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
      className={STATS_BUTTON}
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
    <div className={hero ? HERO : `${ROW} py-3`} data-recount-field={item.key} title={item.note || undefined}>
      <span className={hero ? HERO_LABEL : ROW_LABEL}>{item.label}</span>
      <NumberToggle
        id={`recount:${item.key}`}
        text={item.value}
        className={`dummy-recount-value ${hero ? HERO_VALUE : ROW_VALUE}`}
      />
    </div>
  );
  return (
    <section className={PANEL} aria-label="Training dummy recount">
      <header className={PANEL_HEAD}>
        <span className={PANEL_TAB}>Damage (Level 85)</span>
        <HelpButton topic="recount" label="Dummy recount" className="-ml-[0.8rem]! self-center" />
        <span
          className={PANEL_NOTE}
          data-recount-field="duration"
          title={`Fixed ${recount.spanSeconds}-second dummy window`}
        >
          Duration <strong className={PANEL_NOTE_VALUE}>{recount.duration}</strong> Seconds
        </span>
      </header>
      <div className={`${FIGURES} grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] @max-[640px]:grid-cols-1`}>
        {field(average, true)}
        <div className={`${PAIR} border-l @max-[640px]:border-t @max-[640px]:border-l-0`}>
          {field(highest)}
          {field(last)}
        </div>
      </div>
      {recount.sources.length ? (
        <div className="grid gap-2 border-t border-white/8 bg-[#15202b] px-4 pt-[0.65rem] pb-3 @max-[500px]:px-3.5 compact:gap-[0.35rem] compact:px-[0.9rem] compact:py-2">
          <span className={CAPTION}>{`Share by source over ${recount.spanSeconds} s`}</span>
          <div
            className="flex h-[7px] overflow-hidden rounded-[2px] bg-[#0f171f] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.047)]"
            role="group"
            aria-label={recount.summary}
          >
            {recount.sources
              .filter((item) => !item.excluded)
              .map((item) => (
                <i
                  key={item.key}
                  className={`block h-full bg-(--mix-color) hover:brightness-[1.18] ${SOURCE_TOGGLE}`}
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
          <ul className="dummy-recount-mix-legend flex flex-wrap gap-x-[1.1rem] gap-y-[0.3rem] text-[0.68rem] text-[#bfcbd5]">
            {recount.sources.map((item) => (
              <li
                key={item.key}
                ref={(element) => {
                  if (element) legend.current.set(item.key, element);
                  else legend.current.delete(item.key);
                }}
                className={`group/source inline-flex min-w-0 items-center gap-[0.4rem] before:size-2 before:shrink-0 before:rounded-[2px] before:bg-(--mix-color) before:content-[''] aria-[pressed=false]:opacity-45 ${SOURCE_TOGGLE}`}
                style={{ "--mix-color": item.color } as CSSProperties}
                role="button"
                tabIndex={0}
                data-recount-source={item.key}
                aria-pressed={!item.excluded}
                title={item.excluded ? EXCLUDED_HINT : INCLUDED_HINT}
                onClick={() => toggle(item.key)}
                onKeyDown={(event) => activateOnKey(event, () => toggle(item.key))}
              >
                <span className="text-xs/[1.45] text-[#a8c3c0] group-hover/source:text-[#e9f4ff] group-aria-[pressed=false]/source:line-through">
                  {item.label}
                </span>
                <b className="text-[#e9f4ff] tabular-nums">{item.share}</b>
              </li>
            ))}
          </ul>
          {recount.shown < recount.sources.length ? (
            <p className="text-[0.68rem] text-[#8fa1b0]">
              {`Showing ${recount.shown} of ${recount.sources.length} sources · `}
              <a
                href="#"
                className="inline-block font-bold text-[#f09a42] no-underline underline-offset-2 hover:text-[#ffbd82] hover:underline focus-visible:text-[#ffbd82] focus-visible:underline"
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
    <details className={DETAILS}>
      <summary className={DETAILS_SUMMARY}>How this is calculated</summary>
      {recount.sources.length ? (
        <table className="my-3 w-full border-collapse text-xs">
          <thead>
            <tr>
              <th scope="col" className={`${HEAD_CELL} text-left`}>
                Source
              </th>
              <th scope="col" className={`${HEAD_CELL} text-right`}>{`DPS over ${recount.spanSeconds} s`}</th>
              <th scope="col" className={`${HEAD_CELL} text-right whitespace-nowrap`}>
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {recount.sources.map((item) => (
              <tr key={item.key}>
                <th scope="row" className={`${CELL} text-left font-semibold wrap-anywhere text-[#c8d4db]`}>
                  {item.label}
                </th>
                <td className={`${CELL} text-right whitespace-nowrap`}>{item.dps}</td>
                <td className={`${CELL} text-right whitespace-nowrap`}>{item.share}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {recount.assumptions.length ? (
        <ul className={ASSUMPTIONS}>
          {recount.assumptions.map((text, index) => (
            <li key={index}>{text}</li>
          ))}
        </ul>
      ) : null}
      <p className={FOOTNOTE}>Values are expected values; the in-game meter varies run to run.</p>
    </details>
  );
}

/** The text of a "Total modeled DPS" figure: in the recount's foot, or as one of the older tiles. */
interface FigureLook {
  label: string;
  value: string;
  note: string;
}

const SECONDARY: FigureLook = {
  label: "text-[0.68rem] font-bold tracking-[0.07em] text-[#a9bac8] uppercase",
  value: "text-[0.9rem] text-[#d9e4ec] tabular-nums",
  note: "basis-full text-[0.68rem]/[1.4] text-[#91a2ae]",
};

const TILE: FigureLook = {
  label: "text-[0.72rem] font-bold tracking-[0.04em] text-[#d9e4ec] uppercase",
  value: "text-[1.4rem] text-[#ffbd82] tabular-nums",
  note: "text-[0.7rem]/[1.4] text-[#a8c3c0]",
};

function TotalModeled({ total, look }: { total: NumberText | null; look: FigureLook }) {
  return (
    <>
      <span className={look.label}>Total modeled DPS</span>
      {total === null ? (
        <strong className={look.value}>—</strong>
      ) : (
        <NumberToggle id="stat:totalModeledDps" text={total} className={look.value} />
      )}
      <small className={look.note}>Theoretical source damage mix; this is not the level-85 dummy estimate.</small>
    </>
  );
}

const BANNER_TEXT = "text-xs/[1.45] text-[#a8c3c0]";

function Damage({ damage }: { damage: StatDamageView }) {
  if (damage.kind === "not-modeled")
    return (
      <>
        <strong className="text-[1.15rem] text-[#ffbd82]">Damage not modeled</strong>
        <span className={BANNER_TEXT}>
          Known mechanics for this skill are shown below; its damage is not included in the planner total.
        </span>
      </>
    );
  if (damage.kind === "recount")
    return (
      <>
        <RecountPanel recount={damage.recount} />
        <footer className={FOOT}>
          <div className="dummy-recount-secondary flex flex-wrap items-baseline gap-x-[0.6rem] gap-y-[0.15rem]">
            <TotalModeled total={damage.totalModeled} look={SECONDARY} />
          </div>
          {damage.beamLine ? <span className="text-[0.72rem]/[1.45] text-[#91a2ae]">{damage.beamLine}</span> : null}
          <RecountDetails recount={damage.recount} />
        </footer>
      </>
    );
  return (
    <>
      <div className="grid grid-cols-2 gap-[0.6rem] @max-[500px]:grid-cols-1">
        {damage.tiles.map((tile) => (
          <div key={tile.label} className={DPS_TILE}>
            <span className={TILE.label}>{tile.label}</span>
            <strong className={TILE.value}>{tile.value}</strong>
            <small className={TILE.note}>{tile.note}</small>
          </div>
        ))}
        <div className={DPS_TILE}>
          <TotalModeled total={damage.totalModeled} look={TILE} />
        </div>
      </div>
      <span className={BANNER_TEXT}>{damage.beamLine}</span>
    </>
  );
}

function Drill({ drill }: { drill: StatDrillView }) {
  return (
    <div className="stat-drill mt-[0.2rem] mb-[0.45rem] rounded-r-[3px] border-l-2 border-[#db985066] bg-[#15202b] px-[0.65rem] py-2">
      <p className={`${DRILL_TEXT} text-[#dbe6ee]`}>{drill.formula}</p>
      {drill.notes.map((note, index) => (
        <p key={index} className={`${DRILL_TEXT} text-[#a9bac8]`}>
          {note}
        </p>
      ))}
      {drill.groups.length ? (
        <ul>
          {drill.groups.map((group) => (
            <li key={group.name} className="mt-[0.3rem]">
              <div className="flex justify-between gap-[0.6rem] border-b border-white/8 py-[0.2rem] text-[0.64rem] font-bold tracking-[0.06em] text-[#ffd39b] uppercase">
                <span>{group.name}</span>
                <strong className="text-right tracking-normal whitespace-nowrap text-[#f3e3cf] normal-case tabular-nums">
                  {group.total}
                </strong>
              </div>
              <ul>
                {group.lines.map((line, index) => (
                  <li
                    key={index}
                    className="flex justify-between gap-[0.6rem] py-[0.18rem] pl-2 text-[0.68rem] leading-[1.35] text-[#b7c3cd]"
                  >
                    <span className="min-w-0 wrap-anywhere">{line.text}</span>
                    <strong className="font-semibold whitespace-nowrap text-[#dbe6ee] tabular-nums">
                      {line.value}
                    </strong>
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

// A drill-down row's label: an ember "›" after it that turns down when the row is open; gold on hover and when open.
const DRILL_LABEL =
  "after:ml-[0.35rem] after:inline-block after:font-bold after:text-[#db9850] after:transition-transform after:content-['›'] group-hover/summary:text-[#ffd39b] group-open/row:text-[#ffd39b] group-open/row:after:rotate-90";

function StatRow({ row }: { row: StatRowView }) {
  const inner = (
    <>
      <span className={`min-w-0 wrap-anywhere ${row.drill ? DRILL_LABEL : ""}`}>{row.label}</span>
      <strong className="flex max-w-[62%] flex-[0_1_auto] flex-col items-end text-right wrap-anywhere text-[#e9f4ff] tabular-nums max-[560px]:max-w-[56%]">
        {row.value}
        {row.detail ? (
          <small className="text-[0.62rem] font-normal tracking-[0.02em] text-[#8ea0ad]">{row.detail}</small>
        ) : null}
      </strong>
    </>
  );
  if (!row.drill)
    return (
      <div className={`${STAT_ROW} ${STAT_ROW_LINE}`} title={row.title || undefined}>
        {inner}
      </div>
    );
  return (
    <details className={`stat-sheet-row-drill group/row block ${STAT_ROW}`}>
      <summary
        className={`group/summary ${STAT_ROW_LINE} cursor-pointer list-none rounded-[3px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#ffbd82]`}
        title={row.title || undefined}
      >
        {inner}
      </summary>
      <Drill drill={row.drill} />
    </details>
  );
}

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
    <section className={CARD} aria-label="Character stats">
      <header
        className={`${HEAD_STRIP} flex flex-wrap items-baseline gap-x-4 gap-y-[0.3rem] px-3.5 py-[9px] max-[560px]:px-2.5 compact:py-[7px]`}
      >
        <h2 className="font-serif text-base font-semibold tracking-[0.07em] text-[#f6f1e7] uppercase">
          Character stats
          <HelpButton topic="stats" label="Character stats" />
        </h2>
        <p className="text-[0.72rem] text-[#a9bac8]">
          Only stats the build has are listed. Open a row for the lines behind it.
        </p>
      </header>
      <div
        className="flex flex-wrap gap-x-1 border-b border-white/8 bg-[#1b2531] px-3.5 max-[560px]:px-2.5"
        role="tablist"
        aria-label="Stat categories"
      >
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
            className={`${STAT_TAB}${tab === selected ? " active" : ""}`}
            onClick={() => select(tab.key)}
            onKeyDown={(event) => {
              const next = tabKeyTarget(event.key, index, tabs.length);
              if (next === undefined) return;
              event.preventDefault();
              select(tabs[next].key);
              buttons.current.get(tabs[next].key)?.focus();
            }}
          >
            {tab.title}
            <small className={STAT_TAB_COUNT}>{tab.rowCount}</small>
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
          className="px-3.5 pt-[0.75rem] pb-[0.15rem] max-[560px]:px-2.5 max-[560px]:pt-[0.6rem] max-[560px]:pb-[0.1rem] min-[900px]:columns-2 min-[900px]:gap-x-[0.6rem] compact:pt-[0.6rem]"
        >
          {tab.sections.map((section, index) => (
            <details
              key={`${index}:${section.key}`}
              className="group/section mb-[0.6rem] break-inside-avoid overflow-hidden rounded border border-white/8 bg-[#18232e]"
              open
            >
              <summary
                className={`flex cursor-pointer list-none items-center gap-2 bg-[#303c49] px-3 py-2 font-serif text-[0.8rem] tracking-[0.05em] text-[#f1f5f8] uppercase hover:text-[#ffd39b] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ffbd82] ${SECTION_CHEVRON}`}
              >
                <span className="min-w-0">{section.title}</span>
                <span className="ml-auto font-sans text-[0.62rem] tracking-[0.04em] text-[#8ea0ad] tabular-nums">
                  {section.rows.length}
                </span>
              </summary>
              <div className="px-3 pt-[0.15rem] pb-[0.35rem]">
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
      <div className="stat-sheet-controls mb-[0.8rem] flex items-center gap-[0.65rem] text-[0.82rem] text-[#b9c8d3] max-[560px]:flex-wrap min-[1101px]:col-span-full compact:mb-2 compact:min-h-8 compact:pl-[218px]">
        <label htmlFor="stat-sheet-skill" className="font-bold">
          Active skill
        </label>
        <select
          id="stat-sheet-skill"
          className="min-w-[180px] cursor-pointer rounded-[5px] border border-[#b98345] bg-[#252b32] px-[0.55rem] py-[0.45rem] text-[13px] text-[#f5d09d] compact:py-[0.32rem]"
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
        <span className="ml-auto text-[#8ec5a7] max-[560px]:ml-0">
          {sheet.active ? "Active" : "Inactive · insufficient Energy"}
        </span>
      </div>
      <section className={BANNER}>
        <h2 className={BANNER_TITLE}>
          {`${sheet.skillName} `}
          <small className={CHIP}>{`Level ${sheet.skillLevel}`}</small>
        </h2>
        <Damage damage={sheet.damage} />
      </section>
      <EffectiveHp view={sheet.ehp} />
      <div className="mb-[0.6rem] grid items-start gap-[0.7rem] min-[1101px]:col-span-full">
        <StatPanel tabs={sheet.tabs} />
      </div>
      <p className="mb-3 text-[0.75rem] leading-[1.5] text-[#9cadb9] min-[1101px]:col-span-full">
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
