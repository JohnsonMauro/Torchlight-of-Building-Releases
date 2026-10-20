// What the Stats view shows (apps/web/src/features/stats): the build status, which of the Stat sheet / Damage path
// panels is open, the stat sheet (the active skill picker, the skill's damage banner: the training dummy recount, or
// the older 5 s / 20 s tiles, or "Damage not modeled"; the Effective HP banner and the Character stats tabs) and the
// damage path (src/app/bridge/damage-path-view-model.ts). src/app/app.js publishes it (src/app/bridge/view-sources.ts
// "stats"). prepareStatSheet and prepareDamagePath do the work that depends on the calculated build (and the picked
// skill); statsView adds what changes without a recalculation (the open panel and path, the recount sources left out
// of the view). Every text is as the legacy
// markup printed it (src/app/bridge/display-text.ts). Pure.
import { statSheetModel } from "../stats/stat-sheet.js";
import { statSheetPanelModel } from "../stats/stat-sheet-panel.js";
import { hasActiveReaping } from "../stats/damage-path-views.js";
import {
  MIX_COLORS,
  RECOUNT_SPAN_SECONDS,
  formatRecountDuration,
  recountSourceShares,
  recountTiles,
  recountTotalModeledDps,
} from "../stats/dummy-recount-panel.js";
import { formatRecountInteger } from "../../engine/text/number-format.js";
import { effectiveHpView, type EffectiveHpModel, type EffectiveHpView } from "../stats/effective-hp-view.ts";
import { numberText, type NumberText } from "../stats/number-text.ts";
import { displayTexts } from "./display-text.ts";
import { damagePathView, type DamagePathView, type PreparedDamagePath } from "./damage-path-view-model.ts";

export type StatsPanel = "sheet" | "damage-path";

export interface StatusView {
  /** "9 active", or "2 inactive". */
  text: string;
  /** The inactive skills and why ("Ice Bond (insufficient Energy) · …"); "" when none is. */
  detail: string;
  warning: boolean;
}
export interface RecountFieldView {
  /** "averageDps", "highest5sDps", "last5sDps". */
  key: string;
  label: string;
  note: string;
  value: NumberText;
}
export interface RecountSourceView {
  key: string;
  label: string;
  /** Its colour by its rank in the full build, so it keeps it while others are left out. */
  color: string;
  excluded: boolean;
  /** "12.3%", "off" when left out. */
  share: string;
  /** The bar segment's width, "12.34%". */
  width: string;
  /** DPS over the span, "off" when left out. */
  dps: string;
}
export interface RecountView {
  /** "00:00:10" */
  duration: string;
  spanSeconds: number;
  /** Average DPS in a span of time, Highest DPS in 5s, Average DPS in 5s. */
  fields: RecountFieldView[];
  /** Largest first. */
  sources: RecountSourceView[];
  /** Sources still in the view. */
  shown: number;
  /** "Homing Frost Bolt hits 100.0%, Ice Bond hits 0.0%" */
  summary: string;
  assumptions: string[];
}
export type StatDamageView =
  | { kind: "not-modeled" }
  | {
      kind: "recount";
      recount: RecountView;
      /** null when the build has no modeled total. */
      totalModeled: NumberText | null;
      /** Scorching Beam's line; null for other skills. */
      beamLine: string | null;
    }
  | {
      kind: "tiles";
      tiles: { label: string; value: string; note: string }[];
      totalModeled: NumberText | null;
      beamLine: string;
    };
export interface StatDrillView {
  formula: string;
  notes: string[];
  groups: { name: string; total: string; lines: { text: string; value: string }[] }[];
}
export interface StatRowView {
  label: string;
  value: string;
  detail?: string;
  /** Hover text; "" for none. */
  title: string;
  /** The lines behind the row; null when it does not open. */
  drill: StatDrillView | null;
}
export interface StatTabView {
  /** "offense", "defense", "dot", "utility", "target". */
  key: string;
  title: string;
  rowCount: number;
  sections: { key: string; title: string; rows: StatRowView[] }[];
}
export interface StatSheetView {
  /** The skills the picker lists; `value` is the setup key (the name without one). */
  options: { value: string; name: string }[];
  /** The picked skill's value; "" without one. */
  selected: string;
  active: boolean;
  skillName: string;
  /** "26", "—" without a skill. */
  skillLevel: string;
  damage: StatDamageView;
  ehp: EffectiveHpView;
  /** Tabs without rows are left out. */
  tabs: StatTabView[];
}
export interface StatsView {
  status: StatusView;
  panel: StatsPanel;
  sheet: StatSheetView;
  damagePath: DamagePathView;
}

