import { normalizePercentageText } from "./text/percentage-text.js";
import { matchTalentTextClause } from "./text/talent-text-effects.js";
import { copiedSlateAffixes, isCopySlate } from "./talents/slate-board.js";
import { modeledCoreTalents, noDamageCoreTalents, conditionalTextCoreTalents } from "./talents/core-talent-model.js";
import { inverseImageEffectMultiplier, inverseImageTalentNodes, prismReplacesCore } from "./talents/prism-crafting.js";
import {
  craftedSlateShape,
  judgmentAffectedSlateIds,
  scaleJudgmentAffix,
  isActiveJudgment,
  judgmentAffixTargetPercent,
} from "./talents/slate-judgment.js";
import { PEDIGREE_OF_GODS, isPedigreeSlate, normalizePedigreeAffixes } from "./talents/pedigree-slots.js";
import { divinitySlateAffixes } from "../data/divinity-slate-affixes.js";

// "(Max Active Divinity: 1)" talent nodes count once across the equipped slates (copies included).
// Numbers are masked so a Judgment-scaled copy still matches its node.
const divinityKey = (affix) => normalizePercentageText(String(affix)).replace(/[0-9.]+/g, "#");
const maxOneDivinityKeys = new Set(
  Object.values(divinitySlateAffixes)
    .flat()
    .filter((affix) => affix.maxDivinityEffect === 1)
    .map((affix) => divinityKey(`${affix.tree}: ${affix.name}: ${affix.effect}`)),
);

// Only exact, unconditional phrases are parsed (the shared table, packages/engine/src/text/talent-text-effects.js). Unrecognized
// mechanics stay visible. Numeric keys add per rank; flag keys (true) are once-per-node effects.
export function parseTalentEffects(description = "") {
  const effects = {},
    unsupported = [];
  for (const text of normalizePercentageText(description)
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)) {
    const matched = matchTalentTextClause(text, "talent");
    if (!matched) {
      unsupported.push(text);
      continue;
    }
    for (const [key, value] of matched.values)
      effects[key] = typeof value === "number" ? (effects[key] || 0) + value : value;
  }
  return { effects, unsupported };
}

export function resolveTalentCandidate(captured, catalogue, ranks, selections) {
  const warnings = [],
    activeCores = new Set();
  const panels = selections.selectedTrees.filter(Boolean).map((name) => {
    const baseline = captured.panels.find((panel) => panel.name === name);
    const panel = catalogue[name];
    if (!panel) return { name, allocatedNodes: [] };
    const prism = (selections.prismInventory || []).find((item) => item.id === selections.installedPrisms?.[name]);
    const nodes = inverseImageTalentNodes(panel.nodes, prism, selections.installedPrismNodes?.[name]);
    const sourceNodes = new Map(panel.nodes.map((node) => [node.coordinate.join(","), node]));
    const scaleEffects = (effects, multiplier) =>
      Object.fromEntries(
        Object.entries(effects || {}).map(([key, value]) => [
          key,
          typeof value === "number" ? value * multiplier : value,
        ]),
      );
    const allocatedNodes = nodes.map((node) => {
      const source = sourceNodes.get(node.reflectedFrom) || node;
      const known = baseline?.allocatedNodes.find((item) => String(item.coordinate) === String(source.coordinate));
      const rank =
        ranks[`${name}:${node.coordinate}`] ??
        (node.reflectedFrom || selections.useCapturedRanks === false ? 0 : (known?.rank ?? 0));
      const multiplier = node.reflectedFrom ? inverseImageEffectMultiplier(prism, source.type) : 1;
      if (known)
        return {
          ...known,
          coordinate: node.coordinate,
          rank,
          reflectedFrom: node.reflectedFrom,
          inverseEffectMultiplier: multiplier,
          replacedBy: node.reflectedFrom ? undefined : known.replacedBy,
          effectsPerRank: scaleEffects(known.effectsPerRank, multiplier),
          effects: scaleEffects(known.effects, multiplier),
        };
      const parsed = parseTalentEffects(source.description);
      if (rank > 0 && parsed.unsupported.length)
        warnings.push(`${name} (${node.coordinate}): unmodeled ${parsed.unsupported.join("; ")}`);
      const numeric = Object.fromEntries(
        Object.entries(parsed.effects).filter(([, value]) => typeof value === "number"),
      );
      const flags = Object.fromEntries(Object.entries(parsed.effects).filter(([, value]) => typeof value !== "number"));
      return {
        ...node,
        rank,
        inverseEffectMultiplier: multiplier,
        effectsPerRank: scaleEffects(numeric, multiplier),
        ...(Object.keys(flags).length ? { effects: flags } : {}),
      };
    });
    const points = allocatedNodes.reduce((sum, node) => sum + node.rank, 0);
    // An Ethereal Prism grants its base as a core talent (replacing the panel's core unless the
    // "Mutated Core Talents no longer replace the original talent" affix keeps both).
    if (prism?.type === "ethereal" && !["Haze", "Phantasmagoria"].includes(prism.base) && points > 0) {
      activeCores.add(prism.base);
      if (!modeledCoreTalents.includes(prism.base))
        warnings.push(`${prism.base}: prism core effect is not included in the independent damage calculation.`);
    }
    for (const core of panel.coreTalents || []) {
      // The captured Selena build's core replacement (its Psychic panel ran the Fire's Allure prism) belongs to the captured
      // ranks only; a build with its own ranks keeps its selected core (core audit 2026-10-18: it hid every Psychic core).
      if (
        selections.coreSelections[`${name}:${core.unlockPoints}`] !== core.name ||
        points < core.unlockPoints ||
        (!prism && selections.useCapturedRanks !== false && baseline?.coreTalentReplacement) ||
        prismReplacesCore(prism)
      )
        continue;
      activeCores.add(core.name);
      if (
        !modeledCoreTalents.includes(core.name) &&
        !noDamageCoreTalents.includes(core.name) &&
        !conditionalTextCoreTalents.includes(core.name)
      )
        warnings.push(`${core.name}: core effect is not included in the independent damage calculation.`);
    }
    return { name, allocatedNodes };
  });
  return { setup: { panels }, activeCores, warnings };
}

