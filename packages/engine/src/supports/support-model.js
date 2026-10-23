import { supportProgression } from "../../data/skills/support-progression.generated.js";

// Stacking rule: https://tlidb.com/en/Damage_Calculation
// Values come from the TLIDB support progression tables (packages/engine/data/skills/support-progression.generated.js) at the
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
  const column = (supportProgression[name]?.columns || []).find(
    (item) => item.heading !== "Descript" && heading.test(item.heading),
  );
  const values = column ? cellNumbers(column.values?.[String(level)]) : [];
  if (!values.length || !values.every(Number.isFinite)) throw new Error(`${name}: no progression value at Lv.${level}`);
  return { values, heading: column.heading };
}
const baseLineNumber = (name, pattern) => {
  const match = String(supportProgression[name]?.baseEffect || "")
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