// The calculated build as read here (src/engine/planner-api.ts PlannerResult; the stat sheet reads much more of it).
interface Planner {
  activation: { allocation: { allocations: { name: string; status: string }[] } };
  damageSources?: { name: string; status: string }[];
  dummyRecount?: { timeline?: unknown; assumptions?: ({ text?: string } | null)[] } | null;
  nativeHitCycle?: { expectedDps: number } | null;
  directHit?: { toTarget: number } | null;
  firesAllure?: { active?: boolean } | null;
  recountOpening?: { beamDps?: number; igniteDps?: number; reapingDps?: number } | null;
}
type Format = (value: number | undefined) => string;
type StatSheetModel = ReturnType<typeof statSheetModel>;

/** What the stat sheet shows for a build and a picked skill, before the recount sources left out are applied. */
export interface PreparedStatSheet {
  planner: Planner;
  model: StatSheetModel;
  status: StatusView;
  sheet: Omit<StatSheetView, "damage">;
  format: Format;
}

function buildStatus(planner: Planner): StatusView {
  const allocations = planner.activation.allocation.allocations;
  const inactive = allocations.filter((entry) => entry.status !== "active" && entry.status !== "disabled");
  return {
    text: inactive.length
      ? `${inactive.length} inactive`
      : `${allocations.filter((entry) => entry.status === "active").length} active`,
    detail: inactive
      .map(
        (entry) =>
          `${entry.name} (${entry.status === "insufficient-energy" ? "insufficient Energy" : "Energy cost unknown"})`,
      )
      .join(" · "),
    warning: inactive.length > 0,
  };
}

/** The stat sheet of `planner` (a calculated build) for the skill `selectedKey` (a setup key or a skill name). */
export function prepareStatSheet(planner: Planner, selectedKey: string, format: Format): PreparedStatSheet {
  const model = statSheetModel(planner, selectedKey);
  const skill = model.skill;
  return {
    planner,
    model,
    format,
    status: displayTexts(buildStatus(planner)),
    sheet: displayTexts({
      options: model.options.map((option: { setupKey?: string; name: string }) => ({
        value: option.setupKey || option.name,
        name: option.name,
      })),
      selected: skill ? skill.setupKey || skill.name : "",
      active: model.active,
      skillName: skill?.name || "No active skill",
      skillLevel: String(skill?.effectiveLevel ?? "—"),
      // The model's inferred type is narrower than what it holds (rows get fields after they are built).
      ehp: effectiveHpView(model.ehp as unknown as EffectiveHpModel),
      tabs: statSheetPanelModel(model, planner, format).tabs as StatTabView[],
    }),
  };
}

/** The recount panel over the fixed span, without the sources in `excluded`. */
function recountView(recount: NonNullable<Planner["dummyRecount"]>, excluded: readonly string[]): RecountView {
  const fields = recountTiles(recount, { excluded }) as { key: string; label: string; note: string; value: number }[];
  const sources = (recountSourceShares(recount, { excluded }) as RecountSourceShare[]).map((item, index) => ({
    key: item.key,
    label: item.label,
    color: MIX_COLORS[index % MIX_COLORS.length],
    excluded: Boolean(item.excluded),
    share: item.excluded ? "off" : `${(item.share * 100).toFixed(1)}%`,
    width: `${(item.share * 100).toFixed(2)}%`,
    dps: item.excluded ? "off" : formatRecountInteger(item.dps),
  }));
  return {
    duration: formatRecountDuration(RECOUNT_SPAN_SECONDS),
    spanSeconds: RECOUNT_SPAN_SECONDS,
    fields: fields.map((field) => ({
      key: field.key,
      label: field.label,
      note: field.note,
      value: numberText(field.value),
    })),
    sources,
    shown: sources.filter((item) => !item.excluded).length,
    summary: sources.map((item) => `${item.label} ${item.share}`).join(", "),
    assumptions: (recount.assumptions || []).map((item) => item?.text).filter((text): text is string => Boolean(text)),
  };
}
interface RecountSourceShare {
  key: string;
  label: string;
  dps: number;
  share: number;
  excluded?: boolean;
}

