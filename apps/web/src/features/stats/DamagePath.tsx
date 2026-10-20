// The Stats view's Damage path panel: the report button, the build's damage paths as tabs (in per-skill groups when
// several skills deal damage), the open path's summary card (hero figure, chain of stage chips, windows, assumptions,
// the Ill Omen card), its stages with the sources feeding each, its extra sections and notes, and the open questions
// that apply to the build. The data is the planner's "stats" source (src/app/bridge/damage-path-view-model.ts); the
// path, the copy, the answer form and the report are planner commands. The legacy hover tooltip reads
// data-damage-source with data-damage-category, and the CSS draws each chain operator from data-op, so they stay.
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
    <details className={`stat-section damage-extra${className ? ` ${className}` : ""}`} open={open}>
      <summary>
        <span className="stat-section-title">{title}</span>
        <span className="stat-section-count">{count}</span>
      </summary>
      <div className="stat-section-body">{children}</div>
    </details>
  );
}

function SectionRows({ section }: { section: ExtraSectionView }) {
  return (
    <ExtraSection title={section.title} count={section.rows.length} open={section.open}>
      {section.rows.map((row, index) => (
        <div key={index} className="stat-sheet-row" title={row.title || undefined}>
          <span className="stat-row-label">{row.label}</span>
          <strong className="stat-row-value">
            {row.value}
            {row.detail ? <small>{row.detail}</small> : null}
          </strong>
        </div>
      ))}
    </ExtraSection>
  );
}

function IllOmenCard({ card }: { card: IllOmenCardView }) {
  return (
    <section className="damage-path-section ill-omen-card" aria-label="Ill Omen beyond the dummy">
      <header className="stat-sheet-banner damage-path-summary">
        <h2>
          Ill Omen (beyond the dummy) <small>{card.tag}</small>
        </h2>
        <p className="damage-path-intro">{card.subline}</p>
        <dl className="damage-path-windows">
          {card.tiles.map((tile) => (
            <div key={tile.key} className={tile.emphasis ? "emphasis" : undefined}>
              <dt>{tile.label}</dt>
              <dd>
                {tile.value}
                <small>{tile.explanation}</small>
              </dd>
            </div>
          ))}
        </dl>
        <p className="damage-path-footnote">{`Working: ${card.working}`}</p>
      </header>
    </section>
  );
}

