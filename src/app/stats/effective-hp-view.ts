// What the Stats page's Effective HP banner shows (apps/web/src/features/stats/EffectiveHp.tsx), drawn from
// packages/engine/src/defense/effective-hp.js effectiveHpModel: the weakest-type figures, the damage type table, the ailment and
// crowd control checklist, the layer chips and the hover texts behind each. Kept apart from the model, which the
// calculation imports, so the calculation does not load panel code. Pure.
import { baseLife, formatRecountInteger } from "#engine";
import { numberText, type NumberText } from "./number-text.ts";

export interface EhpFigureView {
  /** "weakest", "pool", "expected", "dot". */
  key: string;
  label: string;
  value: NumberText;
  /** Hover text; "" for none. */
  note: string;
}
export interface EhpTypeView {
  type: string;
  /** "×0.690" */
  mitigation: string;
  mitigationTitle: string;
  guaranteed: string;
  expectedAttack: string;
  attackTitle: string;
  expectedSpell: string;
  spellTitle: string;
  dot: string;
  dotTitle: string;
  /** The ailment of that type ("Ignite 3,269"); null when the type has none. */
  ailment: { name: string; text: string } | null;
}
export interface EhpCheckView {
  /** "immune", "conditional", "reduced", "worse", "none" (sets the row's mark and status color). */
  status: string;
  mark: string;
  label: string;
  likely: boolean;
  statusText: string;
  /** Hover text; "" for none. */
  title: string;
}
export interface EhpLayerView {
  label: string;
  value: string;
  title: string;
}
export interface EffectiveHpView {
  enemyLevel: number;
  characterLevel: number;
  weakest: EhpFigureView;
  /** Usable pool, expected vs hits, weakest vs damage over time. */
  pair: EhpFigureView[];
  types: EhpTypeView[];
  checklist: EhpCheckView[];
  layers: EhpLayerView[];
  details: {
    /** "Barrier" or "Guard Barrier" when the pool counts one; null otherwise. */
    barrier: string | null;
    baseLife: number;
    /** "35%" */
    injuryBuffer: string;
    assumptions: string[];
    provisional: string[];
  };
}

interface Source {
  source: string;
  text: string;
}
interface Pool {
  base: number;
  flat: number;
  gear: number;
  increased: number;
  additional: number;
  sources: Source[];
}
interface Layer extends Source {
  active?: boolean;
  unmodeled?: boolean;
  additional?: boolean;
  kismetGroup?: unknown;
  scope?: string;
  percent?: number;
}
interface Ailment {
  name: string;
  immune: boolean;
  guaranteed: number;
  mitigation: number;
  additionalFactor: number;
  increasedPercent: number;
  kismetPercent: number;
  layers: Layer[];
}
interface DamageType {
  type: string;
  mitigation: number;
  guaranteed: number;
  expectedAttack: number;
  expectedSpell: number;
  armorReductionPercent: number;
  resistancePercent: number;
  additionalFactor: number;
  conversion?: { share: number; type: string; factor: number; sources: string[] }[];
  layers: Layer[];
  dot: { guaranteed: number; mitigation: number; additionalFactor: number; layers: Layer[]; ailment?: Ailment | null };
}
interface Check {
  status: string;
  label: string;
  likely?: boolean;
  immuneBySum?: boolean;
  detail?: string;
  note?: string;
  mitigationPercent?: number;
  sources: (Source & { mapping?: string })[];
}
/** What is read here of packages/engine/src/defense/effective-hp.js effectiveHpModel's result. */
export interface EffectiveHpModel {
  enemyLevel: number;
  characterLevel: number;
  pools: {
    total: number;
    usableLife: number;
    lifeReservedPercent: number;
    nonPhysicalArmorRate: number;
    life: Pool & { value: number };
    energyShield: Pool & { value: number };
    armor: Pool & { value: number };
    evasion: Pool & { value: number };
    barrier?: {
      movement: boolean;
      absorb: number;
      shield: number;
      source: string;
      trigger: string;
      shieldBonusPercent: number;
      shieldBonusSources: Source[];
    } | null;
  };
  types: DamageType[];
  weakest: { type: string; guaranteed: number };
  weakestExpected: { type: string; expectedAttack: number; expectedSpell: number };
  weakestDot: { type: string; dot: { guaranteed: number } };
  dotPool: number;
  dotLayers: Layer[];
  takenLayers: Layer[];
  conversions?: Layer[];
  evade: { attack: number; spell: number; accuracy: number };
  block: {
    attackChance: number;
    spellChance: number;
    ratio: number;
    ratioCap: number;
    panel?: { attackChance: number; spellChance: number; ratio: number } | null;
    sources: Source[];
  };
  avoidance: { percent: number; sources: Source[] };
  checklist: Check[];
  injuryBufferPercent: number;
  assumptions: string[];
  provisional: string[];
}

