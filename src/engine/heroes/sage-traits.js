// Sage – Licorice Note: hero trait audit batch B8 (2026-10-19; research/hero-traits-audit-2026-10-19.md §5 B8, §8 B8, F4). Pure: reads
// the build's trait lines (origin "trait"), the hero-exclusive revived lines the module reads (src/engine/heroes/hero-exclusive-revivals.js
// MODULE_LINES: Omni-Elixir Side Effect, Basic Pharmacology Manuscript), the Scent Bottle choices (`hero.sageScent`: the Basic
// Scent Bottle's Elixir and its Damage / Defense / Functional Ingredients) and the core-audit Elixir engine (src/engine/skills/elixir-model.js),
// and returns
//   - sageState: the Basic Scent Bottle's Elixir setup for the Elixir engine (src/engine/combat-states.js; its Functional Ingredient's
//     Charging Progress), the Elixir Skill Effect lines Scent of Ambition and Everlasting Nectar add (time-averaged), the resolved
//     Elixirs, and each clause's reading (Ingredients, prepared Empower / Curse, Elixir of Immortality);
//   - sageLineRead: one clause's status, reason and derived bodies (src/engine/heroes/hero-trait-modules.js "sageScent").
//
// Sourced:
// - Trait texts (TLIDB, SS14; src/data/heroes/all-hero-traits-ss13.generated.js, the base trait's per-level texts in
//   base-hero-trait-levels / progressions). The base trait's LV.1–4 texts carry the Ingredient catalogue with no moon section, so
//   the catalogue is not an Artificial Moon effect (F4; src/engine/heroes/hero-memory-rules.js endsArtificialMoonSection).
// - Game tier records (audit §4.3, rank 5): Licorice Note 1800001 (moon: attr 3631 Inflicted Elixir Effect, additional, Scent Bottle
//   tag 6300050); Pungent Stimulant Salt 1800011 (10568261 [4, 3.2, 160, 110]: on cast trigger 1000069, a next-cast buff node 624 on
//   attr 34011 = the preparation; 14954925 [320, 160] Empower, 14587045 [320, 110] Curse); Elixir of Immortality 1800021 (457134592 /
//   124072312 [3, 2, 50]: 3 excess → 2 Temporary, cap 50%; 2413869 [3, 25]: +3% per step, cap 25%); Scent of Ambition 1800022
//   (775893696 [3, 4, 30]: on cast 1000069, buff 82410 for 4 s every 3 casts; 204207664 [-30]: attr 3630 duration); Everlasting
//   Nectar 1800031 (219998960 [180, 70]: convert 10011 Max Life bonus → 23040022 Elixir Skill Effect, and 13011 Max Mana bonus).
// - The Elixir Skills (TLIDB): 3 s Elixir Effects; Tonics "Restore X% Max Life / Mana within 2 s … also affected by Elixir Effect
//   and Duration"; 15 Charging Progress per charge; the dummy is never defeated (src/engine/skills/elixir-model.js).
// - The planner's movement placeholder, 6 m/s (src/engine/combat/dummy-target.js ASSUMED_MOVEMENT_METERS_PER_SECOND, unsourced).
//
// Provisional readings (src/app/stats/open-questions.js, shown only for Sage):
// - The Basic Scent Bottle's Elixir (`hero.sageScent.elixir`) is an Elixir setup of its own (Active slot 2 is the bottle); the skill
//   board is not changed, and an Elixir of the same name on the board is the same skill (counted once). The Special Scent Bottle
//   (Licorice Tincture Blend) has no selection in the hero state, so its Elixir and Ingredient are not modeled.
// - The Ingredients' "additional base effects" belong to the bottle's Elixir: the Damage and Defense Ingredients are scaled by the
//   bottle's Elixir Skill Effect (the Functional and Special ones say "not affected by the effects of Elixir Skills") and, with Basic
//   Pharmacology Manuscript, by +80% additional Ingredient Effect (every Basic-bottle Ingredient). Razor Leaf and Twinspine Flower
//   last while the Elixir's effect does (its uptime); Razor Leaf holds while you (or your Minions) land Critical Strikes and reaches
//   all damage; Twinspine Flower's chance to Reap twice is an expected (1 + chance) Reaps per trigger (src/engine/ailments/reaping-model.js);
//   Scattered Spore stacks per cast (min(2, casts/s × 8 s)) on the dummy within 15 m. Defense Ingredients change no dummy figure.
// - Functional Ingredients (Pungent Stimulant Salt): Husk gains its progress per player Critical Strike at most once per 0.5 s
//   (the measured crit hits per second; before the hit pass, one per interval when the build hits); Sword Lily Leaf per Reap at most
//   once per 0.5 s; Tumbleweed Seed per 6 m moved at 6 m/s while the Movement group is Moving.
// - Omni-Elixir Side Effect: the unselected Ingredients of each kind apply instead of the selected one (an empty slot: all three of
//   that kind); its "-50% Elixir Skill Effect" is read by the Elixir engine like any Elixir Skill Effect line.
// - Pungent Stimulant Salt's prepared Empower / Curse: bonus = min(cap, 320% × the Basic bottle Elixir's Skill Effect bonus (its
//   Elixir Skill Effect factor − 1, never below 0)), applied as "+X% Empower Skill Effect" / "+X% Curse Effect" to the installed
//   skills of that type for the share of time the Basic bottle's Elixir is active (each prepared cast's boosted effect read as held
//   until the next preparation; the buff and curse durations are not read). Best-case switch `sagePreparedHeld`.
// - Elixir of Immortality: a Restoration Elixir cast at full Life (the dummy never hits) restores only excess, which the base trait
//   keeps ("The Restoration Effect from Elixir Skills cannot be removed"); 3 excess → 2 Temporary Life / Mana, up to the cap of
//   Base Max Life / Mana; "recent" read as 4 s; Max Life read as Base Max Life; the Mana step read as 5% of Base Max Mana like
//   Life's (the text prints "equal to Base Max Mana"); the damage held for the share of time a cast is recent. Best-case switch
//   `sageExcessRestoration`.
// - Scent of Ambition: +30% additional Elixir Skill Effect for 4 s every 3 Elixir casts, time-averaged over every Elixir's casts.
// - Everlasting Nectar: 180% of the increased Max Life and Max Mana bonuses (summed) becomes increased Elixir Skill Effect, up to +70%.