function Stage({ stage }: { stage: StageView }) {
  return (
    <>
      {stage.connector ? (
        <div className={`damage-stage-link ${stage.kind}`} aria-hidden="true">
          <span>{stage.connector}</span>
        </div>
      ) : null}
      <details className={`stat-section damage-stage ${stage.kind}`} open={stage.open}>
        <summary>
          <span className="damage-stage-step">{stage.step}</span>
          <span className="damage-stage-head">
            <span className="stat-section-title">{stage.title}</span>
            {stage.math ? (
              <span className="damage-stage-math">{stage.math}</span>
            ) : (
              <span className="damage-stage-kind">{stage.action}</span>
            )}
          </span>
          <strong className="damage-stage-value">{stage.value}</strong>
          {stage.running ? (
            <span className="damage-stage-after">
              <span>{stage.running.label}</span>
              <strong title={stage.running.detail || undefined}>{stage.running.value}</strong>
              {stage.running.detail ? (
                <small className="damage-stage-after-detail" title={stage.running.detail}>
                  {stage.running.detail}
                </small>
              ) : null}
            </span>
          ) : null}
        </summary>
        <div className="stat-section-body">
          {stage.byOrigin ? <p className="damage-stage-origins">{stage.byOrigin}</p> : null}
          <p className="stat-drill-formula damage-stage-rule">{stage.rule}</p>
          {stage.notes.map((note, index) => (
            <p key={index} className="stat-drill-note">
              {note}
            </p>
          ))}
          {stage.assumptions.length ? (
            <ul className="damage-stage-assumptions" aria-label="Conditions assumed">
              {stage.assumptions.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          ) : null}
          {stage.feeders.length ? (
            <ol className="damage-feeders" aria-label="Sources feeding this bucket">
              {stage.feeders.map((row, index) => (
                <li
                  key={index}
                  className="damage-feed"
                  tabIndex={0}
                  data-damage-source={row.source}
                  data-damage-category={row.category}
                  style={row.share != null ? ({ "--share": row.share } as CSSProperties) : undefined}
                >
                  <span className="damage-feed-name">
                    {row.source}
                    {row.text ? <small>{row.text}</small> : null}
                  </span>
                  <em className="damage-feed-tag">{row.group}</em>
                  <strong className="damage-feed-value">{row.value}</strong>
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
    <h2>
      {section.title}
      {section.subtitle ? (
        <>
          {" "}
          <small>{section.subtitle}</small>
        </>
      ) : null}
    </h2>
  );
  if (section.empty)
    return (
      <section className="damage-path-section" aria-label={section.ariaLabel}>
        <header className="stat-sheet-banner damage-path-summary damage-path-summary-empty">
          {heading}
          <p className="damage-path-intro">{section.intro}</p>
        </header>
      </section>
    );
  const { hero } = section;
  return (
    <section className="damage-path-section" aria-label={section.ariaLabel}>
      <header className="stat-sheet-banner damage-path-summary">
        {heading}
        <div className="damage-path-hero">
          <span className="damage-path-hero-label">{hero.label}</span>
          <div className="damage-path-hero-figure">
            <NumberToggle
              id={hero.id}
              text={hero.value}
              className="damage-path-hero-value"
              unitClass="damage-path-hero-magnitude"
            />
            {hero.unit ? <span className="damage-path-hero-unit">{hero.unit}</span> : null}
          </div>
          {hero.note ? <small className="damage-path-hero-note">{hero.note}</small> : null}
        </div>
        <ol className="damage-chain" aria-label="How the stages combine">
          {section.chain.map((chip, index) => (
            <li key={index} className={`damage-chain-stage ${chip.kind}`} data-op={chip.op ?? undefined}>
              <span>{chip.label}</span>
              <strong>
                {chip.value}
                {chip.unit ? <small>{chip.unit}</small> : null}
              </strong>
            </li>
          ))}
        </ol>
        {section.windows.length ? (
          <dl className="damage-path-windows">
            {section.windows.map((item, index) => (
              <div key={index} className={item.emphasis ? "emphasis" : undefined}>
                <dt>{item.label}</dt>
                <dd>
                  {item.value}
                  {item.note ? <small>{item.note}</small> : null}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {section.assumed.length ? (
          <div className="damage-path-assumed">
            <span>Assumes</span>
            <ul>
              {section.assumed.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </header>
      {section.illOmen ? <IllOmenCard card={section.illOmen} /> : null}
      {section.intro ? <p className="damage-path-intro">{section.intro}</p> : null}
      <div className="damage-path-stages">
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
            <div key={index} className="stat-sheet-row">
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
      className="button button-secondary open-questions-copy"
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
      <div className="open-questions-intro">
        <p>Interactions the planner isn&apos;t sure about for this build. In-game tests or corrections welcome.</p>
        <CopyQuestionsButton />
        <p className="open-questions-note">
          Answers are posted publicly on GitHub (free account needed). Include how you tested it.
        </p>
      </div>
      {entries.map((entry) => (
        <details key={entry.id} className="stat-sheet-row open-question">
          <summary>
            <span className="open-question-title">{entry.title}</span>
            <b className="calc-coverage pending">{entry.evidence}</b>
          </summary>
          <div className="open-question-body">
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
            <ul className="open-question-alternatives">
              {entry.alternatives.map((alt, index) => (
                <li key={index}>{`${alt.reading} — ${alt.effect}`}</li>
              ))}
            </ul>
            <p>
              <strong>How to test:</strong>
              {` ${entry.test}`}
            </p>
            <p className="open-question-source">{`Source: ${entry.source}`}</p>
            <p className="open-question-submit-row">
              <button
                type="button"
                className="button button-secondary open-question-submit"
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
        className={selected ? "active" : undefined}
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
        {item.figure ? <small>{item.figure}</small> : null}
      </button>
    );
  };
  const groups = [...new Set(view.tabs.map((item) => item.group))];
  return (
    <div className="damage-path-tabs stat-panel-tabs" role="tablist" aria-label="Damage paths">
      {view.grouped
        ? groups.map((group) => (
            <div key={group} className="damage-path-tab-group" role="presentation">
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
      <div className="stat-sheet-controls damage-path-controls">
        <ReportCalculationButton />
      </div>
      <div className="damage-path-panel">
        <PathTabs view={view} />
        {view.paths.map((path) => (
          <div
            key={path.value}
            className="damage-path-view"
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
