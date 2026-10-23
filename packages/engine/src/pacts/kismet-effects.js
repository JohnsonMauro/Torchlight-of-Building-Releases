import { normalizePercentageText } from "../text/percentage-text.js";
import { kismetCatalogSs14 } from "../../data/pacts/kismet-catalog-ss14.js";
import { pactspiritTreesSs14 } from "../../data/pacts/pactspirit-trees-ss14.js";
import { orderedPactspiritNodes } from "./pactspirit-levels.js";
import { fateExtraSlots } from "./fate-slot-unlocks.js";
import { kismetAffixesWithRolls, normalizeKismetRolls } from "./kismet-crafting.js";

// Kismet: Star Trail (game affix 225623344, "+P1% for the effects of Micro Fates in the same Pact Branch"; the affix has no
// client-side effect rows). User-stated 2026-10-13 (the Cloudgatherer - Violet pact holds 3 Star Trails, so its Micro Fates
// should get a bigger boost): every allocated Star Trail in a pact spirit boosts every allocated Micro Fate in that same spirit,
// additively, so 3 × 45% = +135% and each "+3% Aura Effect" reads +7.05%. This replaces the earlier provisional per-branch reading
// (inner slots 2k − 1 / 2k with mid slot 20 + k, from config_contractPoint). Fate slots count as part of the spirit while the
// destiny node is allocated, like activeKismetEffects (provisional: the user's statement names the spirit, not the slot kinds).
// Several Star Trails add up (duplicate kismets stack additively, user-confirmed for Micro Fates 2026-10-11).
const STAR_TRAIL = /^\+?(\d+(?:\.\d+)?)% for the effects of Micro Fates in the same Pact Branch$/i;

const spiritOfSlot = (key) =>
  String(key ?? "")
    .replace(/:extra:(?:micro|medium):\d+$/, "")
    .replace(/:\d+$/, "");

/** The allocated kismet slot keys of a pact spirit: inner and mid nodes, plus its Fate slots while the destiny node is allocated. */
export function activeKismetSlotKeys(state = {}, spirit) {
  const nodes = orderedPactspiritNodes(pactspiritTreesSs14[spirit]);
  const keys = nodes.flatMap((node, index) =>
    ["inner", "mid"].includes(node.ring) && state.nativeNodeQuantities?.[`${spirit}:${index}`] === 1
      ? [`${spirit}:${index}`]
      : [],
  );
  const destiny = nodes.findIndex((node) => node.ring === "destiny");
  if (destiny >= 0 && state.nativeNodeQuantities?.[`${spirit}:${destiny}`] === 1)
    keys.push(...fateExtraSlots(spirit, state.fateUnlocks?.[spirit]).map((slot) => slot.key));
  return keys;
}

/**
 * Star Trail boost on a Micro Fate slot: 1 + Σ (Star Trail %) / 100 over the allocated Star Trail slots of the same pact spirit
 * (user-stated 2026-10-13), with the sources. Other kismet kinds and unallocated slots get 1.
 */
export function microFateEffectScale(state = {}, key) {
  const slot = state.kismetSlots?.[key];
  const entry = slot && kismetCatalogSs14.find((item) => item.name === slot.name);
  const none = { scale: 1, percent: 0, sources: [] };
  if (entry?.kind !== "micro") return none;
  const spirit = spiritOfSlot(key);
  const keys = activeKismetSlotKeys(state, spirit);
  if (!keys.includes(key)) return none;
  const sources = [];
  for (const other of keys) {
    const otherSlot = state.kismetSlots?.[other];
    const otherEntry = otherSlot && kismetCatalogSs14.find((item) => item.name === otherSlot.name);
    if (!otherEntry) continue;
    for (const text of kismetAffixesWithRolls(otherEntry, normalizeKismetRolls(otherEntry, otherSlot.rolls))) {
      const match = normalizePercentageText(text).trim().match(STAR_TRAIL);
      if (match) sources.push({ key: other, source: `${spirit} · ${otherEntry.name}`, value: Number(match[1]) });
    }
  }
  const percent = sources.reduce((sum, item) => sum + item.value, 0);
  return { scale: 1 + percent / 100, percent, sources };
}

/** A kismet affix with its first number multiplied by `scale` (Micro Fate affixes carry one value each). */
export function scaleKismetAffix(text, scale) {
  if (!(scale > 0) || scale === 1) return text;
  return String(text).replace(/\d+(?:\.\d+)?/, (value) => String(Math.round(Number(value) * scale * 10000) / 10000));
}

/** The affix texts of the kismet in `key`, with a Star Trail boost applied to Micro Fates. */
export function kismetSlotTexts(state = {}, key, rolls = undefined) {
  const slot = state.kismetSlots?.[key];
  const entry = slot && kismetCatalogSs14.find((item) => item.name === slot.name);
  if (!entry) return [];
  const { scale } = microFateEffectScale(state, key);
  return kismetAffixesWithRolls(entry, rolls ?? normalizeKismetRolls(entry, slot.rolls)).map((text) =>
    scaleKismetAffix(text, scale),
  );
}

