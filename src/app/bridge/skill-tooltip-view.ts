// A skill's, a support's or an aura's tooltip: its level (a support's tier and stars), tags, facts at that level and
// effects with their values picked out, each support line with whether the calculation uses it. Pure; the planner passes
// in what depends on the open build (src/app/skills/skill-tooltip-queries.js) and React renders it
// (apps/web/src/features/skills/SkillTooltip.tsx).
import {
  activationMediumSelectedLines,
  configurableSupportTierData,
  defaultConfigurableSupportConfig,
  normalizePercentageText,
  normalizeProgressionSupportConfig,
  progressionSupportHasStars,
  progressionSupportText,
  progressionSupportTierData,
  specialSupportStarBonus,
  tliArt,
} from "../../engine/index.ts";
import { highlightedAuraEffect, highlightedSkillEffect, skillDisplaySs14 } from "../skills/skill-display-ss14.js";
import { highlightedSupportEffect, supportDisplaySs14 } from "../skills/support-display-ss14.js";
import { htmlTextSegments, type TextSegment } from "./display-text.ts";
import type { CoverageView } from "./gear-item-view.ts";

const text = (value: string) => normalizePercentageText(value);
const ART = tliArt as { supports: Record<string, string>; skills: Record<string, string> };

/** A level: "Lv.20", "Tier 0 · Lv.21"; `added` levels (from gear, talents…) show beside it, red when negative. */
export interface SkillLevelView {
  text: string;
  added: number;
}
/** An effect: its lines (a support's each with its coverage), shown with their line breaks. */
export interface SkillEffectView {
  lines: { segments: TextSegment[]; coverage: CoverageView | null }[];
}
export interface SkillTooltipView {
  /** The frame's look: skill (magic), support (green) or aura (rare). */
  look: "skill" | "support" | "aura";
  name: string;
  icon: string;
  level: SkillLevelView;
  /** A star support's stars (0–5); null for none. */
  stars: number | null;
  tags: string[];
  coverage: CoverageView;
  /** Why a curse skill is left out of the calculation; "" when it is not. */
  curseNote: string;
  /** Which hero trait grants the skill or support, and what it replaces; "" for none. */
  grantNote: string;
  facts: { label: string; value: string; addedDamage: boolean }[];
  /** An aura's estimate warning; "" for none. */
  reference: string;
  effects: SkillEffectView[];
  /** The footer line; "" for none. */
  source: string;
}

/** A skill or support as the planner's setups hold them (only what the tooltip reads). */
interface Leveled {
  baseLevel?: number;
  addedLevels?: number;
  effectiveLevel?: number;
  level?: number;
}
export interface InstalledSkill extends Leveled {
  name?: string;
  enabled?: boolean;
  effects?: string[];
  displayEffects?: string[];
  specialConfig?: SpecialConfig | null;
  traitGranted?: TraitGrant | null;
}
export interface SkillSetup extends Leveled {
  name: string;
  role?: string;
  enabled?: boolean;
  source?: string;
  observed?: Record<string, unknown>;
  databaseLevel20?: Record<string, unknown>;
}
export interface CatalogSkill {
  name: string;
  role?: string;
  level?: number;
  baseLevel?: number;
  tags?: string[];
  effects?: string[];
  icon?: string;
  source?: string;
}
interface SpecialConfig {
  tier: number;
  roll?: number;
  rollKind?: string;
  stars?: number;
}
interface TraitGrant {
  trait: string;
  keyword?: string;
  row?: number;
  replaces?: string;
}

export interface SkillTooltipInput {
  /** The skill's name, or the support's. */
  name: string;
  support: boolean;
  catalog: CatalogSkill | null;
  /** The installed skill or support (null when the build has none). */
  installed: InstalledSkill | null;
  /** The skill's setup (a support's: the skill it supports). */
  setup: SkillSetup | null;
  /** The setup's role as the board labels it ("Main damage"…), for a skill without catalog tags. */
  roleLabel: string;
  coverage: CoverageView;
  /** Whether the calculation uses one line of a support's effect; null shows no badge. */
  lineCoverage: (line: string) => CoverageView | null;
  /** Why a curse skill is left out (the curse limit); "" when it is not. */
  curseNote: string;
  /** A hero panel slot: the footer says how to edit it. */
  editable: boolean;
}

const levelOf = (entry: Leveled): SkillLevelView => ({
  text: `Lv.${entry.baseLevel}`,
  added: Number(entry.addedLevels) || 0,
});

/**
 * The note on a trait-granted skill or support (src/engine/heroes/trait-board-grants.js `traitGranted`): which trait
 * grants it, its energy (the skill takes none, its supports and Clockwork Core's socket cost energy as usual), and what
 * it replaces; "" for anything else.
 */
export function traitGrantNote(entry: (InstalledSkill & Leveled) | null | undefined): string {
  const grant = entry?.traitGranted;
  if (!grant) return "";
  const kept = "it stays in your build and is left out of the calculation";
  return Number.isInteger(grant.row)
    ? `Granted by ${grant.trait} (${grant.keyword}) · Lv. ${entry.effectiveLevel ?? 20} trait skill in Active slot ${(grant.row as number) + 1}, the skill takes no energy (its supports do)${grant.replaces ? ` · Replaces ${grant.replaces}: ${kept}` : ""}`
    : `Granted by ${grant.trait} · second support slot, costs energy like any support${grant.replaces ? ` · Replaces ${grant.replaces}: ${kept}` : ""}`;
}