import { normalizePercentageText, cleanGameText } from "../text/percentage-text.js";
import { resolveElixirs, BOTTLE_ADDITIONAL_EFFECT_LINE } from "../skills/elixir-model.js";
import { ASSUMED_MOVEMENT_METERS_PER_SECOND } from "../combat/dummy-target.js";

export const SAGE = "sage-licorice-note";
export const BASIC_BOTTLE_KEY = "sage:basicScentBottle";
export const PREPARED_SWITCH = "sagePreparedHeld";
export const EXCESS_SWITCH = "sageExcessRestoration";
export const RECENT_SECONDS = 4;
export const INGREDIENTS = Object.freeze({
  damage: Object.freeze(["Razor Leaf", "Twinspine Flower", "Scattered Spore"]),
  defense: Object.freeze(["Resilient Moss", "Spectral Stamen", "Prismatic Vine"]),
  functional: Object.freeze(["Husk", "Sword Lily Leaf", "Tumbleweed Seed"]),
  special: Object.freeze(["Pixie Tear", "Thunder Dragon Scale", "Gargoyle Horn"]),
});
const KIND_OF = Object.fromEntries(
  Object.entries(INGREDIENTS).flatMap(([kind, names]) => names.map((name) => [name, kind])),
);
const round = (value) => Math.round(value * 10000) / 10000;
const pct = (value) => Math.round(value * 10000) / 100;
export const cleanSage = (text) =>
  normalizePercentageText(String(text ?? ""))
    .replace(/\s+/g, " ")
    .replace(/(\d) %/g, "$1%")
    .replace(/ ([,.:])/g, "$1")
    .replace(/^\+ (\d)/, "+$1")
    .trim();

const N = "(\\d+(?:\\.\\d+)?)";
const INGREDIENT = new RegExp(
  `^(?:(?:Damage|Defense|Functional|Special) Ingredient )?(${Object.keys(KIND_OF).join("|")}): (.+)$`,
  "i",
);
export const SAGE_PATTERNS = Object.freeze({
  restorationKept: /^The Restoration Effect from Elixir Skills cannot be removed$/i,
  basicBottle:
    /^Obtain a Basic Scent Bottle, which can be used to concoct Elixir Skills\. The second Active Skill slot is treated as the Basic Scent Bottle$/i,
  basicIngredients:
    /^Elixir Skills from Basic Scent Bottle can be equipped with (\d+) Ingredients to gain their corresponding additional Base Effects$/i,
  moonBottle: BOTTLE_ADDITIONAL_EFFECT_LINE,
  ingredient: INGREDIENT,
  functionalSlot:
    /^Elixir Skills from any Scent Bottle can be equipped with 1 additional Ingredient to gain the corresponding Charge restoration$/i,
  prepare: new RegExp(
    `^Every ${N} ?s, randomly prepares an installed Empower or Curse Skill while an Elixir Skill of the Basic Scent Bottle is active$`,
    "i",
  ),
  prepareShare: new RegExp(
    `^${N}% of the Skill Effect Bonus applied to Elixir Skills of the Basic Scent Bottle is also applied to its prepared (Empower|Curse) Skills, up to \\+${N}%$`,
    "i",
  ),
  tempLife: new RegExp(
    `^Every (\\d+) recent excess Life Restoration is converted to (\\d+) Temporary Life, up to ${N}% of Base Max Life$`,
    "i",
  ),
  tempMana: new RegExp(
    `^Every (\\d+) recent excess Mana restoration is converted to (\\d+) Temporary Mana, up to ${N}% of Base Max Mana$`,
    "i",
  ),
  immortalDamage: new RegExp(
    `^For every Temporary Life equal to ${N}% of Base Max Life or Temporary Mana equal to Base Max Mana, \\+?${N}% additional damage, up to \\+${N}%$`,
    "i",
  ),
  ambition: new RegExp(
    `^\\+${N}% additional Elixir Skill Effect after casting Elixir Skill (\\d+) time\\(s\\)\\. Lasts for ${N} ?s$`,
    "i",
  ),
  ambitionDuration: new RegExp(`^-${N}% additional Elixir Skill Effect Duration$`, "i"),
  nectar: new RegExp(
    `^${N}% of the bonus applied to Max Life or Max Mana is also applied to Elixir Skill Effect, up to \\+${N}%$`,
    "i",
  ),
  specialBottle:
    /^Obtain a Special Scent Bottle, which can be used to concoct Elixir Skills\. The third Active Skill slot is treated as the Special Scent Bottle$/i,
  specialIngredients:
    /^Elixir Skills from Special Scent Bottle can be equipped with 1 Ingredient to gain its corresponding additional Base Effects$/i,
  // Revived (memory) lines.
  omniAdds:
    /^Adds the unselected Ingredient effects to Scent Bottles, and the selected Ingredients and their effects will no longer take effect$/i,
  omniPenalty: /^-(\d+(?:\.\d+)?)% Elixir Skill Effect$/i,
  pharmacology: new RegExp(`^\\+${N}% additional Ingredient Effect applied to Basic Scent Bottle$`, "i"),
});
const TRAIT_KEYS = [
  "restorationKept",
  "basicBottle",
  "basicIngredients",
  "moonBottle",
  "ingredient",
  "functionalSlot",
  "prepare",
  "prepareShare",
  "tempLife",
  "tempMana",
  "immortalDamage",
  "ambition",
  "ambitionDuration",
  "nectar",
  "specialBottle",
  "specialIngredients",
];
export const SAGE_REVIVED_KEYS = new Set(["omniAdds", "omniPenalty", "pharmacology"]);
// Ingredient bodies (after "This skill gains an additional base effect: " for Damage / Defense / Special; the Functional ones read
// "This skill gains N Charging Progress …").
const BODY = Object.freeze({
  "Razor Leaf": new RegExp(`\\+${N}% additional damage when you or your Minions land a Critical Strike$`, "i"),
  "Twinspine Flower": new RegExp(`When Reaping, \\+${N}% chance to Reap 2 times$`, "i"),
  "Scattered Spore": new RegExp(
    `\\+${N}% additional damage taken by enemies within (\\d+) ?m when casting this skill\\. Stacks up to (\\d+) times\\. Lasts for ${N} ?s$`,
    "i",
  ),
  Husk: new RegExp(`gains ${N} Charging Progress on Critical Strike\\. Interval: ${N} ?s`, "i"),
  "Sword Lily Leaf": new RegExp(`When Reaping, this skill gains ${N} Charging Progress\\. Interval: ${N} ?s`, "i"),
  "Tumbleweed Seed": new RegExp(
    `For every ${N} ?m moved, this skill gains ${N} Charging Progress\\. Interval: ${N} ?s`,
    "i",
  ),
});

