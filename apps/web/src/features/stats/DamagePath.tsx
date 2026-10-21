// The Stats view's Damage path panel: the report button, the build's damage paths as tabs (in per-skill groups when
// several skills deal damage), the open path's summary card (hero figure, chain of stage chips, windows, assumptions,
// the Ill Omen card), its stages with the sources feeding each, its extra sections and notes, and the open questions
// that apply to the build. The data is the planner's "stats" source (src/app/bridge/damage-path-view-model.ts); the
// path, the copy, the answer form and the report are planner commands. The legacy hover tooltip reads
// data-damage-source with data-damage-category; each chain chip draws its operator from data-op.
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
import { NumberToggle } from "./NumberToggle";
import { ReportCalculationButton } from "./StatSheet";
import { tabKeyTarget } from "./tab-keys";

const COPIED_MS = 1600;

// Each stage kind's colour (a chain chip, a stage card's left edge, its feeders' bars); slate grey for the rest.
const STAGE_COLORS: Record<string, string> = {
  base: "[--stage-color:#e9a362]",
  add: "[--stage-color:#6fb7d2]",
  sum: "[--stage-color:#6fb7d2]",
  multiply: "[--stage-color:#9c8ac6]",
  target: "[--stage-color:#c97c70]",
  stacks: "[--stage-color:#7fc9a5]",
};
const stageColor = (kind: string) => STAGE_COLORS[kind] ?? "[--stage-color:#8fa1b0]";

// A collapsible card (a stage, an extra section) and its header strip. The header's ember chevron (its ::before)
// points down while the card is open, right while closed; a closed header rounds all its corners.
const SECTION_CARD = "group/section m-0 rounded border border-white/8 bg-[#18232e]";
const SECTION_SUMMARY =
  "cursor-pointer list-none rounded bg-[#303c49] font-serif text-[0.8rem] tracking-[0.05em] text-[#f1f5f8] uppercase group-open/section:rounded-b-none hover:text-[#ffd39b] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ffbd82] [&::-webkit-details-marker]:hidden before:mr-[0.15rem] before:size-[0.38rem] before:flex-none before:-rotate-45 before:border-r-2 before:border-b-2 before:border-[#ffbd82] before:transition-transform before:duration-150 before:content-[''] group-open/section:before:-mt-[0.2rem] group-open/section:before:rotate-45";
// The summary card of a path (and of the Ill Omen card) with its heading strip.
const SUMMARY_CARD =
  "m-0 grid gap-[0.55rem] overflow-hidden rounded border-l-3 border-[#db9850] bg-[#222e3b] px-3.5 pb-3 max-[560px]:px-2.5 max-[560px]:pb-2.5 compact:gap-[0.4rem] compact:pb-2";
const SUMMARY_HEADING =
  "-mx-3.5 mb-[0.1rem] bg-[#303c49] px-3.5 py-[7px] font-serif text-[0.78rem] font-semibold tracking-[0.05em] text-[#f1f5f8] uppercase max-[560px]:-mx-2.5 max-[560px]:px-2.5 compact:py-1.5";
const SUMMARY_HEADING_NOTE =
  "ml-[0.4rem] font-sans text-[0.68rem] font-normal tracking-[0.02em] text-[#a9bac8] normal-case";
const INTRO = "text-[0.76rem] leading-normal text-[#b7c3cd]";
// The windows: one tile per figure, the emphasised one in bronze.
const WINDOWS = "m-0 flex flex-wrap gap-x-[0.45rem] gap-y-[0.4rem]";
const WINDOW_TILE =
  "grid min-w-0 flex-[1_1_150px] gap-[0.1rem] rounded-[3px] border border-white/8 bg-[#1a2531] px-2.5 py-1.5 compact:px-2 compact:py-1 [&.emphasis]:border-[#a6773666] [&.emphasis]:bg-[#2d241a]";
