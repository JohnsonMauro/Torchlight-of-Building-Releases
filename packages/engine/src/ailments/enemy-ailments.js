import { buildWideAilmentBlock } from "./ailment-blocks.js";
import { normalizePercentageText } from "../text/percentage-text.js";
import { supportProgression } from "../../data/skills/support-progression.generated.js";
import { collectAilmentTypedSources, collectDamagingAilmentChance } from "./ailment-model.js";
import { inflictedFrostbiteRating, BUFF_VALUES } from "../combat-states.js";
import { allSkillEffects } from "../../data/skills/all-skill-effects.generated.js";

// TLIDB Ailment page: Ailments are Ignite, Frostbite, Freeze, Shock, Numbed, Trauma, and Wilt.
// Damaging ailments need a non-zero base. Numbed only raises Lightning damage taken (+5% per
// stack); Frostbite raises Cold damage taken (+1% per Frostbite Rating, packages/engine/src/combat-states.js); Freeze needs 100 or more
// Frostbite Rating (user-confirmed 2026-10-18; TLIDB says "more than 100").
// Which ailments the target carries. Damaging ailments (Ignite, Trauma, Wilt) come
// from the build's base sources; non-damaging elemental ailments (Frostbite, Numbed)
// come from supports such as Glacial Freeze / High Voltage — "Inflicts <X> when the
// supported skill deals Hit <Type> Damage" — on any active skill that actually deals
// that damage type (its own tag, or added <Type> Damage to its Spells/Attacks).

export const damagingAilments = ["Ignite", "Trauma", "Wilt"];
export const ailmentStateNames = {
  Ignited: "Ignite",
  Traumatized: "Trauma",
  Withered: "Wilt",
  Wilted: "Wilt",
  Frostbitten: "Frostbite",
  Numbed: "Numbed",
  Frozen: "Frozen",
};

const supportText = (support) =>
  [...(support.effects || []), supportProgression[support.name]?.baseEffect || ""].join("\n");

const DAMAGE_TYPES = ["Physical", "Fire", "Cold", "Lightning", "Erosion"];

// Whether an active skill deals <type> damage: its own tag, added <type> Damage to its Spells / Attacks, or a conversion
// ("Converts N% of <From> Damage to <type> Damage") of a type it deals by tag or added damage (one step, no chains).
function dealsHitDamage(setup, type, modifierTexts, { conversion = true } = {}) {
  if ((setup.tags || []).includes(type)) return true;
  const kinds = (setup.tags || []).filter((tag) => tag === "Spell" || tag === "Attack");
  const added =
    kinds.length &&
    modifierTexts.some((line) => {
      const match = normalizePercentageText(line.text).match(
        new RegExp(`^Adds [\\d.]+ ?[-–] ?[\\d.]+ ${type} Damage to (Attacks and Spells|Spells|Attacks)$`, "i"),
      );
      return match && (match[1] === "Attacks and Spells" || kinds.some((kind) => match[1].startsWith(kind)));
    });
  if (added || !conversion) return Boolean(added);
  return modifierTexts.some((line) => {
    const match = normalizePercentageText(line.text).match(
      /^Converts [\d.]+% of (Physical|Fire|Cold|Lightning|Erosion) Damage to (Physical|Fire|Cold|Lightning|Erosion) Damage$/i,
    );
    const from = match && DAMAGE_TYPES.find((name) => name.toLowerCase() === match[1].toLowerCase());
    return (
      Boolean(match) &&
      match[2].toLowerCase() === type.toLowerCase() &&
      from !== type &&
      dealsHitDamage(setup, from, modifierTexts, { conversion: false })
    );
  });
}