/** The clause key of a Sage line (trait or revived), or null. `revived`: match only the revived keys. */
export function sageClauseKey(text, { revived = false } = {}) {
  const clean = cleanSage(text);
  const keys = revived ? [...SAGE_REVIVED_KEYS] : TRAIT_KEYS;
  return keys.find((key) => SAGE_PATTERNS[key].test(clean)) || null;
}
/** Whether a revived (memory) line of Sage is read here (Omni-Elixir Side Effect, Basic Pharmacology Manuscript). */
export const sageRevivedLine = (heroId, text) => heroId === SAGE && Boolean(sageClauseKey(text, { revived: true }));
/** A trait or revived line this module owns (src/engine/combat-states.js leaves their badges to the module). */
export const sageOwnedLine = (heroId, line) =>
  heroId === SAGE &&
  ((line?.origin === "trait" && Boolean(sageClauseKey(line.text))) ||
    (line?.origin === "memory" && sageRevivedLine(heroId, line.text)));

const linesOf = (modifierTexts) =>
  modifierTexts
    .filter(
      (line) =>
        line &&
        line.origin !== "derived" &&
        !line.lineEffect &&
        (line.origin === "trait" || (line.origin === "memory" && sageRevivedLine(SAGE, line.text))),
    )
    .map((line) => ({ ...line, clean: cleanSage(line.text) }));
const first = (lines, key) => {
  for (const line of lines) {
    const match = line.clean.match(SAGE_PATTERNS[key]);
    if (match && (SAGE_REVIVED_KEYS.has(key) ? line.origin === "memory" : line.origin === "trait"))
      return { line, match };
  }
  return null;
};
const all = (lines, key) =>
  lines.flatMap((line) => {
    const match = line.clean.match(SAGE_PATTERNS[key]);
    return match && (SAGE_REVIVED_KEYS.has(key) ? line.origin === "memory" : line.origin === "trait")
      ? [{ line, match }]
      : [];
  });
const elixirLines = (modifierTexts) =>
  modifierTexts
    .filter((line) => line && line.origin !== "derived" && !line.lineEffect)
    .map((line) => ({
      ...line,
      clean: cleanGameText(String(line.text ?? "")),
    }));

/**
 * @param {object} p
 * @param {string} p.heroId the selected loadout
 * @param {object} p.hero state.hero (`sageScent`)
 * @param {object[]} p.modifierTexts the build's lines (before the derived lines)
 * @param {object[]} p.boardElixirs the Elixir setups on the skill board ([{ name, setupKey }])
 * @param {object} p.requestedConditions the combat conditions (the best-case switches)
 * @param {boolean} p.moving the Movement group
 * @param {object} p.facts { anyHit, minionsCrit, critHitsPerSecond (null before the hit pass), reapsPerSecond (null), hasReaping }
 * @param {object} p.inputs { maxLifeIncreasedPercent, maxManaIncreasedPercent, empowerSkills: [names], curseSkills: [names] }
 */
