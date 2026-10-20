// What the Stats view's Damage path panel shows (apps/web/src/features/stats/DamagePath.tsx): the build's damage paths
// as tabs (in per-skill groups when several skills deal damage), each path's summary card (hero figure, chain of stage
// chips, windows, assumptions, the Ill Omen card), its stages with the sources feeding each, its extra sections and
// notes, and the open questions that apply to the build. The path models are src/app/stats/damage-path-panel.js
// damagePathModels; this arranges them as the view draws them. src/app/app.js publishes it inside the "stats" source
// (src/app/bridge/stats-view-model.ts). Every text is as the legacy markup printed it (displayTexts). Pure.
import { damagePathModels, sourceNames } from "../stats/damage-path-panel.js";
import {
  STAGE_KINDS,
  chipFor,
  compactNumber,
  compactRange,
  connectorLabel,
  illOmenCard,
  rankedFeeders,
  stageArithmetic,
  stageAssumptions,
  stageEmpty,
  wholeFormat,
} from "../stats/damage-path-views.js";
import { openQuestionsFor } from "../stats/open-questions.js";
import { formatShortNumber } from "../../engine/text/number-format.js";
import { numberText, type NumberText } from "../stats/number-text.ts";
import { displayTexts } from "./display-text.ts";

export interface PathTabView {
  /** The path's key ("hit:game-log-skill-1", "minion:thunder-magus", "combined"). */
  value: string;
  label: string;
  /** Its figure in short form ("1.63 B"); "" for a path with nothing to show. */
  figure: string;
  group: string;
}
export interface FeederView {
  source: string;
  text: string;
  category: string;
  /** Where the line comes from ("Gear", "Talent" …). */
  group: string;
  value: string;
  /** Its share of the bucket ("12.3%"); null for a line without a numeric value. */
  share: string | null;
}
export interface StageView {
  /** What this stage does to the running value ("× multiplied"); "" for the first stage. */
  connector: string;
  /** "base", "add", "multiply", "info", "target", "stacks", "sum". */
  kind: string;
  /** "01" */
  step: string;
  title: string;
  /** The bucket's arithmetic ("1 + 513% + 18% = ×6.31"); "" when it has none (`action` shows instead). */
  math: string;
  action: string;
  value: string;
  /** The value after the stage; null when it only repeats the stage's own figure. */
  running: { label: string; value: string; detail: string } | null;
  open: boolean;
  /** The per-origin summary ("Talent +513% · Pactspirit +18%"); "" for none. */
  byOrigin: string;
  rule: string;
  notes: string[];
  assumptions: string[];
  feeders: FeederView[];
}
export interface ChainChipView {
  kind: string;
  /** The chain operator before it; null for the base chip. */
  op: string | null;
  label: string;
  value: string;
  /** The result chip's unit ("DPS"); "" otherwise. */
  unit: string;
  result: boolean;
}
export interface ExtraSectionView {
  title: string;
  open: boolean;
  rows: { label: string; value: string; detail: string; title: string }[];
}
export interface IllOmenCardView {
  tag: string;
  subline: string;
  tiles: { key: string; label: string; value: string; explanation: string; emphasis: boolean }[];
  working: string;
}
interface PathHead {
  title: string;
  subtitle: string;
  ariaLabel: string;
  intro: string;
}
export type PathSectionView =
  | (PathHead & { empty: true })
  | (PathHead & {
      empty: false;
      hero: { label: string; id: string; value: NumberText; unit: string; note: string };
      chain: ChainChipView[];
      windows: { label: string; value: string; note: string; emphasis: boolean }[];
      assumed: string[];
      illOmen: IllOmenCardView | null;
      stages: StageView[];
      sections: ExtraSectionView[];
      /** The Notes section's rows; empty for none. */
      footnotes: string[];
    });
export interface OpenQuestionView {
  id: string;
  title: string;
  evidence: string;
  question: string;
  current: string;
  alternatives: { reading: string; effect: string }[];
  test: string;
  source: string;
}
export interface PreparedDamagePath {
  tabs: PathTabView[];
  /** Whether the tabs sit in per-skill groups (several skills deal damage). */
  grouped: boolean;
  paths: { value: string; section: PathSectionView }[];
  openQuestions: OpenQuestionView[];
}
export interface DamagePathView extends PreparedDamagePath {
  /** The open path's key: the picked one when the build has it, else the first. */
  active: string;
}