/** A star support's, an Activation Medium's or a progression support's configured lines; null for any other. */
function configuredSupportLines(name: string, config: SpecialConfig | null) {
  if (!config) return null;
  if (progressionSupportTierData(name)?.some((entry: { tier: number }) => entry.tier === config.tier))
    return [
      ...((activationMediumSelectedLines(name, config) as { tier: number; text: string }[] | null)?.map(
        (line) => `T${line.tier} · ${line.text}`,
      ) ||
        (progressionSupportText(name, config) as string)
          .split(" | ")
          .map((line, index) => (index ? line : `Main affix · T${config.tier} · ${line}`))),
      ...(progressionSupportHasStars(name)
        ? [`Star level · +${specialSupportStarBonus(config.stars)}% additional damage`]
        : []),
    ];
  const tier = (configurableSupportTierData(name) as { tier: number; effect: string }[] | null)?.find(
    (entry) => entry.tier === config.tier,
  );
  if (!tier) return null;
  const roll = Number(config.roll);
  const effect = config.rollKind
    ? `additional ${config.rollKind === "cooldown" ? "Cooldown Recovery Speed" : "Duration"} for the supported skill`
    : tier.effect;
  return [
    `Main affix · T${config.tier} · ${roll >= 0 ? "+" : ""}${roll}% ${effect}`,
    ...(Number.isFinite(config.stars)
      ? [`Star bonus · ${config.stars} ★ · +${specialSupportStarBonus(config.stars)}% additional damage`]
      : []),
  ];
}

export function skillTooltipView(input: SkillTooltipInput): SkillTooltipView {
  const { name, support, catalog, installed, setup } = input;
  const level = installed?.effectiveLevel || installed?.level || catalog?.level || catalog?.baseLevel || 20;
  const levelLabel: SkillLevelView =
    installed?.baseLevel !== undefined ? levelOf(installed) : { text: `Lv. ${level}`, added: 0 };
  const skillDisplay = !support && catalog ? skillDisplaySs14(catalog, level) : null;
  const supportDisplay = support && catalog ? supportDisplaySs14(catalog, level) : null;
  const configurable = support && (configurableSupportTierData(name) || progressionSupportTierData(name));
  const config: SpecialConfig | null = configurable
    ? normalizeProgressionSupportConfig(name, installed?.specialConfig) ||
      defaultConfigurableSupportConfig(name, installed?.effects || catalog?.effects)
    : null;
  const stars = Number.isFinite(config?.stars) ? (config?.stars as number) : null;
  // A skill's installed entry is its setup; a star support shows its stars instead of its tier.
  const shownLevel: SkillLevelView =
    config && stars === null ? { ...levelLabel, text: `Tier ${config.tier} · ${levelLabel.text}` } : levelLabel;
  const observed =
    setup && !support
      ? Object.entries(setup.observed || setup.databaseLevel20 || {})
          .slice(0, 5)
          .map(([key, value]) => `${titleCase(key)}: ${Array.isArray(value) ? value.join("–") : value}`)
      : [];
  const detailEffects = installed?.displayEffects || installed?.effects || catalog?.effects || [];
  const displayEffects: string[] =
    configuredSupportLines(name, config) ||
    (skillDisplay?.effects?.length
      ? skillDisplay.effects
      : supportDisplay?.effects?.length
        ? supportDisplay.effects
        : detailEffects.length
          ? detailEffects
          : observed);
  const look = support ? "support" : catalog?.role === "aura" || setup?.role === "aura" ? "aura" : "skill";
  const effectLines = (effect: string) =>
    look === "support"
      ? String(effect)
          .split("\n")
          .map((line) => ({
            segments: htmlTextSegments(highlightedSupportEffect(line)),
            coverage: input.lineCoverage(line),
          }))
      : [
          {
            segments: htmlTextSegments(
              look === "aura" ? highlightedAuraEffect(effect) : highlightedSkillEffect(effect, name),
            ),
            coverage: null,
          },
        ];
  const facts = (skillDisplay?.facts || supportDisplay?.facts || []) as [string, unknown][];
  return {
    look,
    name: text(name),
    icon: catalog?.icon || (support ? ART.supports : ART.skills)[name] || "",
    level: shownLevel,
    stars,
    tags: (catalog?.tags || [support ? "Support" : input.roleLabel || "Skill"]).map(text),
    coverage: input.coverage,
    curseNote: text(input.curseNote),
    grantNote: text(traitGrantNote(installed)),
    facts: facts.map(([label, value]) => ({
      label: text(String(label)),
      value: text(String(value)),
      addedDamage: label === "Effectiveness of Added Damage",
    })),
    reference: text(skillDisplay?.effectEstimate || ""),
    effects: (displayEffects.length ? displayEffects : ["See TLIDB for complete level scaling."]).map((effect) => ({
      lines: effectLines(effect),
    })),
    source:
      catalog?.source || setup?.source
        ? input.editable
          ? "Click to edit · Right-click to remove"
          : "TLIDB · hover details"
        : "",
  };
}

const titleCase = (value: string) => value.replace(/\b\w/g, (letter) => letter.toUpperCase());