const WINDOW_LABEL = "text-[0.58rem] font-bold tracking-[0.07em] text-[#a9bac8] uppercase";
const WINDOW_VALUE = "m-0 grid text-[0.84rem] font-bold text-[#f3e3cf] tabular-nums wrap-anywhere";
const WINDOW_NOTE = "text-[0.6rem] leading-[1.35] font-normal text-[#8ea0ad]";
// The pale gold pills of an assumed condition.
const CHIPS = "m-0 flex list-none flex-wrap gap-[0.28rem] p-0";
const CHIP =
  "rounded-full border border-[#d9c27a55] px-[0.45rem] py-[0.1rem] text-[0.62rem] leading-[1.35] text-[#e8d9a4]";
// A row of the stat sheet: label on the left, value on the right, a hairline between rows.
const SHEET_ROW_BOX = "border-b border-[#ffffff16] py-[0.28rem] text-[0.74rem] text-[#bfcbd5] last:border-b-0";
const SHEET_ROW = `flex justify-between gap-[0.6rem] ${SHEET_ROW_BOX}`;
const SECONDARY_BUTTON =
  "inline-block flex-none cursor-pointer rounded-[3px] border border-[#3a4352] bg-[#151a23] px-2.5 py-[5px] text-[0.62rem] font-bold tracking-[0.06em] text-[#d8dde3] uppercase clip-chamfer-7 hover:border-[#bd6a32] hover:text-[#ffab61] focus-visible:border-[#bd6a32] focus-visible:text-[#ffab61] focus-visible:outline-none";

// Between two stages: an ember line down the middle, the operation's pill on it, an arrowhead at the bottom.
const STAGE_LINK =
  "relative flex items-center justify-center pt-2 pb-4.5 compact:pt-1.5 compact:pb-4 before:absolute before:inset-y-0 before:left-[calc(50%-1px)] before:border-l-2 before:border-ember/60 before:content-[''] after:absolute after:bottom-[3px] after:left-[calc(50%-7px)] after:size-3 after:rotate-45 after:border-r-2 after:border-b-2 after:border-ember after:content-['']";
// A stage's header: the step number, the title with its formula, then the stage's figure over the running value. The
// chevron is auto-placed: under the figure when the stage has no running value, else under the step. On a narrow
// window the figure and the running value drop under the title.
const STAGE_HEADER =
  "grid grid-cols-[auto_minmax(0,380px)_minmax(0,1fr)] items-center gap-x-[0.6rem] gap-y-[0.1rem] px-3 py-[0.45rem] [grid-template-areas:'step_head_value'_'step_head_after'] max-[699px]:grid-cols-[auto_minmax(0,1fr)] max-[699px]:[grid-template-areas:'step_head'_'step_value'_'step_after'] max-[560px]:px-2 max-[560px]:py-[0.4rem] compact:px-2.5 compact:py-[0.35rem]";
// A feeder row: its share of the bucket as a faint bar in the stage colour (--share), a coloured left edge.
const FEED =
  "relative grid cursor-default grid-cols-[minmax(0,380px)_96px_130px] items-center justify-start gap-x-[0.55rem] overflow-hidden rounded-[2px] bg-[#15202b] py-1 pr-2 pl-2.5 text-[0.7rem] leading-[1.35] text-[#c9d4dc] hover:bg-[#1c2a37] hover:outline hover:outline-offset-1 hover:outline-[#b8955266] focus-visible:bg-[#1c2a37] focus-visible:outline focus-visible:outline-offset-1 focus-visible:outline-[#b8955266] max-[699px]:grid-cols-[minmax(0,1fr)_auto] max-[699px]:gap-x-[0.4rem] max-[560px]:pr-1.5 max-[560px]:pl-2 compact:py-0.5 before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-[var(--share,0%)] before:bg-[linear-gradient(90deg,var(--stage-color),transparent)] before:opacity-18 before:content-[''] after:absolute after:inset-y-0 after:left-0 after:w-0.5 after:bg-(--stage-color) after:opacity-60 after:content-['']";