export function resolveSlateCandidate(equippedIds, state = {}) {
  const warnings = [];
  const placements = state.placements || {};
  const crafted = (state.inventory || []).map((slate) => {
    // Pedigree slots only hold rolled talent nodes; invalid saved values are ignored here.
    const pedigree = isPedigreeSlate(slate) ? normalizePedigreeAffixes(slate.affixes) : null;
    return {
      ...slate,
      shape: craftedSlateShape(slate.shape, slate.template || slate.name, slate.god),
      fixed: pedigree?.affixes ?? slate.affixes ?? [],
      ...(pedigree?.cleared.length ? { pedigreeClearedAffixes: pedigree.cleared } : {}),
      level: 100,
    };
  });
  const allSlates = crafted;
  const affected = judgmentAffectedSlateIds(allSlates, placements, equippedIds);
  const slates = allSlates.map((slate) => {
    const sourcePercent = slate.amplifiedPercent || 0;
    // An active Judgment's own Brand talents take its Authority's -30% (patch notes 2026-10-15); its base affixes do not.
    // A crafted Nether King slate keeps its Brand talents in its affix list; affixGroups.brand names them.
    const judgmentContext = {
      linked: affected.has(slate.id),
      ownAuthority: Boolean(isActiveJudgment(slate) && equippedIds.includes(slate.id) && placements?.[slate.id]),
    };
    const fixed = slate.fixed ?? [];
    const brands = slate.brands || [];
    const scaled = (affix) =>
      scaleJudgmentAffix(affix, sourcePercent, judgmentAffixTargetPercent(slate, affix, judgmentContext));
    const baseTalentAffixes = [...fixed, ...brands].map((affix) => scaleJudgmentAffix(affix, sourcePercent, 0));
    const candidate = { ...slate, baseTalentAffixes, fixed: fixed.map(scaled), brands: brands.map(scaled) };
    return candidate;
  });
  const active = slates.filter((item) => equippedIds.includes(item.id) && placements[item.id]);
  // "(Max Active Divinity Slate: 1)": only the first equipped Pedigree of Gods takes effect.
  active
    .filter((item) => (item.template || item.name) === PEDIGREE_OF_GODS)
    .slice(1)
    .forEach((item) => {
      item.divinityLimited = "Max Active Divinity Slate: 1";
      item.fixed = [];
      item.brands = [];
      item.baseTalentAffixes = [];
      warnings.push(
        `${item.name}: only one Pedigree of Gods is active (Max Active Divinity Slate: 1); this copy is ignored.`,
      );
    });
  for (const item of slates)
    if (isCopySlate(item)) {
      item.copiedAffixSources = active.includes(item)
        ? copiedSlateAffixes(item, placements, active, (source) => source.baseTalentAffixes)
        : [];
      item.copiedTalents = item.copiedAffixSources.map((source) => source.affix);
      item.resolvedCopiedTotals = {};
      item.copyStatus = "resolved-from-current-layout";
    }
  const seenLimited = new Set();
  const keepFirst = (item, affix) => {
    const key = divinityKey(affix);
    if (!maxOneDivinityKeys.has(key)) return true;
    if (!seenLimited.has(key)) {
      seenLimited.add(key);
      return true;
    }
    (item.divinityLimitedAffixes ||= []).push(affix);
    return false;
  };
  for (const item of active) item.fixed = item.fixed.filter((affix) => keepFirst(item, affix));
  for (const item of active)
    if (item.copiedTalents) {
      const kept = item.copiedAffixSources.filter((source) => keepFirst(item, source.affix));
      item.copiedAffixSources = kept;
      item.copiedTalents = kept.map((source) => source.affix);
    }
  return { setup: { slates }, warnings };
}
