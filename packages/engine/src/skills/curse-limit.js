import { effectiveGearModifierTexts } from "../engine.js";
import { activeKismetEffects } from "../pacts/kismet-effects.js";
import { pactspiritTrees } from "../../data/pacts/pactspirit-trees.js";
import { orderedPactspiritNodes, pactspiritEffectsAtLevel, pactspiritLevel } from "../pacts/pactspirit-levels.js";
import { prismAreaBounds, prismNodeAffixes } from "../talents/prism-crafting.js";
import { withoutSlateCoreName } from "../text/granted-core-lines.js";
import { equipmentSlots } from "../../data/gear/crafting-catalog.js";

export function calculateCurseLimit({
  equipment,
  talents = [],
  slates = [],
  talentState = {},
  pactState = {},
  setups = [],
  conditions = {},
}) {
  const sources = [];
  const add = (text, source, multiplier = 1) => {
    if (multiplier <= 0) return;
    for (const clause of String(text || "").split(/\n|\||;| · /)) {
      const clean = clause.replace(/^.*:\s*/, "").trim();
      const match = clean.match(/^You can (?:cast|inflict) (\d+) additional Curses?$/i);
      if (match) {
        const value = Math.trunc(Number(match[1]) * multiplier);
        if (value) sources.push({ source, text: clean, value });
      }
    }
  };
  for (const item of equipment?.candidateItems || [])
    for (const text of effectiveGearModifierTexts(item)) add(text, item.name);
  for (const panel of talents) {
    for (const node of panel.allocatedNodes || [])
      if (node.rank > 0 && !node.replacedBy)
        add(node.description, `${panel.name} talent`, node.rank * (node.inverseEffectMultiplier ?? 1));
    for (const core of panel.activeCores || []) add(core.description, core.name);
    const prism = talentState.prismInventory?.find((item) => item.id === talentState.installedPrisms?.[panel.name]);
    const coordinate = talentState.installedPrismNodes?.[panel.name];
    if (prism && coordinate && prism.type !== "inverse") {
      const bounds = prismAreaBounds(prism, coordinate);
      const nodes = (panel.allocatedNodes || []).filter((node) => {
        const [column, row] = String(node.coordinate).split(",").map(Number);
        return (
          node.rank > 0 &&
          !node.replacedBy &&
          String(node.coordinate) !== coordinate &&
          column >= bounds.left &&
          column < bounds.left + bounds.width &&
          row >= bounds.top &&
          row < bounds.top + bounds.height
        );
      });
      const count = nodes.filter((node) => node.type === "legendary").length;
      const seen = new Set();
      for (const node of nodes)
        for (const affix of prismNodeAffixes(prism, node.type, node.rank, count)) {
          if (!affix.active) continue;
          if (/^When activating 2 Legendary/.test(affix.effect)) {
            if (seen.has(affix.effect)) continue;
            seen.add(affix.effect);
            add(
              affix.effect.replace(/^When activating 2 Legendary Medium Talent within the area,\s*/, ""),
              `${panel.name} · Prism`,
            );
          } else add(affix.effect, `${panel.name} · Prism`, node.rank);
        }
    }
  }
  for (const slate of slates)
    for (const text of [...(slate.fixed || []), ...(slate.brands || []), ...(slate.copiedTalents || [])])
      add(withoutSlateCoreName(text), slate.name);
  for (const line of activeKismetEffects(pactState)) add(line.text, line.source);
  for (const spirit of pactState.selectedSpirits || []) {
    if (!spirit || pactState.activeSpirits?.[spirit] === false) continue;
    const nodes = orderedPactspiritNodes(pactspiritTrees[spirit]);
    const outer = nodes.findIndex((node) => node.ring === "outer");
    if (outer >= 0 && pactState.nativeNodeQuantities?.[`${spirit}:${outer}`] === 1)
      for (const text of pactspiritEffectsAtLevel(spirit, pactspiritLevel(spirit, pactState.spiritLevels)))
        add(text, spirit);
  }
  const maximum = 1 + sources.reduce((sum, source) => sum + source.value, 0);
  // Every curse skill on the board takes a curse slot (core audit B2 / B4, 2026-10-18). A curse skill is an enabled setup with
  // the curse role or the Curse tag (supports such as Deepened Curse carry the tag too and are left out).
  // Order (user-confirmed 2026-10-19, first in, first out by placement): curse skills take the slots in skill bar order, the
  // first curse on the bar slot 1, the next slot 2, up to the limit; Scorch has no priority. `setups` arrives in bar order
  // (packages/engine/src/planner.js curseBarOrder). A curse past the limit is not applied and does not set "Cursed". Gear, pact and other
  // triggered curses then fill the slots left (packages/engine/src/build-mechanics.js). A curse whose toggle is off takes no slot.
  const curseNames = [];
  for (const setup of setups) {
    if (!isCurseSkill(setup) || setup.enabled === false || curseNames.includes(setup.name)) continue;
    const toggle = CURSE_TOGGLES[setup.name];
    if (toggle && conditions[toggle] === false) continue;
    curseNames.push(setup.name);
  }
  return { maximum, sources, active: curseNames.slice(0, maximum), excluded: curseNames.slice(maximum) };
}