// A chain chip's operator (×, =, +) drawn in the gap before it, from its data-op.
const CHAIN_OP =
  "data-op:ml-[1.05rem] data-op:before:absolute data-op:before:top-1/2 data-op:before:-left-[1.15rem] data-op:before:w-[1.1rem] data-op:before:-translate-y-1/2 data-op:before:text-center data-op:before:text-[0.82rem] data-op:before:font-bold data-op:before:text-[#8ea0ad] data-op:before:content-[attr(data-op)]";

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
    <details className={`stat-section${className ? ` ${className}` : ""} ${SECTION_CARD} mt-[0.6rem]`} open={open}>
      <summary className={`${SECTION_SUMMARY} flex items-center gap-2 px-3 py-2`}>
        <span className="stat-section-title min-w-0">{title}</span>
        <span className="stat-section-count ml-auto font-sans text-[0.62rem] tracking-[0.04em] text-[#8ea0ad] tabular-nums">
          {count}
        </span>
      </summary>
      <div className="stat-section-body px-3 pt-[0.15rem] pb-[0.35rem]">{children}</div>
    </details>
  );
}

function SectionRows({ section }: { section: ExtraSectionView }) {
  return (
    <ExtraSection title={section.title} count={section.rows.length} open={section.open}>
      {section.rows.map((row, index) => (
        <div key={index} className={`stat-sheet-row ${SHEET_ROW}`} title={row.title || undefined}>
          <span className="stat-row-label">{row.label}</span>
          <strong className="stat-row-value text-right whitespace-nowrap text-[#e9f4ff] max-[560px]:whitespace-normal max-[560px]:wrap-anywhere">
            {row.value}
            {row.detail ? <small className="text-[length:smaller]">{row.detail}</small> : null}
          </strong>
        </div>
      ))}
    </ExtraSection>
  );
}

function IllOmenCard({ card }: { card: IllOmenCardView }) {
  return (
    <section className="damage-path-section ill-omen-card grid gap-[0.6rem]" aria-label="Ill Omen beyond the dummy">
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
        <p className="damage-path-footnote mt-[0.6rem] text-[0.7rem] leading-normal text-[#91a2ae]">{`Working: ${card.working}`}</p>
      </header>
    </section>
  );
}

