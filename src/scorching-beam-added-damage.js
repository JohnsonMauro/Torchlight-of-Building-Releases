import { effectiveGearModifierTexts } from "./engine.js";
import { stripGrantedCore } from "./granted-core-lines.js";
import { kismetCatalogSs13 } from "./data/pacts/kismet-catalog-ss13.js";
import { kismetAffixesWithRolls } from "./kismet-crafting.js";
import { microFateEffectScale, scaleKismetAffix } from "./kismet-effects.js";
// SS13 Added Fire Damage progression, sourced from the support's TLIDB table.
const fireSupportMin = [1,2,3,4,4,5,6,6,8,9,11,12,13,14,18,25,35,42,60,73,74,74,75,76,76,77,77,78,79,80,81,81,82,83,83,84,85,86,87,89];
const fireSupportMax = [3,4,5,7,8,9,10,12,14,17,20,22,24,26,33,46,65,78,111,135,137,138,140,141,142,144,145,147,148,150,151,153,154,156,157,159,160,162,164,165];

function fireSupportRange(level) {
  const index = Math.max(0, Math.min(39, Math.floor(level) - 1));
  return { min: fireSupportMin[index], max: fireSupportMax[index] };
}

// Only Fire damage granted to spells is included. Weapon-local and attack-only
// ranges do not add damage to Scorching Beam.
export function scorchingBeamAddedDamage({ main, equipment, slates, equippedSlateIds = [], talents, pacts } = {}) {
  const sources = [];
  const unmodeled = [];
  const collect = (source, rawText, allowUnqualified = false, multiplier = 1) => {
    if (multiplier <= 0) return;
    // Split on "|" with or without spaces (a bare "|", e.g. "… Iris|Vigilant Breeze", recursed forever when the split
    // needed spaces: gear-pact batch G13), " · " and newlines; recurse only when the split actually made progress.
    const clauses = rawText.split(/\s*\|\s*|\s+·\s+|\s*\n\s*/);
    if (clauses.length > 1) {
      for (const clause of clauses) if (clause.trim()) collect(source, clause.trim(), allowUnqualified, multiplier);
      return;
    }
    const unbracketed = stripGrantedCore(rawText); // "[Core] body" reads as its body (gear-pact batch G2)
    const text = unbracketed.includes(": ") ? unbracketed.slice(unbracketed.lastIndexOf(": ") + 2) : unbracketed;
    if (!/\badds\b/i.test(text) || !/\b(?:fire|cold|lightning) damage\b/i.test(text)) return;
    if (/^Adds\s+[\d.]+\s*[–-]\s*[\d.]+\s+(?:Fire|Cold|Lightning) Damage to (?:Attacks|Minions|the gear)$/i.test(text)) return;
    const match = text.match(/^Adds\s+(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s+(?:Fire|Cold|Lightning) Damage(\s+to\s+(?:Spells|Attacks and Spells|your Attacks and Spells|your and your Minions['’] Attacks and Spells))?$/i);
    if (match && (match[3] || allowUnqualified)) sources.push({ source, min: Number(match[1]) * multiplier, max: Number(match[2]) * multiplier });
    else unmodeled.push({ source, text });
  };
  for (const item of equipment?.candidateItems || []) {
    for (const text of effectiveGearModifierTexts(item)) collect(item.name, text);
  }
  const enabledSlates = new Set(equippedSlateIds);
  for (const slate of slates?.slates || []) if (enabledSlates.has(slate.id)) {
    for (const text of [...(slate.fixed || []), ...(slate.brands || [])]) collect(slate.name, text, true);
  }
  for (const panel of talents?.panels || []) for (const node of panel.allocatedNodes || []) if (node.rank > 0 && !node.replacedBy) {
    for (const text of (node.description || "").split("|")) collect(`${panel.name}: ${node.name || "talent"}`, text.trim(), true, node.rank * (node.inverseEffectMultiplier ?? 1));
  }
  if (pacts?.kismetSlotMode) for (const [key, slot] of Object.entries(pacts.kismetSlots || {})) {
    const spirit = (pacts.selectedSpirits || []).find((name) => name && key.startsWith(`${name}:`) && pacts.activeSpirits?.[name] !== false);
    if (!spirit || (!key.includes(":extra:") && pacts.nativeNodeQuantities?.[key] !== 1)) continue;
    const entry = kismetCatalogSs13.find((item) => item.name === slot.name);
    // A Micro Fate in a spirit with Star Trail carries its boosted value (src/kismet-effects.js; pact badge audit 2026-10-13).
    const { scale } = microFateEffectScale(pacts, key);
    if (entry) for (const text of kismetAffixesWithRolls(entry, slot.rolls)) collect(`${spirit}: ${entry.name}`, scaleKismetAffix(text, scale), true);
  }
  for (const support of main?.supports || []) {
    if (support.name !== "Added Fire Damage" || !support.enabled) continue;
    const range = fireSupportRange(support.effectiveLevel || support.level || 20);
    if (range) sources.push({ source: "Added Fire Damage support", ...range });
  }
  return {
    effectiveness: 0.41,
    sources,
    unmodeled,
    raw: sources.reduce((sum, source) => ({ min: sum.min + source.min, max: sum.max + source.max }), { min: 0, max: 0 }),
    effective: sources.reduce((sum, source) => ({ min: sum.min + source.min * 0.41, max: sum.max + source.max * 0.41 }), { min: 0, max: 0 })
  };
}