function damageView({ planner, model, format }: PreparedStatSheet, excluded: readonly string[]): StatDamageView {
  const recount = planner.dummyRecount;
  // Any modeled damage source (Scorching Beam, Wilting Beam, …) shows the build-wide recount panel.
  const modeledSource = (planner.damageSources || []).some(
    (source) => source.status === "modeled" && source.name === model.skill?.name,
  );
  if (!((model.beam && planner.nativeHitCycle) || (recount?.timeline && modeledSource))) return { kind: "not-modeled" };
  const beamLine = `Beam and explosion: ${format(planner.nativeHitCycle?.expectedDps)} source DPS · ${format(planner.directHit?.toTarget)} target hit DPS.`;
  // With a recount timeline the in-game-style panel is the focal point, with Total modeled DPS, the beam line and the
  // details beneath it; the older 5 s / 20 s tiles remain for a build without one.
  if (recount?.timeline)
    return {
      kind: "recount",
      recount: recountView(recount, excluded),
      totalModeled:
        model.totalDps === null
          ? null
          : numberText(recountTotalModeledDps(recount, model.totalDps, { excluded, parts: model.totalParts }) ?? NaN),
      beamLine: model.beam ? beamLine : null,
    };
  const uncalibrated = Boolean(model.paths || planner.firesAllure?.active);
  const dummyNote = model.paths
    ? `Uncalibrated model: ${format(model.paths.twentySeconds.beamDps)} beam, ${model.paths.twentySeconds.dots.map((dot: { dps: number; name: string }) => `${format(dot.dps)} ${dot.name}`).join(", ")}${hasActiveReaping(planner) ? `, ${format(model.paths.twentySeconds.reaping.reapingDps)} Reaping DPS` : ""}${model.paths.twentySeconds.illOmen?.dps ? `, ${format(model.paths.twentySeconds.illOmen.dps)} Ill Omen DPS (best case beyond the dummy)` : ""}. No dummy test exists for this build.`
    : planner.firesAllure?.active
      ? `Uncalibrated model: ${format(planner.recountOpening?.beamDps || 0)} beam, ${format(planner.recountOpening?.igniteDps || 0)} Scorch${hasActiveReaping(planner) ? `, ${format(planner.recountOpening?.reapingDps || 0)} Reaping DPS` : ""}. Compare with the same build and combat state in game.`
      : "Average from an empty target and channel stack state; includes calibrated Bard delivery and Ignite buildup.";
  const figure = (value: number | null) => (value === null ? "—" : format(value));
  return {
    kind: "tiles",
    tiles: [
      {
        label: uncalibrated ? "Five-second dummy damage · uncalibrated" : "Five-second dummy damage",
        value: figure(model.dummyFiveSecondDamage),
        note: "Estimated total damage during the first five seconds, including buildup. This is damage, not DPS.",
      },
      {
        label: uncalibrated
          ? "Five-second equivalent from 20-second DPS · uncalibrated"
          : "Five-second equivalent from 20-second DPS",
        value: figure(model.dummyFiveSecondEquivalentFromTwentySecondDps),
        note: "20-second average DPS × 5 seconds. Compare this damage amount with the first five seconds above.",
      },
      {
        label: uncalibrated ? "20-second Dummy DPS · uncalibrated" : "20-second Dummy DPS",
        value: figure(model.dummyDps),
        note: dummyNote,
      },
    ],
    totalModeled: model.totalDps === null ? null : numberText(model.totalDps),
    beamLine,
  };
}

/**
 * The Stats view with `panel` open, the damage path `path` picked and the recount sources `excluded` (keys) left out of
 * the view.
 */
export function statsView(
  { sheet, damagePath }: { sheet: PreparedStatSheet; damagePath: PreparedDamagePath },
  { panel, path, excluded }: { panel: StatsPanel; path: string; excluded: readonly string[] },
): StatsView {
  return {
    status: sheet.status,
    panel,
    sheet: { ...sheet.sheet, damage: displayTexts(damageView(sheet, excluded)) },
    damagePath: damagePathView(damagePath, path),
  };
}