/** Setups in skill bar order (the board rows as displayed, trait grants included), then any other setup in saved order. */
export function curseBarOrder(setups, boardRows) {
  const rows = (boardRows || []).filter(Boolean);
  return [...rows, ...setups.filter((setup) => !rows.includes(setup))];
}

// Gear first in equipment slot order, then pacts (pactspirit nodes and Kismets), then every other triggered source in the
// modifier-text order (user-confirmed 2026-10-19).
const TRIGGER_SLOT_ORDER = equipmentSlots.map(([slot]) => slot);
export function triggeredCurseRank(curse) {
  if (curse?.origin === "gear") {
    const index = TRIGGER_SLOT_ORDER.indexOf(curse.slot);
    return index < 0 ? TRIGGER_SLOT_ORDER.length : index;
  }
  if (curse?.origin === "pact" || curse?.origin === "kismet") return 100;
  return 200;
}

/**
 * The curse slots of a planner result: the applied curses in slot order (skill bar curses, then triggered curses), the
 * ones left out by the limit, with the reason text the skill bar, gear and tooltips show, and the triggered curses that
 * duplicate one already applied (no slot; user decision 2026-10-19), each with its own reason and `duplicateOf`.
 */
export function curseSlotSummary(planner) {
  const limit = planner?.curseLimit;
  if (!limit) return null;
  const curses = planner?.mechanics?.curses || {};
  const applied = [
    ...(limit.active || []).map((name) => ({ name, kind: "skill", source: name })),
    ...(curses.active || []).map((curse) => ({ name: curse.name, kind: "trigger", source: curse.source })),
  ];
  const leftOut = [
    ...(limit.excluded || []).map((name) => ({ name, kind: "skill", source: name })),
    ...(curses.dropped || []).map((curse) => ({
      name: curse.name,
      kind: "trigger",
      source: curse.source,
      text: curse.text,
    })),
  ];
  const duplicates = (curses.duplicates || []).map((curse) => ({
    name: curse.name,
    kind: "trigger",
    source: curse.source,
    text: curse.text,
    duplicateOf: curse.duplicateOf,
    reason: curse.reason,
  }));
  return {
    maximum: limit.maximum,
    applied,
    leftOut,
    duplicates,
    reason: curseLimitReason(
      limit.maximum,
      applied.map((curse) => curse.name),
    ),
  };
}

/** "curse limit reached (N/N slots used by A, B)" */
export function curseLimitReason(maximum, appliedNames) {
  return `curse limit reached (${appliedNames.length}/${maximum} slots used by ${appliedNames.join(", ") || "none"})`;
}

// The curse skills with their own combat-condition toggle (packages/engine/src/planner.js conditions).
export const CURSE_TOGGLES = Object.freeze({ Scorch: "scorch", "Entangled Pain": "entangledPain" });

/** True for a curse skill: the curse role, or the Curse tag on a skill that is not a support. */
export function isCurseSkill(setup) {
  if (!setup) return false;
  const tags = setup.tags || [];
  return setup.role === "curse" || (tags.includes("Curse") && !tags.includes("Support"));
}
