// The Stats view's Damage path panel: the report button, the build's damage paths as tabs (in per-skill groups when
// several skills deal damage), the open path's summary card (hero figure, chain of stage chips, windows, assumptions,
// the Ill Omen card), its stages with the sources feeding each, its extra sections and notes, and the open questions
// that apply to the build. The data is the planner's "stats" source (src/app/bridge/damage-path-view-model.ts); the
// path, the copy, the answer form and the report are planner commands. Each source shows its tooltip
// (DamageSourceTooltip); data-damage-source names its row for the tests. Each chain chip draws its operator from data-op.
// Everything is drawn with utilities. Each stage kind sets --stage-color, read by its chain chip, its card's left
// border and its feeders' share bars. `compact:` is a wide but short window (app.css).
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type {
  DamagePathView,
  ExtraSectionView,
  IllOmenCardView,
  OpenQuestionView,
  PathSectionView,
  PathTabView,
  StageView,
} from "@legacy/app/bridge/damage-path-view-model.ts";
import { DamageSourceTooltip } from "./DamageSourceTooltip";
import { NumberToggle } from "./NumberToggle";
import { ReportCalculationButton } from "./StatSheet";
import { HEAD_STRIP, SECTION_COUNT, SECTION_SUMMARY, TAB, TAB_COUNT } from "./stat-sheet-classes";
import { tabKeyTarget } from "./tab-keys";

const COPIED_MS = 1600;

// Each stage kind's colour (a chain chip, a stage card's left edge, its feeders' bars); dim for the rest.
const STAGE_COLORS: Record<string, string> = {
  base: "[--stage-color:var(--color-accent)]",
  add: "[--stage-color:var(--color-info)]",
  sum: "[--stage-color:var(--color-info)]",
  multiply: "[--stage-color:var(--color-violet)]",
  target: "[--stage-color:var(--color-danger)]",
  stacks: "[--stage-color:var(--color-ok)]",
};
const stageColor = (kind: string) => STAGE_COLORS[kind] ?? "[--stage-color:var(--color-dim)]";

// A collapsible card (a stage, an extra section); its summary is SECTION_SUMMARY (stat-sheet-classes.ts).
const SECTION_CARD = "group/section panel m-0 overflow-hidden";
// The summary card of a path (and of the Ill Omen card) with its heading strip.
const SUMMARY_CARD =
  "panel m-0 grid gap-2 overflow-hidden px-3.5 pb-3 max-[560px]:px-2.5 max-[560px]:pb-2.5 compact:gap-1.5 compact:pb-2";
const SUMMARY_HEADING = `${HEAD_STRIP} -mx-3.5 mb-0.5 px-3.5 py-2 font-display text-sm font-semibold tracking-wider text-accent uppercase max-[560px]:-mx-2.5 max-[560px]:px-2.5 compact:py-1.5`;
const SUMMARY_HEADING_NOTE = "ml-1.5 font-sans text-xs font-normal tracking-normal text-muted normal-case";
const INTRO = "text-xs leading-normal text-muted";
// The windows: one tile per figure, the emphasised one tinted with the accent.
const WINDOWS = "m-0 flex flex-wrap gap-2";
const WINDOW_TILE =
  "grid min-w-0 flex-[1_1_150px] gap-0.5 rounded-sm border border-line bg-raised px-2.5 py-1.5 compact:px-2 compact:py-1 [&.emphasis]:border-accent/40 [&.emphasis]:bg-accent/10";
const WINDOW_LABEL = "text-[10px] font-bold tracking-wider text-muted uppercase";
const WINDOW_VALUE = "m-0 grid text-sm font-bold text-text tabular-nums wrap-anywhere";
const WINDOW_NOTE = "text-xs leading-snug font-normal text-dim";
// The pills of an assumed condition.
const CHIPS = "m-0 flex list-none flex-wrap gap-1 p-0";
const CHIP = "rounded-full border border-accent/40 px-2 py-px text-xs leading-snug text-accent";
// A row of the stat sheet: label on the left, value on the right, a line between rows.
const SHEET_ROW_BOX = "border-b border-line py-1 text-xs text-muted last:border-b-0";
const SHEET_ROW = `flex justify-between gap-2.5 ${SHEET_ROW_BOX}`;
const SECONDARY_BUTTON = "btn flex-none px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase";