export function sageState({
  heroId = "",
  hero = {},
  modifierTexts = [],
  boardElixirs = [],
  requestedConditions = {},
  moving = false,
  facts = {},
  inputs = {},
} = {}) {
  if (heroId !== SAGE) return null;
  const lines = linesOf(modifierTexts);
  // A Reaping source: a Reaping line, or Reaps the hit pass measured (a skill's built-in Reap, e.g. Wilting Beam's).
  const hasReaping = Boolean(facts.hasReaping) || (Number(facts.reapsPerSecond) || 0) > 0;
  const scent = { elixir: "", damage: "", defense: "", functional: "", ...(hero?.sageScent || {}) };
  const has = (key) => Boolean(first(lines, key));
  const bottleLine = first(lines, "basicBottle");
  const ingredientLine = first(lines, "basicIngredients");
  const functionalSlot = first(lines, "functionalSlot");
  const omni = first(lines, "omniAdds");
  const pharmacology = all(lines, "pharmacology");
  const ingredientFactor = pharmacology.reduce((product, item) => product * (1 + Number(item.match[1]) / 100), 1);
  // The bottle's Ingredients: the selection, or with Omni-Elixir Side Effect the unselected ones of each kind.
  const kinds = ["damage", "defense", ...(functionalSlot ? ["functional"] : [])];
  const chosen = Object.fromEntries(
    kinds.map((kind) => [kind, INGREDIENTS[kind].includes(scent[kind]) ? scent[kind] : ""]),
  );
  const bottleElixir = bottleLine && scent.elixir ? scent.elixir : "";
  const applied =
    !bottleElixir || !ingredientLine
      ? []
      : kinds.flatMap((kind) =>
          omni ? INGREDIENTS[kind].filter((name) => name !== chosen[kind]) : chosen[kind] ? [chosen[kind]] : [],
        );
  // Each Ingredient's line in the build (the base trait's Damage / Defense lines at the base trait level, Pungent's Functional
  // lines at its level).
  const ingredientText = new Map(all(lines, "ingredient").map((item) => [item.match[1].toLowerCase(), item]));
  const lineFor = (name) => ingredientText.get(name.toLowerCase()) || null;
  const value = (name, index = 1) => {
    const item = lineFor(name);
    const match = item?.match[2].match(BODY[name]);
    return match ? Number(match[index]) : null;
  };

  // Functional Ingredient: Charging Progress per second for the bottle's Elixir only (not scaled by Elixir Skill Effect).
  const functional = applied
    .filter((name) => KIND_OF[name] === "functional")
    .map((name) => {
      const amount = value(name, name === "Tumbleweed Seed" ? 2 : 1),
        interval = value(name, name === "Tumbleweed Seed" ? 3 : 2) || 0.5;
      if (amount === null) return { name, progressPerSecond: 0, reason: `${name}: its line is not in the build` };
      const maxRate = 1 / interval;
      let rate = 0,
        reason = "";
      if (name === "Husk") {
        const measured = Number.isFinite(facts.critHitsPerSecond) ? facts.critHitsPerSecond : null;
        rate = Math.min(maxRate, measured ?? (facts.anyHit ? maxRate : 0));
        reason =
          measured === null
            ? facts.anyHit
              ? `one Critical Strike per ${interval} s assumed before the hit pass`
              : "the build lands no hit"
            : `${round(measured)} Critical Strike hits/s (measured), at most one per ${interval} s`;
      } else if (name === "Sword Lily Leaf") {
        const measured = Number.isFinite(facts.reapsPerSecond) ? facts.reapsPerSecond : null;
        rate = Math.min(maxRate, measured ?? (hasReaping ? maxRate : 0));
        reason =
          measured === null
            ? hasReaping
              ? `one Reap per ${interval} s assumed before the hit pass`
              : "the build has no Reaping source"
            : `${round(measured)} Reaps/s (measured), at most one per ${interval} s`;
      } else {
        const metres = value(name, 1) || 6;
        rate = moving ? Math.min(maxRate, ASSUMED_MOVEMENT_METERS_PER_SECOND / metres) : 0;
        reason = moving
          ? `moving at the assumed ${ASSUMED_MOVEMENT_METERS_PER_SECOND} m/s (the planner's movement placeholder, unsourced): one per ${metres} m, at most one per ${interval} s`
          : "the Movement group is Standing still";
      }
      const progressPerSecond = round(amount * ingredientFactor * rate);
      return {
        name,
        amount,
        rate: round(rate),
        progressPerSecond,
        reason: `${name}: ${amount}${ingredientFactor !== 1 ? ` × ${round(ingredientFactor)} Ingredient Effect` : ""} Charging Progress × ${round(rate)}/s = ${progressPerSecond}/s (${reason})`,
      };
    });
  const functionalProgress = functional.reduce((sum, item) => sum + item.progressPerSecond, 0);
  const bottleSetups = bottleElixir
    ? [
        {
          name: bottleElixir,
          setupKey: BASIC_BOTTLE_KEY,
          bottle: "basic",
          extraProgressPerSecond: functionalProgress,
          extraProgressSources: functional,
        },
      ]
    : [];
  const setups = [...bottleSetups, ...boardElixirs];
  const baseLines = elixirLines(modifierTexts);
  // Casts per second do not depend on Elixir Skill Effect: resolve once for the cadence, then with the lines the cadence sets.
  const cadence = setups.length ? resolveElixirs({ elixirs: setups, lines: baseLines }) : null;
  const totalCasts = (cadence?.setups || []).reduce((sum, setup) => sum + (setup.castsPerSecond || 0), 0);
  const extraLines = [];
  const ambitionLine = first(lines, "ambition");
  let ambition = null;
  if (ambitionLine) {
    const [percent, casts, seconds] = [1, 2, 3].map((index) => Number(ambitionLine.match[index]));
    const uptime = Math.min(1, (totalCasts / casts) * seconds);
    ambition = {
      percent,
      casts,
      seconds,
      uptime: round(uptime),
      value: round(percent * uptime),
      source: ambitionLine.line.source,
    };
    if (ambition.value > 0)
      extraLines.push({
        text: `+${ambition.value}% additional Elixir Skill Effect`,
        clean: `+${ambition.value}% additional Elixir Skill Effect`,
        source: `${ambitionLine.line.source} (Scent of Ambition: +${percent}% for ${seconds} s every ${casts} Elixir casts, ${pct(uptime)}% of the time)`,
        origin: "trait",
        multiplier: 1,
      });
  }
  const nectarLine = first(lines, "nectar");
  let nectar = null;
  if (nectarLine) {
    const [ratio, cap] = [1, 2].map((index) => Number(nectarLine.match[index]));
    const bonus =
      Math.max(0, Number(inputs.maxLifeIncreasedPercent) || 0) +
      Math.max(0, Number(inputs.maxManaIncreasedPercent) || 0);
    const valueNectar = round(Math.min(cap, (ratio / 100) * bonus));
    nectar = {
      ratio,
      cap,
      bonus: round(bonus),
      value: valueNectar,
      source: nectarLine.line.source,
      life: round(Number(inputs.maxLifeIncreasedPercent) || 0),
      mana: round(Number(inputs.maxManaIncreasedPercent) || 0),
    };
    if (valueNectar > 0)
      extraLines.push({
        text: `+${valueNectar}% Elixir Skill Effect`,
        clean: `+${valueNectar}% Elixir Skill Effect`,
        source: `${nectarLine.line.source} (Everlasting Nectar: ${ratio}% of +${nectar.bonus}% Max Life / Mana bonus, up to +${cap}%)`,
        origin: "trait",
        multiplier: 1,
      });
  }
  const elixirs = setups.length ? resolveElixirs({ elixirs: setups, lines: [...baseLines, ...extraLines] }) : null;
  const basic = (elixirs?.setups || []).find((setup) => setup.setupKey === BASIC_BOTTLE_KEY) || null;
  const basicActive = basic ? basic.activeShare : 0;
  const ingredientScale = basic ? basic.effectFactor * ingredientFactor : 0;

  // Damage Ingredients.
  const critLands = Number.isFinite(facts.critHitsPerSecond)
    ? facts.critHitsPerSecond > 0 || Boolean(facts.minionsCrit)
    : Boolean(facts.anyHit || facts.minionsCrit);
  const ingredientRead = {};
  for (const name of applied.filter((item) => KIND_OF[item] === "damage")) {
    const base = value(name);
    if (base === null) {
      ingredientRead[name] = { active: false, reason: `${name}: its line is not in the build` };
      continue;
    }
    if (name === "Scattered Spore") {
      const [maxStacks, seconds] = [3, 4].map((index) => value(name, index));
      const stacks = Math.min(maxStacks, (basic?.castsPerSecond || 0) * seconds);
      const total = round(base * ingredientScale * stacks);
      ingredientRead[name] = {
        base,
        stacks: round(stacks),
        value: total,
        active: total > 0,
        body: total > 0 ? `+${total}% additional damage taken` : null,
        reason:
          total > 0
            ? `${base}% × ${round(basic.effectFactor)} Elixir Skill Effect${ingredientFactor !== 1 ? ` × ${round(ingredientFactor)} Ingredient Effect` : ""} × ${round(stacks)} stacks (min(${maxStacks}, ${basic.castsPerSecond} casts/s × ${seconds} s); the dummy within 15 m) = +${total}% additional damage taken (provisional)`
            : `${basic?.name || "the bottle's Elixir"} is not cast on the dummy (no Charging Progress)`,
      };
    } else {
      const total = round(base * ingredientScale * basicActive);
      const gate = name === "Razor Leaf" ? critLands : hasReaping;
      const why = name === "Razor Leaf" ? "the build lands no Critical Strike" : "the build has no Reaping source";
      const active = total > 0 && gate;
      ingredientRead[name] = {
        base,
        value: total,
        active,
        body: active
          ? name === "Razor Leaf"
            ? `+${total}% additional damage`
            : `When Reaping, +${total}% chance to Reap 2 times`
          : null,
        reason: !gate
          ? why
          : total > 0
            ? `${base}% × ${round(basic.effectFactor)} Elixir Skill Effect${ingredientFactor !== 1 ? ` × ${round(ingredientFactor)} Ingredient Effect` : ""} × ${pct(basicActive)}% ${basic.kind === "effect" ? "uptime" : "restoring time"} of ${basic.name} = ${name === "Razor Leaf" ? `+${total}% additional damage (held while Critical Strikes land; provisional)` : `+${total}% chance to Reap 2 times (an expected ×${round(1 + Math.min(100, total) / 100)} on every Reap; provisional)`}`
            : `${basic?.name || "the bottle's Elixir"} is not up on the dummy (no Charging Progress)`,
      };
    }
  }

  // Pungent Stimulant Salt's prepared Empower / Curse Skills.
  const prepareLine = first(lines, "prepare");
  const preparedOn = requestedConditions[PREPARED_SWITCH] !== false;
  const bottleBonus = basic ? Math.max(0, (basic.effectFactor - 1) * 100) : 0;
  const prepared = prepareLine
    ? all(lines, "prepareShare").map((item) => {
        const type = /empower/i.test(item.match[2]) ? "Empower" : "Curse";
        const ratio = Number(item.match[1]),
          cap = Number(item.match[3]);
        const installed = (type === "Empower" ? inputs.empowerSkills : inputs.curseSkills) || [];
        // Empower Skill Effect reaches only the Empower skills whose effect the planner models (src/engine/skills/empower-effects.js).
        const modeled = type === "Empower" ? inputs.empowerModeled || [] : installed;
        const bonus = round(Math.min(cap, (ratio / 100) * bottleBonus));
        const share = preparedOn ? basicActive : 0;
        const total = round(bonus * share);
        const active = total > 0 && modeled.length > 0;
        const unmodeled = installed.length > 0 && !modeled.length;
        const reason = !basic
          ? "no Elixir in the Basic Scent Bottle"
          : !installed.length
            ? `no ${type} Skill is installed`
            : unmodeled
              ? `the planner does not model the Empower effect of ${installed.join(", ")} (src/engine/skills/empower-effects.js), so its prepared bonus moves nothing`
              : !(basicActive > 0)
                ? `${basic.name} is not active on the dummy (no Charging Progress)`
                : !preparedOn
                  ? "the prepared-skill switch is off"
                  : !(bonus > 0)
                    ? `the Basic bottle's Elixir Skill Effect bonus is ${round(bottleBonus)}%`
                    : "";
        return {
          type,
          ratio,
          cap,
          bonus,
          share: round(share),
          value: total,
          installed,
          modeled,
          unmodeled,
          active,
          source: item.line.source,
          text: item.line.clean,
          body: active ? `+${total}% ${type === "Empower" ? "Empower Skill" : "Curse"} Effect` : null,
          reason: active
            ? `${ratio}% × +${round(bottleBonus)}% (the Basic bottle Elixir's Skill Effect bonus) = +${bonus}% (cap +${cap}%) for the prepared ${type} Skills (${modeled.join(", ")}), held ${pct(share)}% of the time (while ${basic.name} is active; a preparation every ${Number(prepareLine.match[1])} s; durations not read; provisional)`
            : reason,
        };
      })
    : [];

  // Elixir of Immortality.
  const tempLife = first(lines, "tempLife"),
    tempMana = first(lines, "tempMana"),
    immortal = first(lines, "immortalDamage");
  const restorationKept = has("restorationKept");
  const excessOn = requestedConditions[EXCESS_SWITCH] !== false;
  let immortality = null;
  if (immortal) {
    const [stepPercent, perStep, capDamage] = [1, 2, 3].map((index) => Number(immortal.match[index]));
    const restorers = (elixirs?.setups || []).filter(
      (setup) => setup.kind === "restoration" && setup.castsPerSecond > 0,
    );
    const pool = (key, line) => {
      if (!line) return { held: 0, share: 0, steps: 0 };
      const [excess, converted, cap] = [1, 2, 3].map((index) => Number(line.match[index]));
      const casters = restorers.filter((setup) => setup[key] > 0);
      const casts = casters.reduce((sum, setup) => sum + setup.castsPerSecond, 0);
      if (!casts || !restorationKept || !excessOn) return { held: 0, share: 0, steps: 0, cap };
      // Temporary amount from the casts within the last 4 s (each cast: its Restoration × Elixir Skill Effect, all excess, × 2 / 3);
      // with fewer than one cast per 4 s, one cast's amount for the share of time a cast is recent.
      const windowCasts = casts * RECENT_SECONDS;
      const windowAmount = casters.reduce(
        (sum, setup) =>
          sum + ((setup[key] * setup.effectFactor * converted) / excess) * setup.castsPerSecond * RECENT_SECONDS,
        0,
      );
      const held = Math.min(cap, windowCasts >= 1 ? windowAmount : windowAmount / windowCasts);
      return {
        held: round(held),
        share: round(Math.min(1, windowCasts)),
        steps: Math.floor(held / stepPercent + 1e-9),
        cap,
        names: casters.map((setup) => setup.name),
      };
    };
    const life = pool("restoresLifePercent", tempLife),
      mana = pool("restoresManaPercent", tempMana);
    const share = Math.max(life.share, mana.share);
    const damage = round(Math.min(capDamage, (life.steps + mana.steps) * perStep) * share);
    const reason = !restorers.length
      ? "no Restoration Elixir (Tonic) is cast on the dummy: only Restoration Elixirs restore Life / Mana there (the dummy never hits)"
      : !restorationKept
        ? 'without "The Restoration Effect from Elixir Skills cannot be removed" a Restoration at full Life ends at once (no excess)'
        : !excessOn
          ? "the excess-restoration switch is off"
          : !damage
            ? `the Temporary Life / Mana held (${life.held}% / ${mana.held}%) is below one ${stepPercent}% step`
            : "";
    immortality = {
      stepPercent,
      perStep,
      capDamage,
      life,
      mana,
      share: round(share),
      value: damage,
      active: damage > 0,
      source: immortal.line.source,
      body: damage > 0 ? `+${damage}% additional damage` : null,
      reason:
        damage > 0
          ? `Restoration Elixirs at full Life restore only excess (kept by the base trait): Temporary Life ${life.held}% (${life.steps} steps), Temporary Mana ${mana.held}% (${mana.steps} steps) of Base Max Life / Mana (3 excess → 2, within ${RECENT_SECONDS} s; Max Life read as Base Max Life; the Mana step read as ${stepPercent}%) → min(+${capDamage}%, ${life.steps + mana.steps} × ${perStep}%) × ${pct(share)}% of the time = +${damage}% additional damage (provisional)`
          : reason,
    };
  }

  const switches = [];
  if (prepared.some((item) => item.installed.length) && basic)
    switches.push({
      id: PREPARED_SWITCH,
      label: "Pungent Stimulant Salt: prepared Empower / Curse Skills keep their boosted effect",
      enabled: preparedOn,
      active: prepared.some((item) => item.active),
      summary:
        prepared
          .filter((item) => item.active)
          .map((item) => item.body)
          .join(", ") || "no boost",
      reason: prepared.some((item) => item.active)
        ? "best-case assumption (the buff and curse durations are not read)"
        : prepared
            .map((item) => item.reason)
            .filter(Boolean)
            .join("; "),
    });
  if (immortality && (elixirs?.setups || []).some((setup) => setup.kind === "restoration"))
    switches.push({
      id: EXCESS_SWITCH,
      label: "Elixir of Immortality: Restoration Elixirs cast at full Life (excess restoration)",
      enabled: excessOn,
      active: immortality.active,
      summary: immortality.body || "no Temporary Life",
      reason: immortality.active
        ? "best-case assumption (the dummy never hits, so Life stays full)"
        : immortality.reason,
    });

  const assumptions = [];
  if (basic)
    assumptions.push({
      id: "sage:basicScentBottle",
      value: basic.activeShare,
      text: `Sage – Basic Scent Bottle: ${basic.name}${applied.length ? ` with ${applied.join(", ")}${omni ? " (Omni-Elixir Side Effect: the unselected Ingredients)" : ""}` : " with no Ingredient"}; ${functional.length ? functional.map((item) => item.reason).join("; ") : "no Functional Ingredient progress"}; Elixir Skill Effect ×${basic.effectFactor} (Scent Bottle Elixirs: ×${elixirs.bottleFactor})${ingredientFactor !== 1 ? `, Ingredient Effect ×${round(ingredientFactor)}` : ""}. The skill board is not changed; the Special Scent Bottle is not modeled (provisional, hero trait audit B8).`,
    });
  if (ambition?.value > 0)
    assumptions.push({
      id: "sage:scentOfAmbition",
      value: ambition.uptime,
      text: `Scent of Ambition: +${ambition.percent}% additional Elixir Skill Effect up ${pct(ambition.uptime)}% of the time (${round(totalCasts)} Elixir casts/s ÷ ${ambition.casts} × ${ambition.seconds} s), time-averaged (provisional).`,
    });
  if (nectar?.value > 0)
    assumptions.push({
      id: "sage:everlastingNectar",
      value: nectar.value,
      text: `Everlasting Nectar: ${nectar.ratio}% of the Max Life (+${nectar.life}%) and Max Mana (+${nectar.mana}%) bonuses = +${nectar.value}% Elixir Skill Effect (cap +${nectar.cap}%; provisional).`,
    });
  return {
    heroId,
    scent,
    bottleElixir,
    chosen,
    applied,
    omni: Boolean(omni),
    ingredientFactor: round(ingredientFactor),
    functional,
    functionalProgress: round(functionalProgress),
    elixirSetups: bottleSetups,
    elixirExtraLines: extraLines,
    elixirs,
    basic,
    basicActive: round(basicActive),
    totalCasts: round(totalCasts),
    ambition,
    nectar,
    ingredientRead,
    prepared,
    immortality,
    restorationKept,
    switches,
    assumptions,
    needsRates:
      functional.some((item) => item.name === "Husk" || item.name === "Sword Lily Leaf") ||
      applied.includes("Razor Leaf") ||
      applied.includes("Twinspine Flower"),
    ingredientLines: Object.fromEntries([...ingredientText.entries()].map(([key, item]) => [key, item.line.clean])),
  };
}