const round = (value: number, places = 3) => Math.round(value * 10 ** places) / 10 ** places;
const percentText = (value: number, places = 1) => `${round(value, places)}%`;
const sourceTitle = (sources: Source[]) => sources.map((item) => `${item.source}: ${item.text}`).join("\n");
const poolTitle = (item: Pool, label: string) =>
  [
    `${label} · (base + flat + gear) × (1 + increased%) × additional`,
    `base ${item.base} · flat ${item.flat} · gear ${item.gear} · +${item.increased}% · ×${item.additional}`,
    ...item.sources.map((source) => `${source.source}: ${source.text}`),
  ].join("\n");
const integer = (value: number) => (Number.isFinite(value) ? formatRecountInteger(value) : "Immune");
const layerLine = (layer: Source) => `${layer.source}: ${layer.text}`;

const MARKS: Record<string, string> = { immune: "✓", conditional: "◐", reduced: "◐", worse: "✕", none: "✕" };
const STATUS_LABEL: Record<string, string> = {
  immune: "Immune",
  conditional: "Conditional",
  reduced: "Reduced",
  worse: "Weakened",
  none: "Not protected",
};

/** The banner's data from `effectiveHpModel`'s result. */
export function effectiveHpView(model: EffectiveHpModel): EffectiveHpView {
  const { pools, types } = model;
  const figure = (key: string, label: string, value: number, note = ""): EhpFigureView => ({
    key,
    label,
    value: Number.isFinite(value) ? numberText(value) : { full: integer(value), short: null },
    note,
  });
  const weakest = figure(
    "weakest",
    `Effective HP · weakest: ${model.weakest.type}`,
    model.weakest.guaranteed,
    `Usable pool ÷ ${model.weakest.type} mitigation (Armor, resistance, additional damage taken). Evasion, block and avoidance are not counted here.`,
  );
  const pair = [
    figure(
      "pool",
      "Usable pool",
      pools.total,
      `Life after sealing ${formatRecountInteger(pools.usableLife)} + Energy Shield ${formatRecountInteger(pools.energyShield.value)}${pools.barrier ? ` + ${pools.barrier.movement ? "Barrier" : "Guard Barrier"} ${formatRecountInteger(pools.barrier.absorb)}` : ""}`,
    ),
    figure(
      "expected",
      `Expected vs hits · weakest: ${model.weakestExpected.type}`,
      Math.min(model.weakestExpected.expectedAttack, model.weakestExpected.expectedSpell),
      "Lowest of the attack and spell expected values: evasion, block and chance to avoid damage as averages. A single unlucky hit still sees only the guaranteed figure.",
    ),
    figure(
      "dot",
      `Weakest vs damage over time: ${model.weakestDot.type}`,
      model.weakestDot.dot.guaranteed,
      `Life after sealing + Energy Shield (${formatRecountInteger(model.dotPool)}, no Barrier) ÷ ${model.weakestDot.type} resistance and damage-taken lines that are not hit-only. Armor, evasion, block and avoidance do not apply.`,
    ),
  ];

  // Summed (mod 3) ailment lines at −100% or below leave no damage taken: not an immunity, so it is labelled apart.
  const ailmentValue = (ailment: Ailment) =>
    ailment.immune
      ? "Immune"
      : Number.isFinite(ailment.guaranteed)
        ? formatRecountInteger(ailment.guaranteed)
        : "fully mitigated";
  const dotTitle = (item: DamageType) => {
    const { dot } = item;
    const ailment = dot.ailment;
    const inactive = model.dotLayers.filter(
      (layer) => !layer.active && (layer.scope === "DoT" || layer.scope === ailment?.name),
    );
    return [
      `Damage over time · pool ${formatRecountInteger(model.dotPool)} ÷ ×${dot.mitigation.toFixed(3)}`,
      `Resistance ${percentText(item.resistancePercent)} · additional damage taken ×${dot.additionalFactor} · no Armor, evasion, block or avoid`,
      ...dot.layers.map(layerLine),
      ...(ailment
        ? [
            ailment.immune
              ? `${ailment.name}: immune`
              : `${ailment.name}: ×${ailment.mitigation.toFixed(3)} → ${ailmentValue(ailment)} (additional ×${ailment.additionalFactor}${ailment.layers.some((layer) => !layer.additional && !layer.kismetGroup) ? ` · ${ailment.increasedPercent}% damage taken, summed` : ""}${ailment.layers.some((layer) => layer.kismetGroup) ? ` · kismets ${ailment.kismetPercent}%, stacked additively` : ""})`,
            ...ailment.layers.map(layerLine),
          ]
        : []),
      ...inactive.map(
        (layer) => `${layer.unmodeled ? "Not applied (condition not modeled)" : "Inactive"} · ${layerLine(layer)}`,
      ),
    ].join("\n");
  };
  // Taken as (TLIDB Damage Type Conversion): each share takes its own type's Armor, resistance and damage taken.
  const mitigationTitle = (item: DamageType) =>
    [
      item.conversion && (item.conversion.length > 1 || (item.conversion[0] && item.conversion[0].type !== item.type))
        ? `Taken as ${item.conversion.map((part) => `${percentText(part.share * 100, 2)} ${part.type} (×${part.factor.toFixed(3)})`).join(" + ")}`
        : `Armor ${percentText(item.armorReductionPercent)} · resistance ${percentText(item.resistancePercent)} · additional damage taken ×${item.additionalFactor}`,
      ...(item.conversion || []).flatMap((part) => part.sources),
      ...item.layers.map((layer) => `${layer.source}: ${layer.text}`),
    ].join("\n");
  const typeRows = types.map((item): EhpTypeView => ({
    type: item.type,
    mitigation: `×${item.mitigation.toFixed(3)}`,
    mitigationTitle: mitigationTitle(item),
    guaranteed: integer(item.guaranteed),
    expectedAttack: integer(item.expectedAttack),
    attackTitle: `Evade ${percentText(model.evade.attack * 100)} · block ${percentText(model.block.attackChance)} × ${percentText(model.block.ratio)} ratio · avoid ${percentText(model.avoidance.percent)}`,
    expectedSpell: integer(item.expectedSpell),
    spellTitle: `Evade ${percentText(model.evade.spell * 100)} (60% rating) · block ${percentText(model.block.spellChance)} × ${percentText(model.block.ratio)} ratio · avoid ${percentText(model.avoidance.percent)}`,
    dot: integer(item.dot.guaranteed),
    dotTitle: dotTitle(item),
    ailment: item.dot.ailment ? { name: item.dot.ailment.name, text: ailmentValue(item.dot.ailment) } : null,
  }));

  // The summed detail ("-101% damage taken · 14% chance to avoid") and the per-source lines are the row's hover text.
  const checklist = model.checklist.map((item): EhpCheckView => ({
    status: item.status,
    mark: MARKS[item.status],
    label: item.label,
    likely: Boolean(item.likely) && item.status !== "immune",
    statusText:
      item.status === "reduced" && (item.mitigationPercent ?? 0) > 0
        ? `${STATUS_LABEL.reduced} ${round(item.mitigationPercent ?? 0, 1)}%`
        : STATUS_LABEL[item.status],
    title: [
      (item.status !== "immune" && item.status !== "none") || item.immuneBySum ? item.detail : "",
      item.note,
      ...item.sources.map(
        (source) => `${source.source}: ${source.text}${source.mapping ? ` (${source.mapping})` : ""}`,
      ),
    ]
      .filter(Boolean)
      .join("\n"),
  }));

  const takenLayers = model.takenLayers;
  const layers: EhpLayerView[] = [
    {
      label: "Max Life",
      value: `${formatRecountInteger(pools.life.value)}${pools.lifeReservedPercent ? ` · ${percentText(pools.lifeReservedPercent)} sealed` : ""}`,
      title: poolTitle(pools.life, "Max Life"),
    },
    {
      label: "Energy Shield",
      value: formatRecountInteger(pools.energyShield.value),
      title: poolTitle(pools.energyShield, "Max Energy Shield"),
    },
    ...(pools.barrier
      ? [
          {
            label: pools.barrier.movement ? "Barrier" : "Guard Barrier",
            value: formatRecountInteger(pools.barrier.shield),
            title: `${pools.barrier.source} · ${pools.barrier.trigger}\n20% × (Max Life + Max Energy Shield)${pools.barrier.shieldBonusPercent ? ` × (1 + ${pools.barrier.shieldBonusPercent}% Barrier Shield)` : ""}, absorbs 50% of hit damage; counts ${formatRecountInteger(pools.barrier.absorb)} toward the pool${pools.barrier.shieldBonusSources.length ? `\n${sourceTitle(pools.barrier.shieldBonusSources)}` : ""}`,
          },
        ]
      : []),
    {
      label: "Armor",
      value: `${formatRecountInteger(pools.armor.value)} · ${percentText(types[0].armorReductionPercent)} phys`,
      title: `${poolTitle(pools.armor, "Armor")}\nReduction = 2 × Armor ÷ (0.9 × 2 × Armor + 3000 + 300 × min(${model.enemyLevel}, 90)); ${percentText(pools.nonPhysicalArmorRate * 100, 2)} of it against non-Physical; cap 80%`,
    },
    {
      label: "Evasion",
      value: `${formatRecountInteger(pools.evasion.value)} · ${percentText(model.evade.attack * 100)} / ${percentText(model.evade.spell * 100)}`,
      title: `${poolTitle(pools.evasion, "Evasion")}\nEvade = 1 − 1.15 × Accuracy ÷ (Accuracy + 0.5 × Evasion^0.75), cap 75%; enemy Accuracy ${model.evade.accuracy} at level ${model.enemyLevel}; against spells the chance uses 60% of the Evasion rating (game panel Spell Evasion Chance) and an evaded spell still deals 60% (TLIDB: evasion reduces spell damage by 40%)`,
    },
    {
      label: "Block",
      value: `${percentText(model.block.attackChance)} / ${percentText(model.block.spellChance)} × ${percentText(model.block.ratio)}`,
      title: `Attack / Spell Block Chance × Block Ratio (cap ${percentText(model.block.ratioCap)}; TLIDB: 30% base, 60% max by default, up to 80%; Block Chance up to 100%)${model.block.panel ? `\nAegis of Fire active (best case): the character panel without it reads ${percentText(model.block.panel.attackChance)} / ${percentText(model.block.panel.spellChance)} × ${percentText(model.block.panel.ratio)}` : ""}\n${sourceTitle(model.block.sources) || "No block lines"}`,
    },
    {
      label: "Avoid damage",
      value: percentText(model.avoidance.percent),
      title: sourceTitle(model.avoidance.sources) || "No chance-to-avoid lines",
    },
    {
      label: "Resistances",
      value: types
        .slice(1)
        .map((item) => `${item.type} ${item.resistancePercent}%`)
        .join(" · "),
      title: "Effective (capped) resistances from the Resistances card",
    },
    {
      label: "Damage taken",
      value: takenLayers.filter((layer) => layer.active).length
        ? takenLayers
            .filter((layer) => layer.active)
            .map(
              (layer) =>
                `${layer.scope === "All" ? "" : `${layer.scope} `}${(layer.percent ?? 0) > 0 ? "+" : ""}${round(layer.percent ?? 0, 2)}%`,
            )
            .join(" · ")
        : "none",
      title:
        [
          ...takenLayers.map(
            (layer) =>
              `${layer.active ? "Active" : layer.unmodeled ? "Not applied (condition not modeled)" : "Inactive"} · ${layer.source}: ${layer.text}`,
          ),
          ...(model.conversions || []).map(
            (line) =>
              `${line.active ? "Active" : line.unmodeled ? "Not applied (condition not modeled)" : "Inactive"} · taken as · ${line.source}: ${line.text}`,
          ),
        ].join("\n") || "No additional damage taken or taken-conversion lines",
    },
  ];
  return {
    enemyLevel: model.enemyLevel,
    characterLevel: model.characterLevel,
    weakest,
    pair,
    types: typeRows,
    checklist,
    layers,
    details: {
      barrier: pools.barrier ? (pools.barrier.movement ? "Barrier" : "Guard Barrier") : null,
      baseLife: baseLife(model.characterLevel),
      injuryBuffer: percentText(model.injuryBufferPercent),
      assumptions: model.assumptions,
      provisional: model.provisional,
    },
  };
}