// Between two stages: an accent line down the middle, the operation's pill on it, an arrowhead at the bottom.
const STAGE_LINK =
  "relative flex items-center justify-center pt-2 pb-4.5 compact:pt-1.5 compact:pb-4 before:absolute before:inset-y-0 before:left-[calc(50%-1px)] before:border-l-2 before:border-accent-strong/60 before:content-[''] after:absolute after:bottom-[3px] after:left-[calc(50%-7px)] after:size-3 after:rotate-45 after:border-r-2 after:border-b-2 after:border-accent-strong after:content-['']";
// A stage's header: the step number, the title with its formula, then the stage's figure over the running value. The
// chevron is auto-placed: under the figure when the stage has no running value, else under the step. On a narrow
// window the figure and the running value drop under the title.
const STAGE_HEADER =
  "grid grid-cols-[auto_minmax(0,380px)_minmax(0,1fr)] items-center gap-x-2.5 gap-y-0.5 px-3 py-2 [grid-template-areas:'step_head_value'_'step_head_after'] max-[699px]:grid-cols-[auto_minmax(0,1fr)] max-[699px]:[grid-template-areas:'step_head'_'step_value'_'step_after'] max-[560px]:px-2 max-[560px]:py-1.5 compact:px-2.5 compact:py-1.5";
// A feeder row: its share of the bucket as a faint bar in the stage colour (--share wide), a coloured left edge.
const FEED =
  "relative grid cursor-default grid-cols-[minmax(0,380px)_96px_130px] items-center justify-start gap-x-2 overflow-hidden rounded-sm bg-sunken py-1 pr-2 pl-2.5 text-xs leading-snug text-text hover:bg-raised hover:outline hover:outline-offset-1 hover:outline-accent/40 focus-visible:bg-raised focus-visible:outline focus-visible:outline-offset-1 focus-visible:outline-accent/40 max-[699px]:grid-cols-[minmax(0,1fr)_auto] max-[699px]:gap-x-1.5 max-[560px]:pr-1.5 max-[560px]:pl-2 compact:py-0.5 before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-(--share,0%) before:bg-(--stage-color) before:opacity-15 before:content-[''] after:absolute after:inset-y-0 after:left-0 after:w-0.5 after:bg-(--stage-color) after:opacity-60 after:content-['']";
// A chain chip's operator (×, =, +) drawn in the gap before it, from its data-op.
const CHAIN_OP =
  "data-op:ml-4 data-op:before:absolute data-op:before:top-1/2 data-op:before:-left-4.5 data-op:before:w-4 data-op:before:-translate-y-1/2 data-op:before:text-center data-op:before:text-sm data-op:before:font-bold data-op:before:text-dim data-op:before:content-[attr(data-op)]";

function ExtraSection({
  title,
  count,
  open,
  className,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details className={`stat-section${className ? ` ${className}` : ""} ${SECTION_CARD} mt-2.5`} open={open}>
      <summary className={`${SECTION_SUMMARY} flex items-center gap-2 px-3 py-2`}>
        <span className="stat-section-title min-w-0">{title}</span>
        <span className={`stat-section-count ${SECTION_COUNT}`}>{count}</span>
      </summary>
      <div className="stat-section-body px-3 pt-0.5 pb-1.5">{children}</div>
    </details>
  );
}

function SectionRows({ section }: { section: ExtraSectionView }) {
  return (
    <ExtraSection title={section.title} count={section.rows.length} open={section.open}>
      {section.rows.map((row, index) => (
        <div key={index} className={`stat-sheet-row ${SHEET_ROW}`} title={row.title || undefined}>
          <span className="stat-row-label">{row.label}</span>
          <strong className="stat-row-value text-right whitespace-nowrap text-text tabular-nums max-[560px]:whitespace-normal max-[560px]:wrap-anywhere">
            {row.value}
            {row.detail ? <small className="text-[smaller]">{row.detail}</small> : null}
          </strong>
        </div>
      ))}
    </ExtraSection>
  );
}