// `applierNames`: other active hitting skills that can apply hit ailments (packages/engine/src/ailments/ailment-applications.js), so a
// damaging ailment counts when any of them is active, not only the main skill.
// `auraChance` ({ ailment, ignite }): the active Auras' chance (Ailment Amplification, Flame Focus), which no text line carries;
// the Ignite ledger and the per-skill chance (packages/engine/src/ailments/ailment-applications.js) count it too.
export function collectEnemyAilments({
  setups = [],
  activeNames = new Set(),
  modifierTexts = [],
  mainName = "Scorching Beam",
  applierNames = [],
  auraChance = null,
} = {}) {
  const types = new Map();
  const add = (name, damaging, source, reason) => {
    if (!types.has(name)) types.set(name, { name, damaging, source, reason });
  };
  const mainActive = activeNames.has(mainName) || applierNames.some((name) => activeNames.has(name));
  const genericChance =
    collectDamagingAilmentChance(modifierTexts).reduce((sum, line) => sum + line.value, 0) +
    (Number(auraChance?.ailment) || 0);
  for (const key of ["ignite", "trauma", "wilt"]) {
    const typed = collectAilmentTypedSources(key, modifierTexts);
    const chance =
      typed.chance.reduce((sum, line) => sum + line.value, 0) +
      genericChance +
      (key === "ignite" ? Number(auraChance?.ignite) || 0 : 0);
    if (mainActive && typed.base.length && chance > 0)
      add(key[0].toUpperCase() + key.slice(1), true, typed.base[0].source, "Base damage and chance to inflict");
  }
  for (const setup of setups) {
    if (!activeNames.has(setup.name)) continue;
    for (const support of setup.supports || []) {
      if (support.enabled === false) continue;
      for (const match of supportText(support).matchAll(
        /Inflicts (Frostbite|Numbed) when the supported skill deals Hit (\w+) Damage/gi,
      )) {
        if (dealsHitDamage(setup, match[2], modifierTexts))
          add(match[1], false, `${setup.name}: ${support.name}`, `${setup.name} deals Hit ${match[2]} Damage`);
      }
    }
  }
  // A skill's own text "Inflicts Frostbite when this skill deals damage" (Frost Terra: any of its damage, its DoT
  // included) on an active setup. The Hit-only wordings ("… deals Hit Cold Damage": Ice Shot, Permafrost Cast) are
  // not read here yet.
  for (const setup of setups) {
    if (setup.enabled === false || !activeNames.has(setup.name)) continue;
    const text = [...(allSkillEffects[setup.name] || []), ...(setup.effects || [])].join("\n");
    const match = text.match(/^Inflicts (Frostbite|Numbed) when this skill deals damage$/im);
    if (match)
      add(
        match[1][0].toUpperCase() + match[1].slice(1).toLowerCase(),
        false,
        `${setup.name}: skill text`,
        `${setup.name}: "${match[0]}"`,
      );
  }
  for (const line of modifierTexts) {
    const match = normalizePercentageText(line.text).match(
      /^Inflicts (Frostbite|Numbed) (?:on hit|when dealing (?:Hit )?(\w+) Damage)$/i,
    );
    if (!match || !mainActive) continue;
    // A typed wording ("when dealing Hit Lightning Damage") needs an active hitting skill (the main skill or another
    // applier) that deals that type, the same rule as the support path above.
    const type = match[2] && DAMAGE_TYPES.find((name) => name.toLowerCase() === match[2].toLowerCase());
    if (!type) {
      add(match[1], false, line.source, "Inflicted on hit");
      continue;
    }
    const dealer = setups.find(
      (setup) =>
        setup.enabled !== false &&
        activeNames.has(setup.name) &&
        (setup.name === mainName || applierNames.includes(setup.name)) &&
        dealsHitDamage(setup, type, modifierTexts),
    );
    if (dealer) add(match[1], false, line.source, `${dealer.name} deals Hit ${type} Damage`);
  }
  // Freeze (TLIDB keyword 707 / manual): "When a unit's Frostbite Rating exceeds 100, it becomes Frozen"; the build's
  // inflicted rating is 10 + Max Frostbite Rating lines (user-confirmed 2026-10-18: Frozen at 100 or higher), capped at 120 (packages/engine/src/combat-states.js; provisional reading).
  // Inflicting Freeze also makes "Inflicts Frostbite when …" lines (e.g. the Prophet core Frostbitten) count.
  // ("Inflicts Frostbite when dealing Hit Cold Damage" is read above: it needs a skill that deals Cold.)
  for (const line of modifierTexts) {
    const match = normalizePercentageText(line.text).match(/^Upon inflicting damage, inflicts Frostbite$/i);
    if (match && mainActive) add("Frostbite", false, line.source, "Inflicted on hit");
  }
  // Kismet: Ice Soul (game affix 494613472: the Frostbite ailment on enemies within 6 m, no hit needed; holds close and at the
  // Distant 6 m alternative) and Dual Kismet: Bounded Holy Maiden ("Inflicts Paralysis, Blind, Weaken, Slow, Taunt, and
  // Frostbite on hit", game affix 908139264): the dummy is Frostbitten (pact scripted-effects batch 2026-10-13).
  for (const line of modifierTexts) {
    const text = normalizePercentageText(String(line.text)).trim();
    if (/^Inflicts Frostbite on nearby enemies$/i.test(text))
      add("Frostbite", false, line.source, "Frostbite on Nearby enemies (within 6 m)");
    if (/^Inflicts Paralysis, Blind, Weaken, Slow, Taunt, and Frostbite on hit$/i.test(text) && mainActive)
      add("Frostbite", false, line.source, "Inflicted on hit");
  }
  // The follower's skills (packages/engine/src/followers/follower-model.js FOLLOWER_MARKERS, 2026-10-17): "The Follower inflicts <Ailment> on the dummy" —
  // the dummy carries an ailment the follower inflicts whoever deals the main damage (provisional: the follower casts at its
  // cadence and keeps it applied).
  for (const line of modifierTexts) {
    const match = normalizePercentageText(String(line.text))
      .trim()
      .match(/^The Follower inflicts (Trauma|Wilt|Ignite|Numbed|Frostbite) on the dummy$/i);
    if (match) {
      const name = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
      add(name, damagingAilments.includes(name), line.source, "inflicted by the follower's skill");
    }
  }
  // Gemma – Frostbitten Heart (hero trait audit B3, 2026-10-19; packages/engine/src/heroes/gemma-traits.js): "When dealing Cold Damage, triggers Cold
  // Pulse at the enemy's location. Interval: 4 s" and "Inflicts Frostbite when Cold Pulse hits an enemy": an active skill that
  // deals Cold Damage (its tag, added Cold, a conversion to Cold) keeps the dummy Frostbitten (held between pulses, as every
  // Frostbite source here; provisional). Read last, so another Frostbite source keeps its own reason.
  const coldPulse = modifierTexts.some((line) =>
    /^When dealing Cold Damage, triggers Cold Pulse/i.test(normalizePercentageText(String(line.text)).trim()),
  );
  const pulseFrostbite = modifierTexts.some((line) =>
    /^Inflicts Frostbite when Cold Pulse hits an enemy$/i.test(normalizePercentageText(String(line.text)).trim()),
  );
  if (coldPulse && pulseFrostbite) {
    const dealer = setups.find(
      (setup) =>
        setup.enabled !== false &&
        activeNames.has(setup.name) &&
        setup.role !== "aura" &&
        setup.role !== "support" &&
        dealsHitDamage(setup, "Cold", modifierTexts),
    );
    if (dealer)
      add(
        "Frostbite",
        false,
        "Hero trait: Frostbitten Heart (Cold Pulse)",
        `Cold Pulse: ${dealer.name} deals Cold Damage`,
      );
  }
  if (types.has("Frostbite")) {
    const rating = inflictedFrostbiteRating(modifierTexts);
    if (rating >= BUFF_VALUES.frostbiteFreezeAt)
      add(
        "Frozen",
        false,
        types.get("Frostbite").source,
        `Frostbite Rating ${rating} ≥ ${BUFF_VALUES.frostbiteFreezeAt}`,
      );
  }
  // Build-wide "Cannot inflict X" (packages/engine/src/ailments/ailment-blocks.js) removes that ailment from the dummy.
  for (const name of [...types.keys()])
    if (buildWideAilmentBlock(modifierTexts, name === "Frozen" ? "Freeze" : name)) types.delete(name);
  if (!types.has("Frostbite")) types.delete("Frozen");
  const list = [...types.values()];
  return {
    types: list,
    count: list.length,
    damagingCount: list.filter((item) => item.damaging).length,
    has: (name) => types.has(name),
  };
}