const L = (status, reason, extra = {}) => ({ status, reason, ...extra });

/** One Sage clause: { key, status, reason, bodies }, or null when the line is not a Sage clause. */
export function sageLineRead(heroId, text, state, { revived = false } = {}) {
  if (heroId !== SAGE) return null;
  const key = sageClauseKey(text, { revived });
  if (!key) return null;
  const read = { key, bodies: [], ...lineRead(key, cleanSage(text), state) };
  return read;
}

function bottleState(state) {
  const b = state?.basic;
  if (!state?.bottleElixir)
    return { ok: false, status: "Inactive", reason: "no Elixir Skill in the Basic Scent Bottle (Hero → Scent)" };
  if (!b)
    return {
      ok: false,
      status: "Not modeled",
      reason: `${state.bottleElixir} is not an Elixir Skill the planner reads`,
    };
  if (b.kind === "restoration")
    return {
      ok: false,
      restoration: true,
      status: state.immortality?.active ? "In calc" : "No DPS effect",
      reason: state.immortality?.active
        ? `${b.name} restores Life / Mana; its excess feeds Elixir of Immortality`
        : `${b.name} is a Restoration Elixir (restores Life / Mana): no damage effect`,
    };
  if (!(b.uptime > 0))
    return {
      ok: false,
      status: "Not on dummy",
      reason: `${b.name}: the dummy is never defeated and no line or Functional Ingredient gives it Charging Progress, so it is not cast there`,
    };
  return {
    ok: true,
    status: "In calc",
    reason: `${b.name} in the Basic Scent Bottle: ${b.castsPerSecond} casts/s, uptime ${pct(b.uptime)}%, Elixir Skill Effect ×${b.effectFactor} (provisional)`,
  };
}