type Format = (value: number) => string;
type SourceNames = ReturnType<typeof sourceNames>;
type Range = number | { min: number; max: number };
// A path model of src/app/stats/damage-path-panel.js / damage-path-views.js (as read here).
interface Stage {
  key?: string;
  kind: string;
  title: string;
  action?: string;
  value?: string;
  rule?: string;
  notes?: string[];
  running?: string | { value: string; detail: string };
}
interface PathModel {
  title: string;
  subtitle?: string;
  ariaLabel?: string;
  intro?: string;
  empty?: boolean;
  chainOp?: string;
  final: {
    label: string;
    raw: Range;
    unit?: string;
    note?: string;
    text?: string;
    compact?: string;
    chainLabel?: string;
  };
  stages: Stage[];
  windows?: ({ label: string; value?: string | null; note?: string; emphasis?: boolean } | null)[];
  assumptions?: string[];
  sections?: {
    title: string;
    open?: boolean;
    rows: { label: string; value: string; detail?: string; title?: string }[];
  }[];
  footnotes?: string[];
  illOmen?: unknown;
}
interface PathOption {
  value: string;
  label: string;
  group: string;
  model: PathModel;
}

const isRange = (raw: Range): raw is { min: number; max: number } => Boolean(raw && typeof raw === "object");

// Large figures are truncated ("21.84 Trillion") and open to the full integer on click; a preset `final.text` is shown as
// given.
function heroFigure(final: PathModel["final"], format: Format): NumberText {
  const raw = final.raw;
  const whole = wholeFormat(format);
  const range = isRange(raw) && !(Math.abs(raw.min - raw.max) < 1e-9);
  const single = isRange(raw) ? raw.max : raw;
  const full = final.text || (range && isRange(raw) ? `${whole(raw.min)}–${whole(raw.max)}` : whole(single));
  const short =
    final.text ||
    (range && isRange(raw)
      ? `${formatShortNumber(raw.min)}–${formatShortNumber(raw.max)}`
      : Number.isFinite(single) && Math.abs(single) >= 1000
        ? formatShortNumber(single)
        : full);
  return short === full ? { full, short: null } : numberText(single, { short, full });
}

function stageView(
  stage: Stage,
  index: number,
  { model, planner, format, names }: { model: PathModel; planner: unknown; format: Format; names: SourceNames },
): StageView {
  const kind = STAGE_KINDS[stage.kind as keyof typeof STAGE_KINDS] || STAGE_KINDS.multiply;
  const { math, byOrigin } = stageArithmetic(stage, { names, format });
  const runningValue = stage.running && typeof stage.running === "object" ? stage.running.value : stage.running;
  const runningDetail = stage.running && typeof stage.running === "object" ? stage.running.detail : "";
  return {
    connector: index ? connectorLabel(stage, model) : "",
    kind: stage.kind,
    step: String(index + 1).padStart(2, "0"),
    title: stage.title,
    math,
    action: stage.action || kind.label,
    value: stage.value ?? "",
    running:
      runningValue && runningValue !== stage.value
        ? {
            label: stage.kind === "base" ? "Starting value" : "Running value",
            value: runningValue,
            detail: runningDetail,
          }
        : null,
    open: stage.kind !== "info",
    byOrigin,
    rule: stage.rule || "",
    notes: stage.notes || [],
    assumptions: stageAssumptions(stage, planner),
    feeders: (
      rankedFeeders(stage, { names }) as {
        source: string;
        text: string;
        category: string;
        group: string;
        value: string;
        share: number | null;
      }[]
    ).map((row) => ({
      source: row.source,
      text: row.text,
      category: row.category,
      group: row.group,
      value: row.value,
      share: row.share != null ? `${(row.share * 100).toFixed(1)}%` : null,
    })),
  };
}

