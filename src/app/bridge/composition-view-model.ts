// The damage summary's Composition dialog (apps/web/src/features/stats/CompositionDialog.tsx), one section per condition
// the calculation assumes. Blessings: the stacks the calculation holds (the max with a gain source, else 0, unless the user
// set them: combat.<name>BlessingStacks, packages/engine/src/defense/blessing-model.js), the max stacks, the gain sources.
// Spell Burst: the build's Max Spell Burst and its sources. Barrier Burst (Necklace of Firebird,
// packages/engine/src/skills/barrier-burst.js): its requirements, the Barrier, one hit's base and the triggers per second. Pure.
import type { CombatNumber } from "#engine";

interface BlessingEntry {
  name: string;
  stacks: number;
  maxStacks: number;
  estimatedStacks?: number;
  stacksSetByUser?: boolean;
  gainSources?: { source: string; text: string; available: boolean; condition: string }[];
}

export interface BlessingConfigRow {
  name: string;
  /** The combat number the input sets. */
  field: CombatNumber;
  stacks: number;
  maxStacks: number;
  /** The user set the stacks (else the default: max with a gain source, 0 without). */
  setByUser: boolean;
  /** The stacks the build's own gain sources hold (shown as a hint). */
  estimatedStacks: number;
  gains: { label: string; available: boolean; condition: string }[];
}
export interface CompositionSpellBurst {
  total: number;
  sources: { label: string; value: number; active: boolean }[];
}
export interface CompositionBarrierBurst {
  active: boolean;
  requirements: { label: string; ok: boolean; detail: string }[];
  /** "9,856 = 20% × 19,371 × 2.12 × 1.2" */
  barrier: number;
  barrierFormula: string;
  /** One hit's base Fire damage (75% of the Barrier). */
  hitBase: number;
  usesPerSecond: number;
  rateSetByUser: boolean;
}
export interface CompositionView {
  rows: BlessingConfigRow[];
  spellBurst: CompositionSpellBurst | null;
  barrierBurst: CompositionBarrierBurst | null;
  /** The user set some Blessing's stacks ("Reset" clears them). */
  anySetByUser: boolean;
}

const FIELDS: Readonly<Record<string, CombatNumber>> = {
  Tenacity: "tenacityBlessingStacks",
  Focus: "focusBlessingStacks",
  Agility: "agilityBlessingStacks",
};

interface BarrierBurstState {
  active: boolean;
  requirements: { label: string; ok: boolean; sources: string[]; missing: string }[];
  barrier: { pools: number; increasedPercent: number; additionalFactor: number; value: number };
  damage: number;
  usesPerSecond: number;
  rateSetByUser: boolean;
}
interface SpellBurstState {
  total: number;
  sources: { source: string; text: string; value: number; active: boolean }[];
}
export interface CompositionInput {
  blessings: readonly BlessingEntry[];
  maxSpellBurst?: SpellBurstState | null;
  barrierBurst?: BarrierBurstState | null;
}

const whole = (value: number) => Math.round(value).toLocaleString("en-US");

export function compositionView({
  blessings,
  maxSpellBurst = null,
  barrierBurst = null,
}: CompositionInput): CompositionView {
  const entries = blessings;
  const rows = entries
    .filter((entry) => FIELDS[entry.name])
    .map((entry): BlessingConfigRow => ({
      name: entry.name,
      field: FIELDS[entry.name],
      stacks: entry.stacks,
      maxStacks: entry.maxStacks,
      setByUser: Boolean(entry.stacksSetByUser),
      estimatedStacks: entry.estimatedStacks ?? 0,
      gains: (entry.gainSources ?? []).map((gain) => ({
        label: `${gain.source} · ${gain.text}`,
        available: gain.available,
        condition: gain.condition,
      })),
    }));
  const burst = barrierBurst
    ? {
        active: barrierBurst.active,
        requirements: barrierBurst.requirements.map((item) => ({
          label: item.label,
          ok: item.ok,
          detail: item.ok ? item.sources.join(" · ") : item.missing,
        })),
        barrier: barrierBurst.barrier.value,
        barrierFormula: `20% × ${whole(barrierBurst.barrier.pools)} (Max Life + Max Energy Shield) × ${Math.round((1 + barrierBurst.barrier.increasedPercent / 100) * 1000) / 1000} × ${Math.round(barrierBurst.barrier.additionalFactor * 1000) / 1000}`,
        hitBase: barrierBurst.damage,
        usesPerSecond: barrierBurst.usesPerSecond,
        rateSetByUser: barrierBurst.rateSetByUser,
      }
    : null;
  const spellBurst =
    maxSpellBurst && (maxSpellBurst.total > 0 || maxSpellBurst.sources.length)
      ? {
          total: maxSpellBurst.total,
          sources: maxSpellBurst.sources.map((item) => ({
            label: `${item.source}: ${item.text}`,
            value: item.value,
            active: item.active,
          })),
        }
      : null;
  return {
    rows,
    anySetByUser: rows.some((row) => row.setByUser),
    spellBurst,
    barrierBurst: burst,
  };
}