function lineRead(key, text, state) {
  if (!state) return L("Inactive", "Sage's lines are not in the build");
  const bottle = bottleState(state);
  const anyUp = (state.elixirs?.setups || []).some(
    (setup) => setup.uptime > 0 && setup.values.some((value) => value.damage),
  );
  switch (key) {
    case "restorationKept":
      return state.immortality?.active
        ? L(
            "In calc",
            `Restoration at full Life is not removed, so it is all excess for Elixir of Immortality: ${state.immortality.reason}`,
          )
        : L("No DPS effect", "Restoration Effects (Life / Mana recovery) only");
    case "basicBottle":
      return L(bottle.status, bottle.reason);
    case "basicIngredients": {
      if (!bottle.ok && !bottle.restoration) return L(bottle.status, bottle.reason);
      const dmg = state.applied.filter((name) => KIND_OF[name] === "damage");
      if (!state.applied.length) return L("Inactive", "no Ingredient selected");
      const active = dmg.some((name) => state.ingredientRead[name]?.active);
      return L(
        active ? "In calc" : dmg.length ? "Inactive" : "No DPS effect",
        `${state.applied.join(", ")}${state.omni ? " (Omni-Elixir Side Effect: the unselected Ingredients apply)" : ""}${dmg.length && !active ? `: ${dmg.map((name) => state.ingredientRead[name]?.reason).join("; ")}` : !dmg.length ? ": Defense / Functional Ingredients only (their badges)" : ""}`,
      );
    }
    case "moonBottle":
      return bottle.ok
        ? L(
            "In calc",
            `${state.basic.name} (Basic Scent Bottle): Elixir Skill Effect ×${state.elixirs.bottleFactor} for the Scent Bottle Elixirs (an Elixir placed on the skill board does not take it)`,
          )
        : bottle.restoration && state.immortality?.active
          ? L("In calc", "the Restoration Elixir's excess for Elixir of Immortality scales with Elixir Skill Effect")
          : L(bottle.status, bottle.reason);
    case "ingredient": {
      const name = Object.keys(KIND_OF).find((item) => text.toLowerCase().includes(`${item.toLowerCase()}:`));
      const kind = KIND_OF[name];
      if (kind === "special")
        return name === "Gargoyle Horn"
          ? L("No DPS effect", "Block Chance and self damage only")
          : L(
              "Not modeled",
              "the Special Scent Bottle (Licorice Tincture Blend) has no Elixir or Ingredient selection in the planner, so its Ingredient is not applied (hero trait audit B8; open question)",
            );
      if (!state.applied.includes(name))
        return L(
          "Inactive",
          state.omni
            ? `${name} is the selected ${kind} Ingredient, which Omni-Elixir Side Effect turns off`
            : kind === "functional" && !state.chosen.functional && !state.applied.length
              ? "no Functional Ingredient selected"
              : `${name} is not the selected ${kind} Ingredient${state.bottleElixir ? "" : " (no Elixir in the Basic Scent Bottle)"}`,
        );
      if (kind === "defense") return L("No DPS effect", `${name}: defence only (the dummy never hits)`);
      if (kind === "functional") {
        const item = state.functional.find((entry) => entry.name === name);
        if (!(item?.progressPerSecond > 0)) return L("Inactive", item?.reason || `${name} gives no Charging Progress`);
        return anyUp ||
          state.immortality?.active ||
          state.prepared.some((entry) => entry.active) ||
          Object.values(state.ingredientRead).some((entry) => entry.active)
          ? L("In calc", `${item.reason} for ${state.basic.name} only (not scaled by Elixir Skill Effect; provisional)`)
          : L(
              "No DPS effect",
              `${item.reason}, but ${state.basic?.name || "the bottle's Elixir"} carries no damage effect`,
            );
      }
      const read = state.ingredientRead[name];
      return read?.active
        ? L("In calc", read.reason, { bodies: [read.body] })
        : L("Inactive", read?.reason || `${name}: not read`);
    }
    case "functionalSlot":
      return state.functional.length
        ? L(
            state.functionalProgress > 0 ? "In calc" : "Inactive",
            state.functional.map((item) => item.reason).join("; "),
          )
        : L("Inactive", "no Functional Ingredient selected");
    case "prepare": {
      const active = state.prepared.filter((item) => item.active);
      return active.length
        ? L("In calc", active.map((item) => item.reason).join("; "))
        : L(
            "Inactive",
            state.prepared
              .map((item) => item.reason)
              .filter(Boolean)
              .join("; ") || "no Empower or Curse Skill is installed",
          );
    }
    case "prepareShare": {
      const type = /empower/i.test(text) ? "Empower" : "Curse";
      const item = state.prepared.find((entry) => entry.type === type);
      return item?.active
        ? L("In calc", item.reason, { bodies: [item.body] })
        : L(item?.unmodeled ? "Not modeled" : "Inactive", item?.reason || `no ${type} Skill is installed`);
    }
    case "tempLife":
    case "tempMana":
    case "immortalDamage": {
      const im = state.immortality;
      if (!im) return L("Inactive", "Elixir of Immortality's damage line is not in the build");
      if (key === "immortalDamage")
        return im.active ? L("In calc", im.reason, { bodies: [im.body] }) : L("Inactive", im.reason);
      const pool = key === "tempLife" ? im.life : im.mana;
      return pool.steps > 0 && im.active
        ? L(
            "In calc",
            `Temporary ${key === "tempLife" ? "Life" : "Mana"} ${pool.held}% (${pool.steps} steps of ${im.stepPercent}%): ${im.reason}`,
          )
        : L(
            "Inactive",
            pool.held > 0
              ? `Temporary ${key === "tempLife" ? "Life" : "Mana"} ${pool.held}% is below one ${im.stepPercent}% step`
              : im.reason || "no excess restoration",
          );
    }
    case "ambition": {
      const a = state.ambition;
      if (!a || !(a.value > 0)) return L("Inactive", "no Elixir Skill is cast on the dummy (no Charging Progress)");
      return anyUp ||
        state.immortality?.active ||
        state.prepared.some((entry) => entry.active) ||
        Object.values(state.ingredientRead).some((entry) => entry.active)
        ? L(
            "In calc",
            `+${a.percent}% additional Elixir Skill Effect for ${a.seconds} s every ${a.casts} Elixir casts: up ${pct(a.uptime)}% of the time (${state.totalCasts} casts/s), time-averaged as +${a.value}% additional Elixir Skill Effect (provisional)`,
          )
        : L("No DPS effect", "the cast Elixirs carry no damage effect");
    }
    case "ambitionDuration":
      return anyUp
        ? L(
            "In calc",
            `Elixir Effect duration ×${state.elixirs.durationFactor}: the uptime of every Elixir (provisional)`,
          )
        : (state.elixirs?.setups || []).length
          ? L("Not on dummy", "no Elixir Effect is up on the dummy")
          : L("Inactive", "no Elixir Skill");
    case "nectar": {
      const n = state.nectar;
      if (!n || !(n.value > 0))
        return L("Inactive", n ? "no Max Life or Max Mana bonus" : "Everlasting Nectar is not in the build");
      return anyUp ||
        state.immortality?.active ||
        state.prepared.some((entry) => entry.active) ||
        Object.values(state.ingredientRead).some((entry) => entry.active)
        ? L(
            "In calc",
            `${n.ratio}% × (+${n.life}% Max Life + ${n.mana}% Max Mana bonus) = +${n.value}% Elixir Skill Effect (cap +${n.cap}%; provisional)`,
          )
        : L(
            (state.elixirs?.setups || []).length ? "Not on dummy" : "Inactive",
            (state.elixirs?.setups || []).length ? "no Elixir Effect is up on the dummy" : "no Elixir Skill",
          );
    }
    case "specialBottle":
    case "specialIngredients":
      return L(
        "Not modeled",
        "the Special Scent Bottle (Active slot 3) has no Elixir or Ingredient selection in the planner; an Elixir placed in Active slot 3 is read as a board Elixir without the bottle's +12% or Ingredient (hero trait audit B8; open question)",
      );
    case "omniAdds":
      return !state.bottleElixir
        ? L("Inactive", "no Elixir in the Basic Scent Bottle")
        : L(
            Object.values(state.ingredientRead).some((entry) => entry.active) ? "In calc" : "Inactive",
            `the unselected Ingredients apply: ${state.applied.join(", ") || "none"} (an empty slot: all three of its kind; provisional)`,
          );
    case "omniPenalty":
      return anyUp
        ? L(
            "In calc",
            `read by the Elixir engine as Elixir Skill Effect: ×${state.elixirs.effectFactor} on every Elixir (provisional)`,
          )
        : (state.elixirs?.setups || []).length
          ? L("Not on dummy", "no Elixir Effect is up on the dummy")
          : L("Inactive", "no Elixir Skill");
    case "pharmacology":
      return state.applied.length
        ? L(
            Object.values(state.ingredientRead).some((entry) => entry.active) || state.functionalProgress > 0
              ? "In calc"
              : "Inactive",
            `Ingredient Effect ×${state.ingredientFactor} on the Basic bottle's Ingredients (${state.applied.join(", ")}; provisional)`,
          )
        : L("Inactive", "no Ingredient in the Basic Scent Bottle");
    default:
      return L("Not modeled", "this Sage clause is not read");
  }
}
