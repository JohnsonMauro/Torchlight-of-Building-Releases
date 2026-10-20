import { supportEffect } from "../supports/support-model.js";
import { slateAdditionalFireLines } from "../theoretical-sources.js";

const value = (ledger, stat, type) => ledger?.[`${stat}:${type}`] || 0;

// Source-side hit modifiers. This ledger is independent of any recorded town
// spell-DPS value; unrecognized affixes stay outside the estimate.
export function scorchingBeamHitModifiers({
  blurEffects,
  blessings = { damageSources: [] },
  aim,
  curses = { scorchDamagePercent: 45 },
  block = { damageSources: [] },
  coreTalents = { lines: [] },
  enemyOnTideDamageTakenPercent = 20,
  tideEffectFactor = 1,
  waveAriaPercent = 16,
  idyllPerStackPercent = 1.6,
  heroMemories = { lines: [] },
  main,
  talentSlate,
  equipment,
  pact,
  aura,
  heroId,
  conditions = {},
  idyllStacks = 15,
  extraSources = [],
  intelligenceAdjustment = { extraFlat: 0, percent: 0 },
} = {}) {
  const talent = talentSlate?.candidateTalent || {};
  const slate = talentSlate?.candidateSlate || {};
  const gear = equipment?.candidate || {};
  const spirits = pact?.totals || {};
  const ledger = [];
  const add = (source, bucket, percent) => {
    if (Number.isFinite(percent) && percent !== 0) ledger.push({ source, bucket, percent });
  };
  for (const line of heroMemories.lines) {
    if (["damagePercent", "elementalDamagePercent", "firedamage", "spelldamage"].includes(line.stat))
      add(line.source + ": " + line.text, "increased", line.value);
  }
  const memoryIntelligence =
    heroMemories.totals?.["intelligence:flat"] ??
    heroMemories.lines.filter((line) => line.stat === "intelligence").reduce((sum, line) => sum + line.value, 0);
  const totalIntelligence =
    (memoryIntelligence + value(equipment?.candidate, "intelligence", "flat") + intelligenceAdjustment.extraFlat) *
    (1 + intelligenceAdjustment.percent / 100) *
    (intelligenceAdjustment.additionalFactor ?? 1);
  add("Total Intelligence (0.5% per point)", "additional", totalIntelligence * 0.5);
  for (const line of coreTalents.lines)
    if (["additionalDamagePercent", "additionalFireHitDamagePercent"].includes(line.stat))
      add("Core talent: " + line.source, "additional", line.value);
  for (const line of blurEffects?.damageSources || []) if (line.hit) add(line.source, "additional", line.value);
  for (const line of blessings.damageSources) add(line.source, "additional", line.value);
  for (const line of blessings.increasedSources || []) add(line.source, "increased", line.value);
  for (const line of block.damageSources) add(line.source + ": Blocked recently", "increased", line.value);
  if (conditions.targetLife !== false) {
    add("Talents: additional damage applied to Life", "additional", talent.additionalDamageToLifePercent);
    add("Slates: additional damage applied to Life", "additional", slate.additionalDamageToLifePercent);
  }
  add("Talents: Damage", "increased", talent.damagePercent);
  add("Slates: Damage", "increased", slate.damagePercent);
  if (main?.tags?.includes("Area")) {
    add("Talents: Area Damage", "increased", talent.areaDamagePercent);
    add("Slates: Area Damage", "increased", slate.areaDamagePercent);
  }
  add("Gear: Damage", "increased", value(gear, "damagePercent", "increased"));
  add("Gear: Elemental Damage", "increased", value(gear, "elementalDamagePercent", "increased"));
  add("Gear: additional Fire Damage", "additional", value(gear, "additionalFireDamagePercent", "more"));
  for (const support of main?.supports || []) {
    if (support.enabled === false) continue;
    if (["Control Spell", "Guard", "Refracted Prism"].includes(support.name)) {
      add(
        `${support.name} support`,
        "additional",
        supportEffect(support.name, Math.min(40, support.effectiveLevel || support.level || 20)).more,
      );
    } else if (support.name === "Fire Explosion") {
      const level = Math.max(1, Math.min(40, support.effectiveLevel || support.level || 20));
      add("Fire Explosion support", "additional", 15.5 + (level - 1) * 0.5);
    } else if (support.name === "Scorching Beam: Disintegrate (Noble)") {
      // "+X% additional damage for the supported skill" (star bonus, +20% at the default rating):
      // covers the beam's hits as well as its Ignite (panel Skill category ×7.76 needs it).
      add("Disintegrate (Noble) support: stars", "additional", support.starAdditionalDamagePercent ?? 20);
    }
  }
  const slateFireLines = slateAdditionalFireLines(talentSlate, slate.additionalFireDamagePercent || 0);
  for (const percent of slateFireLines)
    add(
      slateFireLines.length > 1
        ? `Slates: additional Fire Damage (+${percent}% line)`
        : "Slates: additional Fire Damage",
      "additional",
      percent,
    );
  add("Slates: additional Max Damage", "max", slate.additionalMaxDamagePercent);
  for (const entry of aura?.entries || []) {
    add(entry.name + " aura: Fire Damage", "additional", entry.effectiveEffects?.additionalFireDamagePercent);
    if (main?.tags?.includes("Spell"))
      add(entry.name + " aura: Spell Damage", "additional", entry.effectiveEffects?.additionalSpellDamagePercent);
    if (main?.tags?.includes("Area"))
      add(entry.name + " aura: Area Damage", "additional", entry.effectiveEffects?.additionalAreaDamagePercent);
  }
  add("Pacts: Damage", "increased", spirits.damagePercent);
  add("Pacts: Spell Damage", "increased", spirits.spellDamagePercent);
  add("Pacts: Elemental Damage", "increased", spirits.elementalDamagePercent);
  add("Pacts: Fire Damage", "increased", spirits.fireDamagePercent);
  // Each pact / kismet "+X% additional damage" line multiplies on its own (game: attr 5719 operation 4; src/engine/engine.js
  // outgoingAdditionalDamageLines; pact badge audit 2026-10-13). One line keeps the aggregate label.
  const pactAdditionalLines = (pact?.outgoingAdditionalDamageLines || []).filter((line) => line.value);
  if (pactAdditionalLines.length > 1)
    for (const line of pactAdditionalLines) {
      if (Number.isFinite(line.value) && line.value !== 0)
        ledger.push({
          source: `Pacts: additional Damage (${line.source})`,
          bucket: "additional",
          percent: line.value,
          text: line.text,
        });
    }
  else add("Pacts: additional Damage", "additional", spirits.outgoingAdditionalDamagePercent);
  if (heroId === "selena-sing-with-the-tide") add("Selena level 10: Bard state", "additional", -20);
  if (heroId === "selena-sing-with-the-tide") {
    if (conditions.tideContact) add("Tide Contact", "additional", 15 * tideEffectFactor);
    if (conditions.onTheTide) add("On the Tide", "additional", enemyOnTideDamageTakenPercent);
    // Buff 82304 owns all three source modifiers; Wave Aria also checks the target Tide state.
    if (conditions.tideContact && conditions.onTheTide && conditions.waveAria)
      add("Wave Aria", "additional", waveAriaPercent * tideEffectFactor);
    if (conditions.tideContact && conditions.idyll)
      add(
        "Idyll of the Tide",
        "additional",
        Math.max(0, Math.min(15, idyllStacks)) * idyllPerStackPercent * tideEffectFactor,
      );
  }
  if (conditions.aim && aim?.active) add("Aim with linked supports", "additional", aim.averageDamagePercent);
  if (conditions.scorch) add("Scorch", "additional", curses.scorchDamagePercent);
  if (conditions.fireInfiltration) add("Fire Infiltration", "additional", 13);
  // Min / Max Damage lines keep the line they came from (`lineText`; the coverage badges match it).
  for (const line of extraSources) {
    if (line.lineText && Number.isFinite(line.percent) && line.percent !== 0)
      ledger.push({ source: line.source, bucket: line.bucket, percent: line.percent, lineText: line.lineText });
    else add(line.source, line.bucket, line.percent);
  }
  const increasedPercent = ledger
    .filter((entry) => entry.bucket === "increased")
    .reduce((sum, entry) => sum + entry.percent, 0);
  const additionalFactor = ledger
    .filter((entry) => entry.bucket === "additional")
    .reduce((factor, entry) => factor * (1 + entry.percent / 100), 1);
  const maxDamageFactor = ledger
    .filter((entry) => entry.bucket === "max")
    .reduce((factor, entry) => factor * (1 + entry.percent / 100), 1);
  // "+/-X% additional Min Damage" (2026-10-14): the packets' lower roll; a negative total floors at 0 (as src/engine/skills/skill-hit-model.js).
  const minDamageFactor = Math.max(
    0,
    ledger.filter((entry) => entry.bucket === "min").reduce((factor, entry) => factor * (1 + entry.percent / 100), 1),
  );
  return {
    ledger,
    increasedPercent,
    increasedFactor: Math.max(0, 1 + increasedPercent / 100),
    additionalFactor,
    maxDamageFactor,
    minDamageFactor,
    damageFactor: Math.max(0, 1 + increasedPercent / 100) * additionalFactor,
  };
}