function IllOmenCard({ card }: { card: IllOmenCardView }) {
  return (
    <section className="damage-path-section ill-omen-card grid gap-2.5" aria-label="Ill Omen beyond the dummy">
      <header className={`stat-sheet-banner ${SUMMARY_CARD}`}>
        <h2 className={SUMMARY_HEADING}>
          Ill Omen (beyond the dummy) <small className={SUMMARY_HEADING_NOTE}>{card.tag}</small>
        </h2>
        <p className={`damage-path-intro ${INTRO}`}>{card.subline}</p>
        <dl className={WINDOWS}>
          {card.tiles.map((tile) => (
            <div key={tile.key} className={`${tile.emphasis ? "emphasis " : ""}${WINDOW_TILE}`}>
              <dt className={WINDOW_LABEL}>{tile.label}</dt>
              <dd className={WINDOW_VALUE}>
                {tile.value}
                <small className={WINDOW_NOTE}>{tile.explanation}</small>
              </dd>
            </div>
          ))}
        </dl>
        <p className="damage-path-footnote mt-2.5 text-xs leading-normal text-dim">{`Working: ${card.working}`}</p>
      </header>
    </section>
  );
}

function Stage({ stage }: { stage: StageView }) {
  return (
    <>
      {stage.connector ? (
        <div className={STAGE_LINK} aria-hidden="true">
          <span className="relative rounded-full border border-accent-strong bg-surface px-3 py-1 text-xs leading-snug font-bold tracking-wider whitespace-nowrap text-accent-strong uppercase">
            {stage.connector}
          </span>
        </div>
      ) : null}
      <details
        className={`stat-section damage-stage ${stage.kind} ${stageColor(stage.kind)} ${SECTION_CARD} border-l-3 border-l-(--stage-color)`}
        open={stage.open}
      >
        <summary className={`${SECTION_SUMMARY} ${STAGE_HEADER}`}>
          <span className="damage-stage-step mt-0.5 self-start text-xs font-normal tracking-wider text-dim tabular-nums [grid-area:step]">
            {stage.step}
          </span>
          <span className="damage-stage-head grid min-w-0 gap-0.5 [grid-area:head]">
            <span className="stat-section-title min-w-0 wrap-anywhere">{stage.title}</span>
            {stage.math ? (
              <span className="damage-stage-math text-xs font-normal tracking-normal text-text normal-case tabular-nums wrap-anywhere">
                {stage.math}
              </span>
            ) : (
              <span className="damage-stage-kind text-xs font-normal tracking-normal text-muted normal-case wrap-anywhere">
                {stage.action}
              </span>
            )}
          </span>
          <strong className="damage-stage-value min-w-0 justify-self-start text-left text-sm tracking-normal text-accent normal-case tabular-nums wrap-anywhere [grid-area:value]">
            {stage.value}
          </strong>
          {stage.running ? (
            <span className="damage-stage-after grid min-w-0 gap-px justify-self-stretch text-left text-xs font-normal tracking-normal normal-case [grid-area:after]">
              <span className="text-[10px] font-bold tracking-wider text-dim uppercase">{stage.running.label}</span>
              <strong
                className="text-lg leading-tight font-bold text-accent-strong tabular-nums wrap-anywhere"
                title={stage.running.detail || undefined}
              >
                {stage.running.value}
              </strong>
              {stage.running.detail ? (
                <small
                  className="damage-stage-after-detail min-w-0 truncate text-xs leading-snug text-dim"
                  title={stage.running.detail}
                >
                  {stage.running.detail}
                </small>
              ) : null}
            </span>
          ) : null}
        </summary>
        <div className="stat-section-body grid gap-1.5 px-3 py-2 max-[560px]:px-2 compact:px-2.5 compact:py-1.5">
          {stage.byOrigin ? (
            <p className="damage-stage-origins text-xs leading-snug font-bold tracking-wide text-accent">
              {stage.byOrigin}
            </p>
          ) : null}
          <p className="stat-drill-formula damage-stage-rule text-xs leading-normal text-text">{stage.rule}</p>
          {stage.notes.map((note, index) => (
            <p key={index} className="stat-drill-note text-xs leading-snug text-muted">
              {note}
            </p>
          ))}
          {stage.assumptions.length ? (
            <ul className={`damage-stage-assumptions ${CHIPS}`} aria-label="Conditions assumed">
              {stage.assumptions.map((tag) => (
                <li key={tag} className={CHIP}>
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
          {stage.feeders.length ? (
            <ol className="damage-feeders mt-0.5 grid list-none gap-0.5 p-0" aria-label="Sources feeding this bucket">
              {stage.feeders.map((row, index) => (
                <DamageSourceTooltip key={index} source={row.source} category={row.category}>
                  <li
                    className={`damage-feed ${FEED}`}
                    tabIndex={0}
                    data-damage-source={row.source}
                    style={row.share != null ? ({ "--share": row.share } as CSSProperties) : undefined}
                  >
                    <span className="damage-feed-name relative min-w-0 wrap-anywhere">
                      {row.source}
                      {row.text ? <small className="block text-xs leading-snug text-dim">{row.text}</small> : null}
                    </span>
                    <em className="damage-feed-tag relative justify-self-start rounded-sm border border-line px-1.5 py-px text-[10px] font-bold tracking-wide whitespace-nowrap text-muted uppercase not-italic max-[699px]:col-start-1 max-[699px]:mt-0.5">
                      {row.group}
                    </em>
                    <strong className="damage-feed-value relative min-w-14 justify-self-end text-right text-xs font-semibold whitespace-nowrap text-text tabular-nums max-[699px]:col-start-2 max-[699px]:row-span-2 max-[699px]:row-start-1">
                      {row.value}
                    </strong>
                  </li>
                </DamageSourceTooltip>
              ))}
            </ol>
          ) : null}
        </div>
      </details>
    </>
  );
}

function PathSection({ section }: { section: PathSectionView }) {
  const heading = (
    <h2 className={SUMMARY_HEADING}>
      {section.title}
      {section.subtitle ? (
        <>
          {" "}
          <small className={SUMMARY_HEADING_NOTE}>{section.subtitle}</small>
        </>
      ) : null}
    </h2>
  );
  if (section.empty)
    return (
      <section className="damage-path-section grid gap-2.5" aria-label={section.ariaLabel}>
        <header className={`stat-sheet-banner damage-path-summary-empty ${SUMMARY_CARD}`}>
          {heading}
          <p className={`damage-path-intro mt-1 ${INTRO}`}>{section.intro}</p>
        </header>
      </section>
    );
  const { hero } = section;
  return (
    <section className="damage-path-section grid gap-2.5" aria-label={section.ariaLabel}>
      <header className={`stat-sheet-banner ${SUMMARY_CARD}`}>
        {heading}
        <div className="grid gap-1 pt-1.5 pr-1 pb-1 compact:py-1 compact:pr-0">
          <span className="damage-path-hero-label text-xs font-bold tracking-widest text-muted uppercase">
            {hero.label}
          </span>
          <div className="damage-path-hero-figure flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-0.5">
            <NumberToggle
              id={hero.id}
              text={hero.value}
              className="damage-path-hero-value text-xl leading-tight font-bold tracking-tight text-accent-strong tabular-nums wrap-anywhere"
              unitClass="damage-path-hero-magnitude text-xs font-bold text-muted"
            />
            {hero.unit ? (
              <span className="damage-path-hero-unit text-xs font-bold tracking-wider text-muted uppercase">
                {hero.unit}
              </span>
            ) : null}
          </div>
          {hero.note ? (
            <small className="damage-path-hero-note text-xs leading-snug text-dim">{hero.note}</small>
          ) : null}
        </div>
        <ol
          className="damage-chain m-0 flex list-none flex-wrap items-stretch gap-x-1 gap-y-2 p-0"
          aria-label="How the stages combine"
        >
          {section.chain.map((chip, index) => (
            <li
              key={index}
              className={`damage-chain-stage ${chip.kind} ${stageColor(chip.kind)} ${CHAIN_OP} relative grid min-w-0 content-center gap-px rounded-sm border border-l-3 border-line border-l-(--stage-color) bg-raised px-2.5 py-1 max-[560px]:px-2 [&.result]:border-accent/50 [&.result]:border-l-accent [&.result]:bg-accent/10`}
              data-op={chip.op ?? undefined}
            >
              <span className="text-[10px] font-bold tracking-wider whitespace-nowrap text-dim uppercase">
                {chip.label}
              </span>
              <strong className="text-sm font-bold whitespace-nowrap text-text tabular-nums in-[.result]:text-accent">
                {chip.value}
                {chip.unit ? (
                  <small className="ml-1 text-[10px] font-bold tracking-wide text-muted">{chip.unit}</small>
                ) : null}
              </strong>
            </li>
          ))}
        </ol>
        {section.windows.length ? (
          <dl className={WINDOWS}>
            {section.windows.map((item, index) => (
              <div key={index} className={`${item.emphasis ? "emphasis " : ""}${WINDOW_TILE}`}>
                <dt className={WINDOW_LABEL}>{item.label}</dt>
                <dd className={WINDOW_VALUE}>
                  {item.value}
                  {item.note ? <small className={WINDOW_NOTE}>{item.note}</small> : null}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {section.assumed.length ? (
          <div className="damage-path-assumed flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-line pt-2">
            <span className="text-[10px] font-bold tracking-widest text-dim uppercase">Assumes</span>
            <ul className={CHIPS}>
              {section.assumed.map((tag) => (
                <li key={tag} className={CHIP}>
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </header>
      {section.illOmen ? <IllOmenCard card={section.illOmen} /> : null}
      {section.intro ? <p className={`damage-path-intro ${INTRO}`}>{section.intro}</p> : null}
      <div className="damage-path-stages grid w-full">
        {section.stages.map((stage, index) => (
          <Stage key={index} stage={stage} />
        ))}
      </div>
      {section.sections.map((item, index) => (
        <SectionRows key={index} section={item} />
      ))}
      {section.footnotes.length ? (
        <ExtraSection title="Notes" count={section.footnotes.length} open={false} className="damage-path-notes">
          {section.footnotes.map((note, index) => (
            <div key={index} className={`stat-sheet-row ${SHEET_ROW}`}>
              <span className="stat-row-label">{note}</span>
            </div>
          ))}
        </ExtraSection>
      ) : null}
    </section>
  );
}

function CopyQuestionsButton() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <button
      type="button"
      className={`button button-secondary open-questions-copy ${SECONDARY_BUTTON}`}
      onClick={async () => {
        if (!(await plannerCommands().copyOpenQuestions())) return;
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), COPIED_MS);
      }}
    >
      {copied ? "Copied" : "Copy questions"}
    </button>
  );
}

function OpenQuestions({ entries }: { entries: OpenQuestionView[] }) {
  if (!entries.length) return null;
  return (
    <ExtraSection title="Open questions" count={entries.length} open className="open-questions">
      <div className="open-questions-intro flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-line pt-1 pb-1.5">
        <p className="flex-[1_1_16rem] text-xs leading-normal text-muted">
          Interactions the planner isn&apos;t sure about for this build. In-game tests or corrections welcome.
        </p>
        <CopyQuestionsButton />
        <p className="open-questions-note flex-[1_1_100%] text-xs leading-normal text-dim">
          Answers are posted publicly on GitHub (free account needed). Include how you tested it.
        </p>
      </div>
      {entries.map((entry) => (
        <details key={entry.id} className={`stat-sheet-row open-question block ${SHEET_ROW_BOX}`}>
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <span className="open-question-title min-w-0 wrap-anywhere">{entry.title}</span>
            <b className="calc-coverage pending inline-block rounded-sm border border-warn/50 bg-warn/10 px-1.5 py-0.5 text-[10px] leading-snug font-bold whitespace-nowrap text-warn">
              {entry.evidence}
            </b>
          </summary>
          <div className="open-question-body mt-1.5 mb-1 grid gap-1 pl-3.5 leading-normal text-muted wrap-anywhere [&_strong]:whitespace-normal [&_strong]:text-text">
            <p>
              <strong>Question:</strong>
              {` ${entry.question}`}
            </p>
            <p>
              <strong>Planner now:</strong>
              {` ${entry.current}`}
            </p>
            <p>
              <strong>Alternatives:</strong>
            </p>
            <ul className="open-question-alternatives list-disc pl-4">
              {entry.alternatives.map((alt, index) => (
                <li key={index}>{`${alt.reading} — ${alt.effect}`}</li>
              ))}
            </ul>
            <p>
              <strong>How to test:</strong>
              {` ${entry.test}`}
            </p>
            <p className="open-question-source text-xs text-dim">{`Source: ${entry.source}`}</p>
            <p className="open-question-submit-row mt-0.5">
              <button
                type="button"
                className={`button button-secondary open-question-submit ${SECONDARY_BUTTON}`}
                onClick={() => plannerCommands().submitOpenQuestion(entry.id)}
              >
                Submit an answer
              </button>
            </p>
          </div>
        </details>
      ))}
    </ExtraSection>
  );
}

function PathTabs({ view }: { view: DamagePathView }) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const tab = (item: PathTabView, index: number) => {
    const selected = item.value === view.active;
    return (
      <button
        key={item.value}
        ref={(element) => {
          if (element) buttons.current.set(item.value, element);
          else buttons.current.delete(item.value);
        }}
        type="button"
        role="tab"
        id={`damage-path-tab-${item.value}`}
        aria-controls={`damage-path-view-${item.value}`}
        aria-selected={selected}
        tabIndex={selected ? 0 : -1}
        className={selected ? `active ${TAB}` : TAB}
        onClick={() => plannerCommands().selectDamagePath(item.value)}
        onKeyDown={(event) => {
          const next = tabKeyTarget(event.key, index, view.tabs.length);
          if (next === undefined) return;
          event.preventDefault();
          plannerCommands().selectDamagePath(view.tabs[next].value);
          buttons.current.get(view.tabs[next].value)?.focus();
        }}
      >
        {item.label}
        {item.figure ? <small className={TAB_COUNT}>{item.figure}</small> : null}
      </button>
    );
  };
  const groups = [...new Set(view.tabs.map((item) => item.group))];
  return (
    <div
      className="stat-panel-tabs panel flex flex-wrap items-stretch gap-x-1 px-2.5 max-[560px]:px-1.5"
      role="tablist"
      aria-label="Damage paths"
    >
      {view.grouped
        ? groups.map((group) => (
            <div
              key={group}
              className="damage-path-tab-group inline-flex flex-wrap items-stretch gap-x-1 [&+&]:ml-2 [&+&]:border-l [&+&]:border-line [&+&]:pl-2.5 max-[560px]:[&+&]:ml-0 max-[560px]:[&+&]:border-l-0 max-[560px]:[&+&]:pl-0"
              role="presentation"
            >
              {view.tabs.map((item, index) => (item.group === group ? tab(item, index) : null))}
            </div>
          ))
        : view.tabs.map(tab)}
    </div>
  );
}

export function DamagePath({ view }: { view: DamagePathView }) {
  return (
    <>
      <div className="stat-sheet-controls mb-5 flex items-center gap-3 text-sm leading-[normal] text-muted max-[560px]:flex-wrap compact:mb-2 compact:min-h-8 compact:pl-54.5">
        <ReportCalculationButton />
      </div>
      <div className="damage-path-panel grid gap-2.5 leading-[normal]">
        <PathTabs view={view} />
        {view.paths.map((path) => (
          <div
            key={path.value}
            className="damage-path-view grid gap-2.5"
            role="tabpanel"
            id={`damage-path-view-${path.value}`}
            aria-labelledby={`damage-path-tab-${path.value}`}
            data-damage-path-view={path.value}
            hidden={path.value !== view.active}
          >
            <PathSection section={path.section} />
          </div>
        ))}
        <OpenQuestions entries={view.openQuestions} />
      </div>
    </>
  );
}