/**
 * Display text for a kismet affix: the rolled text, plus the effective value when a Star Trail boosts it, e.g.
 * "+3% Aura Effect → 4.35% (Star Trail +45%)". The stored roll is unchanged; the calculation reads scaleKismetAffix.
 */
export function boostedKismetAffixText(text, boost) {
  const rolled = String(text ?? "");
  if (!boost || !(boost.scale > 0) || boost.scale === 1) return rolled;
  const match = rolled.match(/(-?)(\d+(?:\.\d+)?)(%?)/);
  if (!match) return rolled;
  const effective = Math.round(Number(match[2]) * boost.scale * 10000) / 10000;
  return `${rolled} → ${match[1]}${effective}${match[3]} (Star Trail +${Math.round(boost.percent * 10000) / 10000}%)`;
}

/** "Star Trail +135%" for a boost (the tooltip's secondary text), or "" when nothing boosts the slot. */
export function starTrailNote(boost) {
  if (!boost || !(boost.scale > 0) || boost.scale === 1) return "";
  return `Star Trail +${Math.round(boost.percent * 10000) / 10000}%`;
}

/** The display texts of the kismet in `key` (rolled values, with the Star Trail effective value where boosted). */
export function kismetSlotDisplayTexts(state = {}, key, rolls = undefined) {
  const slot = state.kismetSlots?.[key];
  const entry = slot && kismetCatalogSs14.find((item) => item.name === slot.name);
  if (!entry) return [];
  const boost = microFateEffectScale(state, key);
  return kismetAffixesWithRolls(entry, rolls ?? normalizeKismetRolls(entry, slot.rolls)).map((text) =>
    boostedKismetAffixText(text, boost),
  );
}

export function activeKismetEffects(state = {}) {
  const lines = [];
  for (const spirit of state.selectedSpirits || []) {
    if (!spirit || state.activeSpirits?.[spirit] === false) continue;
    for (const key of activeKismetSlotKeys(state, spirit)) {
      const slot = state.kismetSlots?.[key];
      const entry = slot && kismetCatalogSs14.find((item) => item.name === slot.name);
      if (!entry) continue;
      // A Micro Fate in a spirit with Star Trail carries its boosted value; `baseText` keeps the rolled one (pact badge audit 2026-10-13).
      const boost = microFateEffectScale(state, key);
      for (const baseText of kismetAffixesWithRolls(entry, normalizeKismetRolls(entry, slot.rolls))) {
        const text = scaleKismetAffix(baseText, boost.scale);
        lines.push({
          source: `${spirit} · ${entry.name}`,
          name: entry.name,
          text,
          key,
          ...(boost.scale !== 1 ? { baseText, effectScale: boost.scale, starTrail: boost.sources } : {}),
        });
      }
    }
  }
  return lines;
}

export function parseKismetEffect(text) {
  text = normalizePercentageText(text);
  const match = text.match(/^([+-]?[\d.]+)% (.+)$/);
  const stat =
    match &&
    {
      damage: "damagePercent",
      "spell damage": "spellDamagePercent",
      "elemental damage": "elementalDamagePercent",
      "fire damage": "fireDamagePercent",
      "damage over time": "damageOverTimePercent",
      "cast speed": "castSpeedPercent",
      "attack and cast speed": "attackAndCastSpeedPercent",
      "aura effect": "auraEffectPercent",
      "affliction effect": "afflictionEffectPercent",
      "reaping duration": "reapingDurationPercent",
      "reaping recovery speed": "reapingRecoverySpeedPercent",
      "critical strike rating": "criticalStrikeRatingPercent",
      "critical strike damage": "criticalStrikeDamagePercent",
      "chance to ignite targets": "chanceToIgniteTargetsPercent",
      "ignite chance": "chanceToIgniteTargetsPercent",
      "chance to inflict damaging ailments": "damagingAilmentChancePercent",
      "additional ignite duration": "additionalIgniteDurationPercent",
      "ailment duration": "ailmentDurationPercent",
      "fire resistance": "fireResistancePercent",
      "cold resistance": "coldResistancePercent",
      "lightning resistance": "lightningResistancePercent",
      "erosion resistance": "erosionResistancePercent",
      "elemental resistance": "elementalResistancePercent",
      "chance to avoid damage": "damageAvoidanceChancePercent",
      "additional damage": "outgoingAdditionalDamagePercent",
      "additional damage over time": "additionalDamageOverTimePercent",
      "additional damage taken": "additionalDamageTakenPercent",
    }[match[2].toLowerCase()];
  if (stat) return { stat, value: Number(match[1]) };
  if (/^\+1 Ignite limit$/i.test(text)) return { stat: "igniteLimit", value: 1 };
  return null;
}
