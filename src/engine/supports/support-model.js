import { supportProgressionSs13 } from "../../data/skills/support-progression-ss13.generated.js";

// Stacking rule: https://tlidb.com/en/Damage_Calculation
// Values come from the TLIDB support progression tables (src/data/skills/support-progression-ss13.generated.js) at the
// support's level: https://tlidb.com/en/{Additional_Ignite,Control_Spell,Guard,Refracted_Prism,Cataclysm}
// Model parameters come from tooltips, never from held-out removal DPS.
export const modeledSupportNames = ["Additional Ignite", "Control Spell", "Guard", "Refracted Prism"];

// One progression cell → its numbers ("a/b" fractions, "a,b" pairs).
const cellNumbers = (raw) =>
  String(raw ?? "")
    .split(",")
    .map((part) => {
      const [top, bottom] = part.trim().replace(/−/g, "-").split("/").map(Number);
      return bottom ? top / bottom : top;
    });
function columnValues(name, heading, level) {
  const column = (supportProgressionSs13[name]?.columns || []).find(
    (item) => item.heading !== "Descript" && heading.test(item.heading),
  );
  const values = column ? cellNumbers(column.values?.[String(level)]) : [];
  if (!values.length || !values.every(Number.isFinite)) throw new Error(`${name}: no progression value at Lv.${level}`);
  return { values, heading: column.heading };
}
const baseLineNumber = (name, pattern) => {
  const match = String(supportProgressionSs13[name]?.baseEffect || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.match(pattern))
    .find(Boolean);
  return match ? Number(match[1].replace("−", "-").replace(/^\+/, "")) : null;
};

export function supportEffect(name, level) {
  if (!Number.isInteger(level) || level < 1 || level > 40) throw new RangeError("Support level must be 1–40");
  if (name === "Additional Ignite") {
    // "For each stack of Ignite an enemy has, the supported skill deals X% additional Ignite Damage to the enemy, up to Y%".
    const [perStack, cap] = columnValues(name, /^For each stack of Ignite an enemy has/i, level).values;
    // An Ignite chance line on the support's text (none today).
    const igniteChancePercent =
      baseLineNumber(name, /^\+?(\d+(?:\.\d+)?)% Ignite chance for the supported skill$/i) || 0;
    return { perStack, cap, igniteChancePercent };
  }
  if (name === "Cataclysm") {
    return {
      afflictionPerSecond: baseLineNumber(name, /inflicts (\d+(?:\.\d+)?) Affliction on the enemy/i) ?? 0,
      additionalAfflictionEffectPercent: columnValues(name, /^Affliction grants an additional/i, level).values[0],
    };
  }
  if (name === "Control Spell") {
    // "-50% Critical Strike Rating for the supported skill"; "X% additional Hit Damage for the supported skill" (hits only).
    const { values, heading } = columnValues(name, /additional (?:Hit )?Damage for the supported skill$/i, level);
    const criticalStrikeRatingPercent =
      baseLineNumber(name, /^([+\-−]?\d+(?:\.\d+)?)% Critical Strike Rating for the supported skill$/i) ?? 0;
    return { more: values[0], hitOnly: /additional Hit Damage/i.test(heading), criticalStrikeRatingPercent };
  }
  if (name === "Guard" || name === "Refracted Prism") {
    const { values, heading } = columnValues(name, /additional (?:Hit )?Damage for the supported skill$/i, level);
    return { more: values[0], hitOnly: /additional Hit Damage/i.test(heading) };
  }
  return null;
}
/** Control Spell's "±X% Critical Strike Rating for the supported skill" (0 when the text has none). */
export function controlSpellCriticalRatingPercent() {
  return supportEffect("Control Spell", 20).criticalStrikeRatingPercent;
}
export function additionalIgniteMultiplier(level = 30, stacks = 10) {
  const { perStack, cap } = supportEffect("Additional Ignite", level);
  return 1 + Math.min(Math.max(0, stacks) * perStack, cap) / 100;
}
// The captured baseline's spell crit: 500 rating × (1 + 126% increased + Control Spell's rating line) (5% base chance).
const capturedBaselineCritChance = () => 5 * (1 + (126 + controlSpellCriticalRatingPercent()) / 100);
export function calculateSupportCandidate(
  supports,
  baselineSupports,
  {
    igniteLimit = 10,
    additionalStacks = 15,
    critChance = capturedBaselineCritChance(),
    critDamage = 150,
    useEffectiveLevels = false,
  } = {},
) {
  const get = (name) => supports.find((s) => !s.custom && s.name === name);
  const active = (name) => get(name)?.enabled !== false && !!get(name);
  const level = (support) =>
    useEffectiveLevels ? Math.min(40, support.effectiveLevel ?? support.level) : support.level;
  // Hit-only lines (Control Spell) scale the spell hits, never Ignite.
  let generalFactor = 1,
    hitFactor = 1;
  for (const name of modeledSupportNames.filter((n) => n !== "Additional Ignite")) {
    const baseline = baselineSupports.find((s) => s.name === name);
    const baselineEffect = supportEffect(name, baseline.level);
    const factor =
      (active(name) ? 1 + supportEffect(name, level(get(name))).more / 100 : 1) / (1 + baselineEffect.more / 100);
    hitFactor *= factor;
    if (!baselineEffect.hitOnly) generalFactor *= factor;
  }
  const additional = active("Additional Ignite");
  const additionalFactor =
    (additional ? additionalIgniteMultiplier(level(get("Additional Ignite")), igniteLimit) : 1) /
    additionalIgniteMultiplier(30, 10);
  const candidateAdditionalStacks = Math.max(0, additionalStacks - (additional ? 0 : 1));
  const disintegrateEnabled = active("Scorching Beam: Disintegrate (Noble)");
  const disintegrate = get("Scorching Beam: Disintegrate (Noble)");
  const disintegrateRoll = (disintegrate?.roll ?? 26) / 100;
  const disintegrateStarFactor = 1 + (disintegrate?.starAdditionalDamagePercent ?? 20) / 100;
  const disintegrateFactor =
    (disintegrateEnabled ? (1 + candidateAdditionalStacks * disintegrateRoll) * disintegrateStarFactor : 1) /
    ((1 + additionalStacks * 0.26) * 1.2);
  // Captured base spell crit chance is 5% (500 rating); Control Spell changes the increased rating by its text's value.
  const criticalChancePercent = Math.min(
    100,
    critChance + (active("Control Spell") ? 0 : (-5 * controlSpellCriticalRatingPercent()) / 100),
  );
  const critFactor =
    (1 + (criticalChancePercent / 100) * (critDamage / 100 - 1)) / (1 + (critChance / 100) * (critDamage / 100 - 1));
  return {
    generalFactor,
    hitFactor,
    additionalFactor,
    disintegrateFactor,
    candidateAdditionalStacks,
    criticalChancePercent,
    spellFactor: (hitFactor * critFactor * (disintegrateEnabled ? disintegrateStarFactor : 1)) / 1.2,
    // The town sheet has no enemy Ignite stacks, but it does count the extra
    // inflicted stack through Disintegrate (Noble). Combat uses both effects.
    townIgniteFactor: generalFactor * disintegrateFactor,
    igniteFactor: generalFactor * additionalFactor * disintegrateFactor,
  };
}