function sectionView(
  model: PathModel,
  { planner, format, names }: { planner: unknown; format: Format; names: SourceNames },
) {
  const head = {
    title: model.title,
    subtitle: model.subtitle || "",
    ariaLabel: model.ariaLabel || "",
    intro: model.intro || "",
  };
  if (model.empty) return { ...head, ariaLabel: model.ariaLabel || model.title, empty: true as const };
  const stages = model.stages.filter((stage) => !stageEmpty(stage));
  const stageAssumed = new Set(stages.flatMap((stage) => stageAssumptions(stage, planner)));
  const chainStages = model.stages.filter((stage) => !stageEmpty(stage) && stage.kind !== "info");
  return {
    ...head,
    ariaLabel: model.ariaLabel || `${model.title} calculation`,
    empty: false as const,
    hero: {
      label: model.final.label,
      id: `path:${model.title}:${model.final.label}`,
      value: heroFigure(model.final, format),
      unit: model.final.unit || "",
      note: model.final.note || "",
    },
    chain: [
      ...chainStages.map((stage) => ({
        kind: stage.kind,
        op:
          stage.kind === "base"
            ? null
            : (stage as { op?: string }).op ||
              model.chainOp ||
              STAGE_KINDS[stage.kind as keyof typeof STAGE_KINDS]?.op ||
              "×",
        label: (stage as { chainLabel?: string }).chainLabel || stage.title,
        value: String(chipFor(stage, format)),
        unit: "",
        result: false,
      })),
      {
        kind: "result",
        op: "=",
        label: model.final.chainLabel || "Result",
        value: model.final.compact || compactRange(model.final.raw, format),
        unit: model.final.unit || "",
        result: true,
      },
    ],
    windows: (model.windows || [])
      .filter((item): item is NonNullable<typeof item> => Boolean(item && item.value != null && item.value !== ""))
      .map((item) => ({
        label: item.label,
        value: String(item.value),
        note: item.note || "",
        emphasis: Boolean(item.emphasis),
      })),
    assumed: [...new Set([...(model.assumptions || []), ...stageAssumed])],
    illOmen: illOmenCard(model.illOmen, { format }) as IllOmenCardView | null,
    stages: stages.map((stage, index) => stageView(stage, index, { model, planner, format, names })),
    sections: (model.sections || []).map((section) => ({
      title: section.title,
      open: Boolean(section.open),
      rows: section.rows.map((row) => ({
        label: row.label,
        value: row.value,
        detail: row.detail || "",
        title: row.title || "",
      })),
    })),
    footnotes: (model.footnotes || []).filter(Boolean),
  };
}

const tabFigure = (model: PathModel, format: Format) =>
  model.empty ? "" : compactNumber(isRange(model.final.raw) ? model.final.raw.max : model.final.raw, format);

/**
 * The Damage path panel of `planner` (a calculated build); `theoretical` is the same build's result at 30% target Fire
 * Resistance, which the Ignite and legacy Reaping paths read.
 */
export function prepareDamagePath(
  theoretical: unknown,
  planner: { state?: unknown },
  format: Format,
): PreparedDamagePath {
  const paths = damagePathModels(theoretical, planner, { format }) as PathOption[];
  const names = sourceNames(planner);
  const groups = [...new Set(paths.map((path) => path.group))];
  return displayTexts({
    tabs: paths.map((path) => ({
      value: path.value,
      label: path.label,
      figure: tabFigure(path.model, format),
      group: path.group,
    })),
    grouped: groups.length > 2 || (groups.length === 2 && !groups.includes("Build")),
    paths: paths.map((path) => ({
      value: path.value,
      section: sectionView(path.model, { planner, format, names }) as PathSectionView,
    })),
    openQuestions: (openQuestionsFor(planner, planner.state) as OpenQuestionView[]).map((entry) => ({
      id: entry.id,
      title: entry.title,
      evidence: entry.evidence,
      question: entry.question,
      current: entry.current,
      alternatives: entry.alternatives.map((alt) => ({ reading: alt.reading, effect: alt.effect })),
      test: entry.test,
      source: entry.source,
    })),
  });
}

/** The panel with the path `selected` open (the first path when the build has no such path). */
export function damagePathView(prepared: PreparedDamagePath, selected: string): DamagePathView {
  return {
    ...prepared,
    active: prepared.tabs.some((tab) => tab.value === selected) ? selected : prepared.tabs[0]?.value || "hit",
  };
}