function Stage({ stage }: { stage: StageView }) {
  return (
    <>
      {stage.connector ? (
        <div className={STAGE_LINK} aria-hidden="true">
          <span className="relative rounded-full border border-ember bg-[#2a2015] px-3 py-1 text-[0.8rem] leading-[1.3] font-bold tracking-[0.06em] whitespace-nowrap text-[#ffbd82] uppercase">
            {stage.connector}
          </span>
        </div>
      ) : null}
      <details
        className={`stat-section damage-stage ${stage.kind} ${stageColor(stage.kind)} ${SECTION_CARD} border-l-3 border-l-(--stage-color)`}
        open={stage.open}
      >
        <summary className={`${SECTION_SUMMARY} ${STAGE_HEADER}`}>
          <span className="damage-stage-step mt-[0.1rem] self-start font-sans text-[0.62rem] tracking-[0.06em] text-[#8ea0ad] tabular-nums [grid-area:step]">
            {stage.step}
          </span>
          <span className="damage-stage-head grid min-w-0 gap-[0.12rem] [grid-area:head]">
            <span className="stat-section-title min-w-0 wrap-anywhere">{stage.title}</span>
            {stage.math ? (
              <span className="damage-stage-math font-sans text-[0.64rem] tracking-[0.02em] text-[#dbe6ee] normal-case tabular-nums wrap-anywhere">
                {stage.math}
              </span>
            ) : (
              <span className="damage-stage-kind font-sans text-[0.64rem] tracking-[0.02em] text-[#a9bac8] normal-case wrap-anywhere">
                {stage.action}
              </span>
            )}
          </span>
          <strong className="damage-stage-value min-w-0 justify-self-start text-left font-sans text-[0.92rem] tracking-normal text-[#ffd39b] normal-case tabular-nums wrap-anywhere [grid-area:value]">
            {stage.value}
          </strong>
          {stage.running ? (
            <span className="damage-stage-after grid min-w-0 gap-[0.05rem] justify-self-stretch text-left font-sans text-[0.68rem] tracking-normal normal-case [grid-area:after]">
              <span className="text-[0.56rem] font-bold tracking-[0.07em] text-[#8fa1b0] uppercase">
                {stage.running.label}
              </span>
              <strong
                className="text-[1.15rem] leading-[1.2] font-bold text-[#ffbd82] tabular-nums wrap-anywhere"
                title={stage.running.detail || undefined}
              >
                {stage.running.value}
              </strong>
              {stage.running.detail ? (
                <small
                  className="damage-stage-after-detail min-w-0 truncate text-[0.64rem] leading-[1.35] text-[#8ea0ad]"
                  title={stage.running.detail}
                >
                  {stage.running.detail}
                </small>
              ) : null}
            </span>
          ) : null}
        </summary>
        <div className="stat-section-body grid gap-[0.35rem] px-3 py-2 max-[560px]:px-2 compact:px-2.5 compact:py-1.5">
          {stage.byOrigin ? (
            <p className="damage-stage-origins text-[0.66rem] leading-[1.4] font-bold tracking-[0.02em] text-[#ffd39b]">
              {stage.byOrigin}
            </p>
          ) : null}
          <p className="stat-drill-formula damage-stage-rule text-[0.7rem] leading-[1.45] text-[#b7c3cd]">
            {stage.rule}
          </p>
          {stage.notes.map((note, index) => (
            <p key={index} className="stat-drill-note text-[0.66rem] leading-[1.4] text-[#a9bac8]">
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
            <ol
              className="damage-feeders mt-[0.1rem] grid list-none gap-0.5 p-0"
              aria-label="Sources feeding this bucket"
            >
              {stage.feeders.map((row, index) => (
                <li
                  key={index}
                  className={`damage-feed ${FEED}`}
                  tabIndex={0}
                  data-damage-source={row.source}
                  data-damage-category={row.category}
                  style={row.share != null ? ({ "--share": row.share } as CSSProperties) : undefined}
                >
                  <span className="damage-feed-name relative min-w-0 wrap-anywhere">
                    {row.source}
                    {row.text ? (
                      <small className="block text-[0.62rem] leading-[1.35] text-[#8ea0ad]">{row.text}</small>
                    ) : null}
                  </span>
                  <em className="damage-feed-tag relative justify-self-start rounded-[3px] border border-white/10 px-[0.35rem] py-[0.04rem] text-[0.56rem] font-bold tracking-[0.05em] whitespace-nowrap text-[#9fb0bd] uppercase not-italic max-[699px]:col-start-1 max-[699px]:mt-[0.1rem]">
                    {row.group}
                  </em>
                  <strong className="damage-feed-value relative min-w-14 justify-self-end text-right text-[0.72rem] font-semibold whitespace-nowrap text-[#eaf3f9] tabular-nums max-[699px]:col-start-2 max-[699px]:row-span-2 max-[699px]:row-start-1">
                    {row.value}
                  </strong>
                </li>
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
      <section className="damage-path-section grid gap-[0.6rem]" aria-label={section.ariaLabel}>
        <header className={`stat-sheet-banner damage-path-summary-empty ${SUMMARY_CARD}`}>
          {heading}
          <p className={`damage-path-intro mt-[0.2rem] ${INTRO}`}>{section.intro}</p>
        </header>
      </section>
    );
  const { hero } = section;
  return (
    <section className="damage-path-section grid gap-[0.6rem]" aria-label={section.ariaLabel}>
      <header className={`stat-sheet-banner ${SUMMARY_CARD}`}>
        {heading}
        <div className="grid gap-[0.2rem] pt-1.5 pr-1 pb-1 compact:py-1 compact:pr-0">
          <span className="damage-path-hero-label text-[0.75rem] leading-[1.45] font-bold tracking-[0.09em] text-[#a8c3c0] uppercase">
            {hero.label}
          </span>
          <div className="damage-path-hero-figure flex flex-wrap items-baseline gap-x-2 gap-y-[0.1rem] bg-[radial-gradient(ellipse_60%_140%_at_0%_55%,rgb(219_152_80/0.2),transparent_75%)] py-[0.15rem]">
            <NumberToggle
              id={hero.id}
              text={hero.value}
              className="damage-path-hero-value text-[1.15rem] leading-[1.1] font-bold tracking-[-0.01em] text-[#ffbd82] tabular-nums wrap-anywhere text-shadow-[0_0_18px_rgb(255_160_80/0.22)]"
              unitClass="damage-path-hero-magnitude text-[0.75rem] leading-[1.45] font-bold text-[#a8c3c0]"
            />
            {hero.unit ? (
              <span className="damage-path-hero-unit text-[0.75rem] leading-[1.45] font-bold tracking-[0.07em] text-[#a8c3c0] uppercase">
                {hero.unit}
              </span>
            ) : null}
          </div>
          {hero.note ? (
            <small className="damage-path-hero-note text-[0.7rem] leading-[1.4] text-[#91a2ae]">{hero.note}</small>
          ) : null}
        </div>
        <ol
          className="damage-chain m-0 flex list-none flex-wrap items-stretch gap-x-[0.3rem] gap-y-[0.45rem] p-0"
          aria-label="How the stages combine"
        >
          {section.chain.map((chip, index) => (
            <li
              key={index}
              className={`damage-chain-stage ${chip.kind} ${stageColor(chip.kind)} ${CHAIN_OP} relative grid min-w-0 content-center gap-[0.08rem] rounded-[3px] border border-l-3 border-white/10 border-l-(--stage-color) bg-[#18232e] px-[0.6rem] py-[0.32rem] max-[560px]:px-[0.45rem] max-[560px]:py-[0.28rem] [&.result]:border-bronze [&.result]:border-l-[#ffbd82] [&.result]:bg-[#2d241a]`}
              data-op={chip.op ?? undefined}
            >
              <span className="text-[0.56rem] leading-[1.45] font-bold tracking-[0.07em] whitespace-nowrap text-[#8fa1b0] uppercase">
                {chip.label}
              </span>
              <strong className="text-[0.8rem] font-bold whitespace-nowrap text-[#e9f4ff] tabular-nums in-[.result]:text-[#ffd39b]">
                {chip.value}
                {chip.unit ? (
                  <small className="ml-1 text-[0.58rem] font-bold tracking-[0.04em] text-[#a9bac8]">{chip.unit}</small>
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
          <div className="damage-path-assumed flex flex-wrap items-baseline gap-x-2 gap-y-[0.3rem] border-t border-white/7 pt-[0.45rem]">
            <span className="text-[0.6rem] leading-[1.45] font-bold tracking-[0.08em] text-[#8fa1b0] uppercase">
              Assumes
            </span>
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
      <div className="open-questions-intro flex flex-wrap items-center justify-between gap-x-3 gap-y-[0.35rem] border-b border-white/7 pt-[0.3rem] pb-[0.4rem]">
        <p className="flex-[1_1_16rem] text-[0.74rem] leading-normal text-[#b7c3cd]">
          Interactions the planner isn&apos;t sure about for this build. In-game tests or corrections welcome.
        </p>
        <CopyQuestionsButton />
        <p className="open-questions-note flex-[1_1_100%] text-[0.7rem] leading-normal text-[#91a2ae]">
          Answers are posted publicly on GitHub (free account needed). Include how you tested it.
        </p>
      </div>
      {entries.map((entry) => (
        <details key={entry.id} className={`stat-sheet-row open-question block ${SHEET_ROW_BOX}`}>
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 hover:text-[#ffd39b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffbd82]">
            <span className="open-question-title min-w-0 wrap-anywhere">{entry.title}</span>
            <b className="calc-coverage pending inline-block rounded border border-[#8a6f51] bg-[#382b20] px-1.5 py-0.5 font-[Arial,sans-serif] text-[10px] leading-[1.3] font-bold whitespace-nowrap text-[#f2c58d]">
              {entry.evidence}
            </b>
          </summary>
          <div className="open-question-body mt-[0.35rem] mb-[0.2rem] grid gap-[0.3rem] pl-[0.85rem] leading-normal text-[#b7c3cd] wrap-anywhere [&_strong]:whitespace-normal [&_strong]:text-[#bcd5e4]">
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
            <ul className="open-question-alternatives list-disc pl-[1.1rem]">
              {entry.alternatives.map((alt, index) => (
                <li key={index}>{`${alt.reading} — ${alt.effect}`}</li>
              ))}
            </ul>
            <p>
              <strong>How to test:</strong>
              {` ${entry.test}`}
            </p>
            <p className="open-question-source text-[0.7rem] text-[#91a2ae]">{`Source: ${entry.source}`}</p>
            <p className="open-question-submit-row mt-[0.15rem]">
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

const PATH_TAB =
  "group relative inline-flex cursor-pointer items-baseline gap-[0.4rem] px-[0.6rem] py-[0.65rem] text-[0.72rem] font-bold tracking-[0.06em] text-[#a9bac8] uppercase hover:text-[#dcebf5] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ffbd82] chosen:text-[#fff3e2] chosen:after:absolute chosen:after:inset-x-0 chosen:after:-bottom-px chosen:after:h-0.5 chosen:after:bg-[linear-gradient(90deg,#ffbd82,#db9850)] chosen:after:shadow-[0_0_8px_rgb(219_152_80/0.55)] chosen:after:content-[''] max-[560px]:px-[0.45rem] max-[560px]:py-[0.55rem] max-[560px]:text-[0.66rem]";
const PATH_TAB_FIGURE =
  "rounded-[3px] border border-white/10 px-[0.38rem] py-[0.08rem] text-[0.6rem] tracking-normal text-[#8ea0ad] tabular-nums group-chosen:border-bronze group-chosen:bg-[#2d241a] group-chosen:text-[#ffd39b]";

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
        className={selected ? `active ${PATH_TAB}` : PATH_TAB}
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
        {item.figure ? <small className={PATH_TAB_FIGURE}>{item.figure}</small> : null}
      </button>
    );
  };
  const groups = [...new Set(view.tabs.map((item) => item.group))];
  return (
    <div
      className="stat-panel-tabs flex flex-wrap items-stretch gap-x-1 rounded-[5px] border border-[#3b4a59] bg-[#1b2531] px-2.5 max-[560px]:px-1.5"
      role="tablist"
      aria-label="Damage paths"
    >
      {view.grouped
        ? groups.map((group) => (
            <div
              key={group}
              className="damage-path-tab-group inline-flex flex-wrap items-stretch gap-x-1 [&+&]:ml-2 [&+&]:border-l [&+&]:border-white/8 [&+&]:pl-[0.6rem] max-[560px]:[&+&]:ml-0 max-[560px]:[&+&]:border-l-0 max-[560px]:[&+&]:pl-0"
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
      <div className="stat-sheet-controls mb-5 flex items-center gap-[0.7rem] compact:mb-2 compact:min-h-8 compact:pl-[218px] text-[0.82rem] leading-[normal] text-[#b9c8d3] max-[560px]:flex-wrap">
        <ReportCalculationButton />
      </div>
      <div className="damage-path-panel grid gap-[0.6rem] leading-[normal]">
        <PathTabs view={view} />
        {view.paths.map((path) => (
          <div
            key={path.value}
            className="damage-path-view grid gap-[0.6rem]"
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
