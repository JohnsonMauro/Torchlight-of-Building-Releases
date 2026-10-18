import { normalizePercentageText } from "./percentage-text.js";
import { explicitRadiusHolds, KEYWORD_RADII_METERS, DISTANT_STANDING_METERS } from "./dummy-target.js";
import { sustainedLevel } from "./timed-effects.js";
import { resolveRegain } from "./regain-model.js";

// Buffs, enemy debuffs and the damage side of non-damaging ailments (research/talent-batch-2026-10-12.md §10 chunk 3).
// Each state turns into derived plain lines (src/line-effects.js pushes them into planner.modifierTexts, so every engine
// reads them like the same plain line) and into one entry per source line for its badge and the recount assumptions.
//
// Sources: the game's keyword tooltips (config_multi_language_en hyperlink records, values as TLIDB fills them; the
// manual entries where they exist):
//   Attack Aggression (hyperlink 10000100): "Additionally increases Attack Speed and Attack Damage by 5%".
//   Spell Aggression (10000101): "Additionally increases Cast Speed and Spell Damage by 7%".
//   Hasten (10000106 "Quickness"): "Additionally increases Attack Speed, Cast Speed, Movement Speed … by 8%".
//   Fervor (740 / manual): "+2% Critical Strike Rating for every point of Fervor Rating. The Max Fervor Rating is 100";
//     accumulates "when you defeat enemies or hit Elite enemies while having Fervor" (the dummy is an Elite). A fixed Rating
//     ("Has 130 point(s) of fixed Fervor Rating", Unmatched Valor) goes past the 100 cap (user-confirmed 2026-10-14).
//   Fortitude (10000107): "Each stack … additionally reduces Hit Damage taken by 5% for 10s. Base Max Fortitude Stacks: 3".
//   Frail (10000102): "Additionally increases Spell Damage taken by 15%".
//   Fire / Cold / Lightning Infiltration (10000103–05): "Additionally increases <Type> Damage taken by 13%".
//   Paralysis (704): "Increases damage taken by 15%"; manual rule 1002020420: "Stacks up to 1 time. The base duration is 4s".
//     Weaken (701): "Reduces damage dealt by 10%" (the enemy's damage). Crowd Control Effects (742): "Frostbite, Freeze,
//     Paralysis, Knockback, Weaken, Slow, Taunt, and Blinding".
//   Frostbite (735): "Base Frostbite Rating: 10. For every 1 Frostbite Rating, +1% additional Cold Damage taken. The enemy
//     will be Frozen once they have more than 100 Frostbite Rating"; manual: "The Max Frostbite Rating is 120"; 736:
//     "Enemies are inflicted with a fixed amount of Frostbite Rating … increased by raising Max Frostbite Rating".
//   Numbed (762): "Max Numbed stacks: 10. Each stack of Numbed increases the Lightning Damage taken by an additional +5%".
//     Conductive (Assassin core) changes that base effect to +11% per stack, same 10-stack cap (user-confirmed 2026-10-12).
// Own buffs are held at their built-up state before engaging (user rule 2026-10-09: own buffs pre-built); debuffs on the
// dummy are applied at their steady state. Readings nobody has checked in game are `provisional` and listed.

export const BUFF_VALUES = Object.freeze({
  attackAggression: { percent: 5, source: "Attack Aggression (game keyword 10000100)" },
  spellAggression: { percent: 7, source: "Spell Aggression (game keyword 10000101)" },
  hasten: { percent: 8, source: "Hasten (game keyword 10000106)" },
  fervorPerPoint: 2, fervorMax: 100,
  fortitudeBaseMax: 3,
  frail: 15, infiltration: 13, paralysis: 15, paralysisDurationSeconds: 4, thrillBarrier: 20,
  frostbiteBaseRating: 10, frostbiteMaxRating: 120, frostbiteFreezeAt: 100, frostbiteTakenPerRating: 1,
  numbedPerStack: 5, numbedMaxStacks: 10
});

const num = (text) => Number(String(text).replace("−", "-"));
const sum = (values) => values.reduce((total, value) => total + value, 0);
const round = (value) => Math.round(value * 10000) / 10000;

// Lines this module reads, by family (also the "handled" set for src/line-effects.js).
const PATTERNS = {
  hasFervor: /^(?:Have|Has|Gains) Fervor(?: when there are enemies Nearby)?$/i,
  // Negative values too (2026-10-17: the follower's Focused Slash "-5% Fervor Effect … for each Sweep Slash", src/follower-model.js).
  fervorEffect: /^([+-]\d+(?:\.\d+)?)% Fervor effect$/i,
  fervorRatingOnHit: /^\+\d+% chance to gain \d+ Fervor rating on hit$/i,
  critDamagePerFervor: /^(\d+(?:\.\d+)?)% Critical Strike Damage per Fervor Rating$/i,
  movementPerFervor: /^\+\d+(?:\.\d+)?% Movement Speed per \d+ Fervor Rating$/i,
  // Centralize (Ronin core): its two parts arrive as separate lines. Part 1 raises the Rating on hit; part 2 consumes half of it
  // when the player is hit, -0.8% additional damage per point consumed (best case: not hit, condition centralizeNotHit).
  centralize: /^Gains additional Fervor Rating equal to/i,
  centralizeHit: /^Consumes half of current Fervor Rating when hit(?:\. ?-(\d+(?:\.\d+)?)% additional damage per (\d+)? ?points? consumed)?/i,
  attackAggressionGain: /^(?:Has Attack Aggression|Both you and your Minions have Attack Aggression|Gains Attack Aggression when casting an Attack Skill)$/i,
  attackAggressionDefeat: /chance to gain Attack Aggression on defeat$/i,
  spellAggressionGain: /^Has Spell Aggression$/i,
  aggressionEffect: /^\+(\d+(?:\.\d+)?)% (Attack|Spell) Aggression Effect$/i,
  spellAggressionPerCast: /^\+(\d+(?:\.\d+)?)% Spell Aggression Effect for every Main Spell Skill cast recently\. Stacks up to (\d+) times$/i,
  hastenAlways: /^Has Hasten$/i,
  hastenAgility: /^(?:Has Hasten when reaching Max Agility Blessing stacks|When having Agility Blessing, has Hasten)$/i,
  hastenTrauma: /^Gains Hasten when inflicting Trauma for \d+(?:\.\d+)? ?s$/i,
  hastenMinionCrit: /^Gains Hasten when Minions land a Critical Strike$/i,
  hastenEffect: /^\+(\d+(?:\.\d+)?)% Hasten Effect$/i,
  fortitudeGain: /^Gains a stack of Fortitude when using a Melee Skill$/i,
  fortitudeExtra: /^(?:Owns (\d+) additional stack\(s\) of Fortitude|\+(\d+) (?:to )?Max Fortitude Stacks)$/i,
  fortitudeDamage: /^\+(\d+(?:\.\d+)?)% additional damage (?:per|for every) (\d+) stack\(s\) of Fortitude$/i,
  elixirActive: /^(.+?) while an Elixir Skill is active$/i,
  elixirOther: /Elixir Skill/i,
  frail: /^Inflicts Frail when dealing Spell Damage$/i,
  // Gear-pact batch chunk 2 (enemy debuffs from passive lines). Radii (residual batch 2026-10-12): Nearby within 6 m, Proximity
  // within 4 m (TLIDB keyword tooltips); the player stands close, so they hold and an explicit radius holds at point blank.
  frailNearby: /^Nearby enemies within (\d+(?:\.\d+)?) ?m have Frail$/i,
  infiltrationOnHit: /^(?:Inflicts (Fire|Cold|Lightning) Infiltration (?:on hit|when dealing damage)|When dealing damage, inflicts (Fire|Cold|Lightning) Infiltration)(?:\. Interval for each enemy: [\d.]+ ?s)?$/i,
  takenNearby: /^\+(\d+(?:\.\d+)?)% additional damage taken by (?:Nearby enemies|enemies in Proximity)$/i,
  // Residual batch A-2: typed or explicit-radius wordings ("+14% additional Fire Damage taken by enemies within 10 m").
  takenWithin: /^\+(\d+(?:\.\d+)?)% additional (Physical|Fire|Cold|Lightning|Erosion) Damage taken by (?:Nearby enemies|enemies in Proximity|enemies within (\d+(?:\.\d+)?) ?m)$|^\+(\d+(?:\.\d+)?)% additional damage taken by enemies within (\d+(?:\.\d+)?) ?m$/i,
  // "Every 0.25 s, +6% additional damage taken for enemies within 10 m. Stacks up to 5 times" (Impending): a stacking debuff.
  takenStacking: /^Every ([\d.]+) ?s, \+(\d+(?:\.\d+)?)% additional damage taken for enemies within (\d+(?:\.\d+)?) ?m\. Stacks up to (\d+) times?$/i,
  // Chunk 3: "When a Spell hit inflicts Fire Damage, -15% Cold, Lightning, and Erosion Resistance for the target for 3 s".
  spellHitShred: /^When a Spell hit inflicts (Fire|Cold|Lightning|Erosion) Damage, -(\d+(?:\.\d+)?)% ((?:(?:Fire|Cold|Lightning|Erosion)(?:, | and |, and )?)+) Resistance for the target for (\d+(?:\.\d+)?) ?s$/i,
  lightningInfiltrationCrit: /^Inflicts Lightning Infiltration on Critical Strike$/i,
  coldInfiltrationFrozen: /^Inflicts Cold Infiltration when dealing damage to Frozen enemies$/i,
  // The same Elementalist node since the 2026-10-14 game patch (TLIDB tree text): Frostbitten instead of Frozen.
  coldInfiltrationFrostbitten: /^Inflicts Cold Infiltration when dealing damage to Frostbitten enemies$/i,
  // Broken Dream (2026-10-18): "Inflicts Cold Infiltration on enemies cursed by Biting Cold": held while that curse skill is on the dummy.
  infiltrationCursedBy: /^Inflicts (Fire|Cold|Lightning) Infiltration on enemies cursed by ([A-Z][\w' ]+?)$/i,
  penetrating: /^When dealing Fire, Lightning, or Cold Damage, inflicts Fire Infiltration, Lightning Infiltration, or Cold Infiltration respectively\.$/i,
  perInfiltrationType: /^Upon inflicting damage, \+(\d+(?:\.\d+)?)% additional Elemental Damage for each type of Infiltration Effect the enemy has$/i,
  paralysisAttacks: /^\+(\d+(?:\.\d+)?)% chance for Attacks to inflict Paralysis on hit$/i,
  // Residual batch A-3: the unscoped wording ("+30% chance to inflict Paralysis on hit"): any modeled hit.
  // "+100% chance to Paralyze the target on hit" (gear) is the same on-hit chance.
  paralysisOnHit: /^\+(\d+(?:\.\d+)?)% chance to (?:inflict Paralysis|Paralyze the target) on hit$/i,
  // Paralysis sources without a chance roll on the dummy (2026-10-14; held from the first hit, 4 s base duration refreshed):
  // the Tenacity-gated chance, the damage-dealing one (with Weaken), Nearby enemies, and on Block.
  paralysisTenacity: /^\+(\d+(?:\.\d+)?)% chance to inflict Paralysis on hit when Tenacity Blessing reaches max stacks$/i,
  paralysisDealDamage: /^Inflicts Paralysis and Weaken when you or Minions deal damage$/i,
  paralysisNearby: /^Nearby enemies are Paralyzed$/i,
  paralysisBlocking: /^Paralyze enemies Nearby when Blocking$/i,
  // "+100% Fire Infiltration Effect" scales that Infiltration's +13% damage taken (keyword value × (1 + effect)).
  infiltrationEffect: /^\+(\d+(?:\.\d+)?)% (Fire|Cold|Lightning) Infiltration Effect$/i,
  // Fervor at a fixed Rating ("Has 70 point(s) of fixed Fervor Rating") and per-Rating damage ("+1% additional damage per
  // 3 Fervor Rating"), residual batch A-3.
  // The fixed Rating may sit behind a granted-core prefix ("[Unmatched Valor] Has 130 point(s) of fixed Fervor Rating", the
  // Ethereal Prism's mutated-core clause; src/modifier-texts.js strips the prefix for intake, this keeps any that stays).
  fervorFixed: /^(?:\[[^\]]+\] ?)?Has (\d+) point\(s\) of fixed Fervor Rating$/i,
  // Ghost Slaughter (2026-10-14): Fervor's additional base effects, its Life drain, and losing Fervor at Low Life.
  fervorAttackAilment: /^Fervor gains an additional base effect: \+(\d+(?:\.\d+)?)% additional Attack and Ailment Damage for every (\d+(?:\.\d+)?)? ?Fervor Rating$/i,
  fervorSkillArea: /^Fervor gains an additional base effect: \+\d+(?:\.\d+)?% Skill Area for every \d+(?:\.\d+)? Fervor Rating$/i,
  fervorLifeDrain: /^Consumes \d+(?:\.\d+)?% of current Life and Energy Shield per second while Fervor is active$/i,
  losesFervorLowLife: /^Loses Fervor at Low Life$/i,
  damagePerFervor: /^\+(\d+(?:\.\d+)?)% (additional )?(damage|Projectile Damage) (?:per|for every) (\d+)? ?(?:point of )?Fervor Rating$/i,
  spellAggressionOnCast: /^Gains Spell Aggression when casting a Spell Skill$/i,
  // "+20% chance to gain a 4 s Thrill Barrier upon inflicting Elemental Ailments" (TLIDB keyword: Thrill Barrier +20% additional
  // Elemental Damage).
  thrillBarrier: /^\+(\d+(?:\.\d+)?)% chance to gain a (\d+(?:\.\d+)?) ?s Thrill Barrier upon inflicting Elemental Ailments$/i,
  // Decimal chances read too (2026-10-15): a Judgment-linked slate scales "+25%" to "+35%" (+40%), and other values to decimals.
  paralysisCursed: /^Upon dealing damage to a Cursed target, there is a \+(\d+(?:\.\d+)?)% chance to Paralyze it$/i,
  paralysisRegain: /^When Regaining, inflicts Paralysis on enemies within \d+ ?m$/i,
  paralysisEffect: /^\+(\d+(?:\.\d+)?)% inflicted Paralysis Effect(?: when holding a (Two|One)-Handed Weapon)?$/i,
  weaken: /Weaken/i,
  maxFrostbite: /^\+(\d+) (?:to )?Max Frostbite Rating$/i,
  // Ice Puppet's Ice Cage (pactspirit outer node, game affix 404859; the affix carries no client-side effect rows).
  icePrison: /^Focus energy to create an ice prison Near yourself and the Pact Holder, which debuffs Frostbitten enemies inside every second and makes them take \+(\d+(?:\.\d+)?)% additional Cold Damage, up to (\d+) stacks, for (\d+(?:\.\d+)?) ?s\.?$/i,
  // Pact scripted-effects batch (2026-10-13): pact-spirit outer effects and kismets with their own clock (src/timed-effects.js).
  // A pact level text splits into lines, so a spirit's "Cooldown: N s" line pairs with its effect line by source.
  spiritCooldown: /^Cooldown: (\d+(?:\.\d+)?) ?s\.?$/i,
  meltingFlamesArea: /^Covers targets within a (\d+(?:\.\d+)?) ?m radius with flames and debuffs enemies within the area\.?$/i,
  meltingFlamesDebuff: /^Debuff: \+ ?(\d+(?:\.\d+)?)% additional Fire Damage taken by the enemy for (\d+(?:\.\d+)?) ?s\.?$/i,
  bitterThunder: /^Bestows the surging power of lightning to the pact holder, granting \+ ?(\d+(?:\.\d+)?)% additional Lightning Damage and \+ ?(\d+(?:\.\d+)?)% additional Max Damage for (\d+(?:\.\d+)?) ?s\.?$/i,
  witchAntelope: /^Inflicts Paralysis or Weaken on enemies within (\d+(?:\.\d+)?) ?m in turn\. Cooldown: (\d+(?:\.\d+)?) ?s\.?$/i,
  ccTypeDamage: /^For every type of crowd control effect the enemy has, you and your Minions deal \+?(\d+(?:\.\d+)?)% additional damage to them$/i,
  iceSoul: /^Inflicts Frostbite on nearby enemies$/i,
  holyMaiden: /^Inflicts Paralysis, Blind, Weaken, Slow, Taunt, and Frostbite on hit$/i,
  channelWeaken: /^For every (\d+) channeled stacks, inflicts Weaken on enemies within (\d+(?:\.\d+)?) ?m$/i,
  attackProjectileBlind: /^Blinds nearby enemies when using an Attack Projectile Skill$/i,
  valkyrieGain: /^Gains 1 stack of Valkyrie's Hymn for every (\d+(?:\.\d+)?)% Max Mana consumed$/i,
  valkyrieMax: /^\+(\d+) Max Valkyrie's Hymn Stacks$/i,
  valkyriePerStack: /^\+(\d+(?:\.\d+)?)% Elemental Damage for every stack of Valkyrie's Hymn$/i,
  valkyrieAtMax: /^Upon reaching Max Valkyrie's Hymn Stacks, \+(\d+(?:\.\d+)?)% Elemental Resistance Penetration$/i,
  mirroredGain: /^Gains 1 stack of Mirrored Shade every (\d+(?:\.\d+)?) ?s while standing on a Terra Skill$/i,
  mirroredMax: /^\+(\d+) to Max Mirrored Shade Stacks$/i,
  mirroredDamage: /^\+(\d+(?:\.\d+)?)% additional Terra Skill Damage while having Mirrored Shade$/i,
  mirroredCharge: /^\+(\d+) to Max Terra Charge Stacks when Mirrored Shade reaches max stacks$/i,
  felineGain: /^Gains 1 stack of Feline Stimulant when triggering a Main Skill$/i,
  felineMax: /^\+(\d+) to Max Feline Stimulant stacks$/i,
  felineDamage: /^\+(\d+(?:\.\d+)?)% additional Attack Damage when having Feline Stimulant$/i,
  felineAggression: /^Has Attack Aggression when reaching Max Feline Stimulant stacks$/i,
  squidGain: /^Consuming Spell Burst with at least (\d+) stack\(s\) of Max Spell Burst grants 1 stack of Squidnova$/i,
  squidEffect: /^\+(\d+(?:\.\d+)?)% Squidnova Effect$/i,
  squidDamage: /^\+(\d+(?:\.\d+)?)% additional Spell Damage when having Squidnova$/i,
  squidBurst: /^\+(\d+) to Max Spell Burst when having Squidnova$/i,
  spiderFluid: /^\+(\d+(?:\.\d+)?)% damage per stack of Wilt inflicted recently\. Stacks up to (\d+) time\(s\)$/i,
  scorpionStinger: /^\+(\d+(?:\.\d+)?)% Reaping Recovery Speed for each Reaping dealt recently, up to (\d+(?:\.\d+)?)%$/i,
  witchCauldron: /^When at full Energy Shield, removes all Energy Shields, \+(\d+(?:\.\d+)?)% additional Max Mana, and \+(\d+(?:\.\d+)?)% additional Spell Damage for (\d+(?:\.\d+)?) ?s$/i,
  skyPiercer: /^\+\d+(?:\.\d+)?% Attack Horizontal Projectile Speed and \+(\d+(?:\.\d+)?)% additional Attack Horizontal Projectile Damage within (\d+(?:\.\d+)?) ?s after using a Mobility Skill$/i,
  flashFlood: /^(?:Halves Spell Burst Upper Limit|\+\d+(?:\.\d+)?% additional Attack and Cast Speed for every Spell Burst triggered recently, up to \d+%)$/i,
  // Negative values too (2026-10-17: the follower's Icy Blade "-5% Frostbite Effect … for each Sweep Slash").
  frostbiteEffect: /^([+-]\d+(?:\.\d+)?)% Frostbite Effect$/i,
  numbedEffect: /^\+(\d+(?:\.\d+)?)% Numbed Effect$/i,
  numbedExtra: /^Inflicts (\d+) additional stack\(s\) of Numbed$/i,
  numbedThreshold: /thresholds for inflicting Numbed$/i,
  numbedBase: /^Changes the base effect of Numbed to: \+(\d+(?:\.\d+)?)% additional Lightning Damage taken$/i,
  luckyDamage: /^(?:Lucky Damage|Your and Minions' damage gains Lucky|Your damage gains Lucky)$/i,
  veryLuckyDamage: /^Very Lucky Damage$/i,
  luckyCrit: /^Lucky Critical Strike$/i,
  luckyVsNumbed: /^You and Minions deal Lucky Damage against Numbed enemies$/i,
  deteriorationChance: /^\+(\d+(?:\.\d+)?)% Deterioration Chance$/i,
  deteriorationExtra: /^(\d+(?:\.\d+)?)% chance to inflict (\d+) additional stack\(s\) of Deterioration$/i,
  deteriorationIncreased: /^\+(\d+(?:\.\d+)?)% Deterioration Damage$/i,
  deteriorationAdditional: /^([+-]?\d+(?:\.\d+)?)% additional Deterioration Damage$/i,
  deteriorationDuration: /^[+-]?\d+(?:\.\d+)?% (?:additional )?Deterioration Duration$/i
};

/** True when this module reads the line (src/line-effects.js leaves it alone). */
export function readByCombatStates(text) {
  return Object.values(PATTERNS).some((pattern) => pattern.test(text));
}

/** The Frostbite Rating the build inflicts (10 base + "+N to Max Frostbite Rating", capped at 120; provisional reading). */
export function inflictedFrostbiteRating(modifierTexts = []) {
  const extra = sum(modifierTexts.map((line) => { const match = normalizePercentageText(String(line.text)).trim().match(PATTERNS.maxFrostbite); return match && !/Minion/i.test(line.text) ? num(match[1]) * (line.multiplier ?? 1) : 0; }));
  return Math.min(BUFF_VALUES.frostbiteMaxRating, BUFF_VALUES.frostbiteBaseRating + extra);
}

/**
 * @param {object[]} modifierTexts
 * @param {object} state src/planner.js lineConditionState (buff, ailment and skill facts)
 * @returns {{ entries: object[], derived: object[], buffs: object, debuffs: object, lucky: object, deterioration: object, iceCage: object[], timedEffects: object[] }}
 */
export function resolveCombatStates(modifierTexts = [], state = {}) {
  const lines = modifierTexts.filter((line) => line.origin !== "derived" && !line.lineEffect).map((line) => ({ ...line, clean: normalizePercentageText(String(line.text ?? "")).replace(/\s+/g, " ").trim() }));
  const find = (pattern) => lines.filter((line) => pattern.test(line.clean));
  const values = (pattern, index = 1) => find(pattern).map((line) => num(line.clean.match(pattern)[index]) * (line.multiplier ?? 1));
  const entries = [], derived = [];
  // Timed and stacking effects (src/timed-effects.js): { id, label, source, target, toggle, enabled, active, reason, parts, … }.
  // Their derived lines hold the sustained value; the parts carry the clock the 5 s / 20 s windows and the recount follow.
  const timedEffects = [];
  const entry = (line, active, conditionText, extra = {}) => entries.push({ source: line.source, origin: line.origin, text: line.clean, active, conditionText, status: extra.status || (active ? "In calc" : "Inactive"), provisional: Boolean(extra.provisional), bodies: (extra.bodies || []).map((text) => ({ body: text, derivedText: active ? text : null, readers: ["state"] })), condition: extra.condition || "combatState", group: extra.group || null, ...(extra.enemyDebuff ? { enemyDebuff: true } : {}) });
  // Buff lines take origin "buff" (every engine reads them as plain lines); enemy damage-taken lines take origin "derived"
  // (the hit engine reads derived "damage taken" lines as the target's; the ailment engines read typed ones).
  // A best-case assumption is on unless its condition is switched off (state flag or the requested conditions; Config tab
  // "Best-case assumptions" list, src/app.js).
  const conditionOn = (id) => state[id] !== false && state.requestedConditions?.[id] !== false;
  const derive = (text, source, conditionText, provisional = false) => derived.push({ text, source, origin: /damage taken$/i.test(text) ? "derived" : "buff", multiplier: 1, derivedFrom: source, lineEffect: { conditional: true, key: "combatState", conditionText, provisional } });

  // ---- Fervor ----
  const fervorSources = find(PATTERNS.hasFervor);
  // A fixed Fervor Rating (residual batch A-3) gives Fervor at that Rating; the lowest fixed value wins (provisional). A fixed
  // Rating is not capped at the Max Fervor Rating of 100 (user-confirmed 2026-10-14: Unmatched Valor's 130 goes past it).
  const fixedFervor = find(PATTERNS.fervorFixed).map((line) => num(line.clean.match(PATTERNS.fervorFixed)[1]));
  const hasFervor = fervorSources.length > 0 || fixedFervor.length > 0;
  const fervorEffect = sum(values(PATTERNS.fervorEffect));
  const heldFervorRating = !hasFervor ? 0 : fixedFervor.length ? Math.min(...fixedFervor) : BUFF_VALUES.fervorMax;
  // Centralize part 2 ("Consumes half of current Fervor Rating when hit. -0.8% additional damage per 1 point consumed"):
  // being hit only costs damage, so the best case is not being hit (user-confirmed 2026-10-14; condition centralizeNotHit, on by
  // default, separate from "Hit or blocked recently"). Switched off: hit at the held Rating, half of it consumed, the Rating
  // halves for every Fervor reader below and -0.8% × consumed additional damage applies to everything. Whether a fixed Rating
  // can be consumed is unknown: assumed yes when switched off (provisional). One consumption per hit; with several Centralize
  // lines the largest per-point penalty is used (provisional).
  const centralizeLines = find(PATTERNS.centralizeHit);
  const centralizeNotHit = conditionOn("centralizeNotHit");
  const centralizeHitApplies = hasFervor && centralizeLines.length > 0 && !centralizeNotHit;
  const centralizeConsumed = centralizeHitApplies ? round(heldFervorRating / 2) : 0;
  const centralizePerPoint = Math.max(0, ...centralizeLines.map((line) => { const match = line.clean.match(PATTERNS.centralizeHit); return match[1] ? num(match[1]) * (line.multiplier ?? 1) / num(match[2] || 1) : 0; }));
  const centralizePenalty = round(centralizePerPoint * centralizeConsumed);
  const fervorRating = round(heldFervorRating - centralizeConsumed);
  const centralizeHitText = `hit (Centralize; condition "Centralize: not hit" off): half of the ${heldFervorRating} Fervor Rating consumed (${centralizeConsumed}), ${fervorRating} left for every Fervor reader${fixedFervor.length ? "; whether a fixed Rating can be consumed is unknown, assumed yes (provisional)" : " (provisional)"}`;
  const fervorText = (fixedFervor.length
    ? `Fervor Rating fixed at ${heldFervorRating} (the fixed-Rating line's value, not capped at ${BUFF_VALUES.fervorMax}: user-confirmed 2026-10-14${fixedFervor.length > 1 ? "; the lowest fixed value wins, provisional" : ""})`
    : `Fervor held at ${BUFF_VALUES.fervorMax} Rating (it builds on hitting Elite enemies; the dummy is an Elite; own buffs pre-built: provisional)`)
    + (centralizeConsumed ? `; ${centralizeHitText}` : "");
  for (const line of fervorSources) entry(line, true, fervorText, { provisional: !fixedFervor.length });
  for (const line of find(PATTERNS.fervorFixed)) entry(line, true, fervorText);
  // "+1% additional damage per 3 Fervor Rating": rounded down per step (provisional, as the per-stat lines).
  for (const line of find(PATTERNS.damagePerFervor)) {
    const match = line.clean.match(PATTERNS.damagePerFervor);
    const every = num(match[4] || 1);
    const value = round(num(match[1]) * (line.multiplier ?? 1) * Math.floor(fervorRating / every));
    const body = `+${value}% ${match[2] || ""}${match[3]}`;
    entry(line, hasFervor && value !== 0, hasFervor ? `${fervorRating} Fervor Rating ÷ ${every}, rounded down (provisional)` : "no Fervor source", { provisional: true, bodies: [body] });
    if (hasFervor && value) derive(body, line.source, `${fervorRating} Fervor Rating`, true);
  }
  if (hasFervor) {
    const rating = round(fervorRating * BUFF_VALUES.fervorPerPoint * (1 + fervorEffect / 100));
    derive(`+${rating}% Critical Strike Rating`, "Fervor (keyword 740: +2% Critical Strike Rating per point, max 100)", `${fervorText}; ${fervorEffect ? `+${fervorEffect}% Fervor effect` : "no Fervor effect"}`, true);
  }
  // Ghost Slaughter: "Fervor gains an additional base effect: +1% additional Attack and Ailment Damage for every 1 Fervor
  // Rating": +Rating × 1% additional Attack Damage and additional Ailment Damage. Provisional: a Fervor base effect, so Fervor
  // effect scales it, like the Critical Strike Rating base effect.
  const fervorAttackAilment = [];
  for (const line of find(PATTERNS.fervorAttackAilment)) {
    const match = line.clean.match(PATTERNS.fervorAttackAilment);
    const every = num(match[2] || 1);
    const value = round(num(match[1]) * (line.multiplier ?? 1) * Math.floor(fervorRating / every) * (1 + fervorEffect / 100));
    const bodies = [`+${value}% additional Attack Damage`, `+${value}% additional Ailment Damage`];
    const reading = `${fervorRating} Fervor Rating${every !== 1 ? ` ÷ ${every}, rounded down` : ""} × ${num(match[1])}%${fervorEffect ? ` × (1 + ${fervorEffect}% Fervor effect)` : ""}; a Fervor base effect, so Fervor effect scales it, like the Critical Strike Rating base effect (provisional)`;
    entry(line, hasFervor && value !== 0, hasFervor ? reading : "no Fervor source", { provisional: true, bodies });
    if (hasFervor && value) {
      for (const body of bodies) derive(body, line.source, reading, true);
      fervorAttackAilment.push({ source: line.source, value, rating: fervorRating, fervorEffectPercent: fervorEffect, text: `${line.source}: ${bodies.join(" and ")} (${reading})` });
    }
  }
  for (const line of find(PATTERNS.fervorSkillArea)) entry(line, hasFervor, "Skill Area", { status: "No DPS effect" });
  for (const line of find(PATTERNS.fervorLifeDrain)) entry(line, hasFervor, "Life and Energy Shield drain", { status: "No DPS effect" });
  // User-confirmed 2026-10-14: Fervor from a static source ("Have Fervor", the necklace) is not lost at Low Life, though sealed
  // Life keeps the build at Low Life; only Fervor gained in combat would be.
  for (const line of find(PATTERNS.losesFervorLowLife)) entry(line, false, fervorSources.length || fixedFervor.length ? "Fervor here is static (\"Have Fervor\" or a fixed Rating), so Low Life does not remove it (user-confirmed 2026-10-14)" : "no Fervor source", { status: "No DPS effect" });
  for (const line of find(PATTERNS.fervorEffect)) entry(line, hasFervor, hasFervor ? `scales the Fervor Critical Strike Rating${fervorAttackAilment.length ? " and Ghost Slaughter's additional Attack and Ailment Damage" : ""}` : "no Fervor source");
  for (const line of find(PATTERNS.critDamagePerFervor)) {
    const value = round(num(line.clean.match(PATTERNS.critDamagePerFervor)[1]) * (line.multiplier ?? 1) * fervorRating);
    entry(line, hasFervor, hasFervor ? `${fervorRating} Fervor Rating (provisional)` : "no Fervor source", { provisional: true, bodies: [`+${value}% Critical Strike Damage`] });
    if (hasFervor && value) derive(`+${value}% Critical Strike Damage`, line.source, `${fervorRating} Fervor Rating`, true);
  }
  for (const line of find(PATTERNS.fervorRatingOnHit)) entry(line, hasFervor, hasFervor ? (fixedFervor.length ? `Fervor Rating is fixed at ${heldFervorRating}` : "Fervor Rating is already held at its max (100)") : "no Fervor source", { status: "No DPS effect" });
  // Centralize part 1 (the user has not answered whether it can raise a fixed Rating): the current reading is kept.
  const fixedFervorSource = (() => { const fixedLine = find(PATTERNS.fervorFixed).find((line) => num(line.clean.match(PATTERNS.fervorFixed)[1]) === heldFervorRating); if (!fixedLine) return ""; const prefix = fixedLine.clean.match(/^\[([^\]]+)\]/); const core = String(fixedLine.source || "").match(/core: ([^(]+?)(?: \(|$)/i); return (prefix?.[1] || core?.[1] || fixedLine.source || "").trim(); })();
  for (const line of find(PATTERNS.centralize)) entry(line, hasFervor, hasFervor ? (fixedFervor.length ? `Fervor Rating fixed at ${heldFervorRating}${fixedFervorSource ? ` by ${fixedFervorSource}` : ""}; whether Centralize can raise a fixed Rating is unconfirmed` : "Fervor Rating is already held at its max (100)") : "no Fervor source", { status: "No DPS effect" });
  // Centralize part 2: best case not hit (No DPS effect); switched off, the penalty is in calc.
  for (const line of centralizeLines) {
    const body = `-${centralizePenalty}% additional damage`;
    const reason = !hasFervor ? "no Fervor source"
      : centralizeNotHit ? "best case: not hit, so no Fervor Rating is consumed and no penalty applies (user-confirmed 2026-10-14; condition \"Centralize: not hit\")"
      : `${centralizeHitText}: ${centralizePerPoint}% × ${centralizeConsumed} consumed = ${body} on everything`;
    if (centralizeHitApplies && centralizePenalty) entry(line, true, reason, { provisional: true, bodies: [body] });
    else entry(line, hasFervor, reason, { status: hasFervor ? "No DPS effect" : "Inactive" });
    entries[entries.length - 1].listedAs = "condition:centralizeNotHit";
  }
  if (centralizeHitApplies && centralizePenalty) derive(`-${centralizePenalty}% additional damage`, `${centralizeLines[0].source}: Centralize (hit, ${centralizeConsumed} Fervor Rating consumed)`, centralizeHitText, true);
  const centralize = centralizeLines.length ? { sources: centralizeLines.map((line) => line.source), notHit: centralizeNotHit, hasFervor, applied: centralizeHitApplies, heldRating: heldFervorRating, consumed: centralizeConsumed, rating: fervorRating, perPointPercent: centralizePerPoint, penaltyPercent: centralizePenalty, fixed: fixedFervor.length > 0 } : null;
  for (const line of find(PATTERNS.movementPerFervor)) entry(line, false, "Movement Speed", { status: "No DPS effect" });

  // ---- Aggression and Hasten ----
  const aggressionEffect = (kind) => sum(find(PATTERNS.aggressionEffect).filter((line) => line.clean.match(PATTERNS.aggressionEffect)[2].toLowerCase() === kind).map((line) => num(line.clean.match(PATTERNS.aggressionEffect)[1]) * (line.multiplier ?? 1)));
  const attackAggressionLines = find(PATTERNS.attackAggressionGain).filter((line) => !/when casting an Attack Skill/i.test(line.clean) || state.castsAttack);
  // Kitty Express (pact scripted-effects batch): "Has Attack Aggression when reaching Max Feline Stimulant stacks" (game affix
  // 86855680) holds with the Feline Stimulant stacks at their cap (own buff, best case; resolved with the timed effects below).
  const felineOn = find(PATTERNS.felineGain).length > 0 && conditionOn("felineStimulant") && Number(state.mainUsesPerSecond) > 0;
  const hasAttackAggression = attackAggressionLines.length > 0 || (felineOn && find(PATTERNS.felineAggression).length > 0);
  for (const line of find(PATTERNS.attackAggressionGain)) entry(line, attackAggressionLines.includes(line), attackAggressionLines.includes(line) ? "Attack Aggression held (gained by the build's Attack skill / always)" : "no active Attack skill");
  for (const line of find(PATTERNS.attackAggressionDefeat)) entry(line, false, "the training dummy never dies", { status: "Not on dummy" });
  if (hasAttackAggression) {
    const value = round(BUFF_VALUES.attackAggression.percent * (1 + aggressionEffect("attack") / 100));
    derive(`+${value}% additional Attack Damage`, BUFF_VALUES.attackAggression.source, "Attack Aggression held");
    derive(`+${value}% additional Attack Speed`, BUFF_VALUES.attackAggression.source, "Attack Aggression held");
  }
  // "Gains Spell Aggression when casting a Spell Skill" (residual batch A-3): held while the build casts a Spell on the dummy.
  const spellAggressionLines = [...find(PATTERNS.spellAggressionGain), ...find(PATTERNS.spellAggressionOnCast).filter(() => state.dealsSpellDamage)];
  for (const line of find(PATTERNS.spellAggressionOnCast).filter(() => !state.dealsSpellDamage)) entry(line, false, "no Spell Skill is cast on the dummy");
  const hasSpellAggression = spellAggressionLines.length > 0;
  for (const line of spellAggressionLines) entry(line, true, "Spell Aggression held");
  const perCast = find(PATTERNS.spellAggressionPerCast);
  const perCastEffect = hasSpellAggression && state.mainIsSpell ? sum(perCast.map((line) => { const match = line.clean.match(PATTERNS.spellAggressionPerCast); return num(match[1]) * num(match[2]) * (line.multiplier ?? 1); })) : 0;
  for (const line of perCast) entry(line, perCastEffect > 0, perCastEffect > 0 ? "the Main Spell Skill is cast continuously: stacks held at their cap (provisional)" : "no Spell Aggression or no Main Spell Skill", { provisional: true });
  if (hasSpellAggression) {
    const value = round(BUFF_VALUES.spellAggression.percent * (1 + (aggressionEffect("spell") + perCastEffect) / 100));
    derive(`+${value}% additional Spell Damage`, BUFF_VALUES.spellAggression.source, "Spell Aggression held");
    derive(`+${value}% additional Cast Speed`, BUFF_VALUES.spellAggression.source, "Spell Aggression held");
  }
  for (const line of find(PATTERNS.aggressionEffect)) entry(line, line.clean.includes("Attack") ? hasAttackAggression : hasSpellAggression, "scales the Aggression buff");
  const hastenSources = [
    ...find(PATTERNS.hastenAlways).map((line) => [line, true, "Hasten held"]),
    ...find(PATTERNS.hastenAgility).map((line) => [line, (state.blessingStacks?.Agility || 0) > 0, (state.blessingStacks?.Agility || 0) > 0 ? "Agility Blessing at max stacks (Blessing model)" : "no Agility Blessing stacks"]),
    ...find(PATTERNS.hastenTrauma).map((line) => [line, (state.enemyAilments || []).includes("Trauma"), (state.enemyAilments || []).includes("Trauma") ? "the build keeps inflicting Trauma: Hasten refreshed (uptime 1; provisional)" : "the build inflicts no Trauma"]),
    ...find(PATTERNS.hastenMinionCrit).map((line) => [line, Boolean(state.minionsCrit), state.minionsCrit ? "a modeled Minion crits: Hasten refreshed (uptime 1; provisional)" : "no modeled Minion"])
  ];
  const hasHasten = hastenSources.some(([, active]) => active);
  for (const [line, active, text] of hastenSources) entry(line, active, text, { provisional: /provisional/.test(text) });
  const hastenEffect = sum(values(PATTERNS.hastenEffect));
  for (const line of find(PATTERNS.hastenEffect)) entry(line, hasHasten, hasHasten ? "scales Hasten" : "no Hasten source");
  if (hasHasten) {
    const value = round(BUFF_VALUES.hasten.percent * (1 + hastenEffect / 100));
    derive(`+${value}% additional Attack Speed`, BUFF_VALUES.hasten.source, "Hasten held");
    derive(`+${value}% additional Cast Speed`, BUFF_VALUES.hasten.source, "Hasten held");
  }

  // ---- Thrill Barrier (residual batch A-3) ----
  // Uptime = 1 − (1 − chance)^(inflictions in one duration), with one Elemental Ailment infliction per main-skill use (the
  // early use rate: a lower bound for builds whose hits inflict several; provisional). Value: TLIDB keyword +20% additional
  // Elemental Damage.
  const elementalOnDummy = (state.enemyAilments || []).some((name) => ["Ignite", "Frostbite", "Frozen", "Freeze", "Numbed", "Shock"].includes(name));
  for (const line of find(PATTERNS.thrillBarrier)) {
    const match = line.clean.match(PATTERNS.thrillBarrier);
    const chance = Math.min(1, num(match[1]) * (line.multiplier ?? 1) / 100), seconds = num(match[2]);
    const rate = Math.max(0, Number(state.mainUsesPerSecond) || 0);
    const uptime = elementalOnDummy && rate > 0 ? 1 - (1 - chance) ** (rate * seconds) : 0;
    const value = round(BUFF_VALUES.thrillBarrier * uptime);
    entry(line, uptime > 0, uptime > 0 ? `Thrill Barrier uptime ${round(uptime * 100)}% (${round(chance * 100)}% per infliction, ${round(rate)} inflictions/s from the main skill's use rate, ${seconds} s; provisional)` : elementalOnDummy ? "no main-skill use rate" : "the build inflicts no Elemental Ailment", { provisional: true, bodies: [`+${value}% additional Elemental Damage`] });
    if (value > 0) derive(`+${value}% additional Elemental Damage`, line.source, `Thrill Barrier at ${round(uptime * 100)}% uptime`, true);
  }

  // ---- Fortitude (defence) and per-stack damage ----
  const fortitudeGain = find(PATTERNS.fortitudeGain);
  const hasFortitude = fortitudeGain.length > 0 && state.castsMelee;
  const fortitudeStacks = hasFortitude ? BUFF_VALUES.fortitudeBaseMax + sum(find(PATTERNS.fortitudeExtra).map((line) => { const match = line.clean.match(PATTERNS.fortitudeExtra); return num(match[1] || match[2]) * (line.multiplier ?? 1); })) : 0;
  for (const line of fortitudeGain) entry(line, hasFortitude, hasFortitude ? `${fortitudeStacks} Fortitude stacks held (defence: -5% Hit Damage taken each)` : "no active Melee skill", { status: hasFortitude ? "No DPS effect" : "Inactive" });
  for (const line of find(PATTERNS.fortitudeExtra)) entry(line, hasFortitude, "Fortitude stack cap", { status: hasFortitude ? "No DPS effect" : "Inactive" });
  for (const line of find(PATTERNS.fortitudeDamage)) {
    const match = line.clean.match(PATTERNS.fortitudeDamage);
    const value = round(num(match[1]) * (line.multiplier ?? 1) * Math.floor(fortitudeStacks / num(match[2])));
    entry(line, value > 0, value > 0 ? `${fortitudeStacks} Fortitude stacks held (own buffs pre-built)` : "no Fortitude stacks", { bodies: [`+${value}% additional damage`] });
    if (value > 0) derive(`+${value}% additional damage`, line.source, `${fortitudeStacks} Fortitude stacks`);
  }

  // ---- Elixir (Sage's Elixir Skills are not modeled) ----
  for (const line of find(PATTERNS.elixirActive)) entry(line, false, state.elixirSkill ? "Elixir Skill uptime is not modeled" : "no Elixir Skill", { status: state.elixirSkill ? "Not modeled" : "Inactive" });
  for (const line of find(PATTERNS.elixirOther).filter((line) => !PATTERNS.elixirActive.test(line.clean))) entry(line, false, "Elixir Skill effects are not modeled", { status: state.elixirSkill ? "Not modeled" : "Inactive" });

  // ---- enemy debuffs ----
  // Audit of debuffs held from t = 0 in the 5 s / 20 s windows (pact scripted-effects batch 2026-10-13; the dummy starts clean):
  //   built from zero now (src/timed-effects.js): the Ice Cage, the "Every N s … Stacks up to M" debuff (Impending), Numbed
  //   (one stack per main-skill use), Witch Antelope's Paralysis turns, Melting Flames, Purgatory (src/hero-trait-modules.js);
  //   correct as held: Frail, the Infiltrations, Spell-hit resistance shred, on-hit Paralysis (4 s base duration, refreshed by
  //   hits), Frostbite and Freeze (a fixed rating on the first Cold hit), skill and gear-triggered curses (applied by the first
  //   cast or hit), Blizzard's hit debuff (6 s, refreshed every 2 s), Crimson Tide (from the first Terra cast) and the
  //   "damage taken by Nearby enemies" auras: each lands with the first hit or cast, which every window starts with. Own
  //   speed buffs that build per second (Starcatcher) stay held when prebuiltSelfBuffs is off (the windows do not vary use
  //   rates over time; provisional).
  const debuffs = { frail: false, infiltration: new Set(), paralysis: 0, frostbiteRating: 0, frozen: false, numbedStacks: 0 };
  const dealt = state.dealtTypes || new Set();
  for (const line of find(PATTERNS.frail)) { const active = Boolean(state.dealsSpellDamage); debuffs.frail ||= active; entry(line, active, active ? "the build deals Spell Damage: Frail held on the dummy (duration not sourced; uptime 1, provisional)" : "the build deals no Spell Damage", { provisional: true, bodies: [`+${BUFF_VALUES.frail}% additional Spell Damage taken`] }); }
  // "Nearby enemies within N m have Frail": an explicit radius holds at the chosen distance (src/dummy-target.js: close to the
  // dummy, or 6 m away in the Distant alternative). Before 2026-10-12 it needed N ≥ 10 (the 10 m stand-in).
  for (const line of find(PATTERNS.frailNearby)) { const radius = num(line.clean.match(PATTERNS.frailNearby)[1]); const active = explicitRadiusHolds(radius, state.nearTarget); debuffs.frail ||= active; entry(line, active, active ? `the player stands ${state.nearTarget === false ? `${DISTANT_STANDING_METERS} m away (Distant alternative)` : "close to the dummy (best case)"}, inside ${radius} m: Frail held` : `the Distant alternative stands ${DISTANT_STANDING_METERS} m away, outside ${radius} m`, { bodies: [`+${BUFF_VALUES.frail}% additional Spell Damage taken`] }); }
  if (debuffs.frail) derive(`+${BUFF_VALUES.frail}% additional Spell Damage taken`, "Frail (keyword 10000102)", "Frail on the dummy", true);
  // "+X% additional damage taken by Nearby enemies / enemies in Proximity": Nearby is within 6 m and Proximity within 4 m
  // (TLIDB keyword tooltips, Q-G9 answered 2026-10-12). The player stands close (best case), so it holds; the Distant
  // alternative of the Distance group (6 m away) drops it.
  for (const line of find(PATTERNS.takenNearby)) {
    const value = round(num(line.clean.match(PATTERNS.takenNearby)[1]) * (line.multiplier ?? 1));
    const near = state.nearTarget !== false;
    entry(line, near, near ? `the player stands close to the dummy (best case): inside Nearby (${KEYWORD_RADII_METERS.nearby} m) and Proximity (${KEYWORD_RADII_METERS.proximity} m), TLIDB keyword radii` : `the Distant alternative stands ${DISTANT_STANDING_METERS} m away: not Nearby / in Proximity`, { bodies: [`+${value}% additional damage taken`] });
    if (near) derive(`+${value}% additional damage taken`, line.source, "Nearby enemy (TLIDB radius: within 6 m)");
  }
  for (const line of find(PATTERNS.takenWithin)) {
    const m = line.clean.match(PATTERNS.takenWithin);
    const value = round(num(m[1] ?? m[4]) * (line.multiplier ?? 1));
    const type = m[2] ? `${m[2][0].toUpperCase()}${m[2].slice(1).toLowerCase()} ` : "";
    const meters = m[3] ?? m[5];
    const active = meters !== undefined ? explicitRadiusHolds(num(meters), state.nearTarget) : state.nearTarget !== false;
    const body = `+${value}% additional ${type ? `${type}Damage` : "damage"} taken`;
    entry(line, active, active ? `the player stands ${state.nearTarget === false ? `${DISTANT_STANDING_METERS} m away (Distant alternative)` : "close to the dummy (best case)"}${meters !== undefined ? `, inside ${meters} m` : ", inside Nearby / Proximity (TLIDB radii)"}` : `the Distant alternative stands ${DISTANT_STANDING_METERS} m away${meters !== undefined ? `, outside ${meters} m` : ""}`, { bodies: [body] });
    if (active) derive(body, line.source, "enemy within the line's radius");
  }
  // Stacking enemy debuff: held at its stack cap. The dummy starts clean and the stacks build over stacks × interval seconds
  // (1.25 s for Impending), which the 5 s / 20 s windows do not ramp: provisional.
  for (const line of find(PATTERNS.takenStacking)) {
    const m = line.clean.match(PATTERNS.takenStacking);
    const stacks = num(m[4]), value = round(num(m[2]) * stacks * (line.multiplier ?? 1));
    const active = explicitRadiusHolds(num(m[3]), state.nearTarget);
    // Audit of held debuffs (pact scripted-effects batch 2026-10-13): the stacks build on the clean dummy, 1 at t = 0 and 1 more
    // every interval (src/timed-effects.js ramp; whether the first lands at t = 0 or after one interval is not sourced: provisional).
    const interval = num(m[1]), perStack = num(m[2]) * (line.multiplier ?? 1);
    entry(line, active, active ? `the dummy within ${m[3]} m: ${stacks} stacks in sustained figures; the 5 s / 20 s windows build them on the clean dummy, 1 at t = 0 and 1 more every ${interval} s (full after ${round(interval * (stacks - 1))} s; provisional)` : `outside ${m[3]} m`, { provisional: true, enemyDebuff: true, bodies: [`+${value}% additional damage taken`] });
    if (active) {
      derive(`+${value}% additional damage taken`, line.source, `${stacks} stacks of a stacking debuff (built from zero in the windows)`, true);
      timedEffects.push({ id: `stackingDebuff:${line.source}`, label: `${line.source}: stacking debuff`, source: line.source, target: "enemy", toggle: false, enabled: true, active: true, parts: [{ type: null, reach: "all", percent: perStack, schedule: { kind: "ramp", maxStacks: stacks, intervalSeconds: interval, startStacks: 1 } }] });
    }
  }
  // Resistance shred on a Spell hit of a type (chunk 3): held while a Spell hit deals that type (uptime 1: a modeled Spell
  // hits far more often than once per 3 s; provisional). The reduction is applied as an equal penetration (the dummy's
  // resistance is 30%, so the two coincide there; their difference below 0% resistance is not modeled: provisional).
  for (const line of find(PATTERNS.spellHitShred)) {
    const match = line.clean.match(PATTERNS.spellHitShred);
    const type = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
    const value = round(num(match[2]) * (line.multiplier ?? 1));
    const targets = match[3].split(/,\s*(?:and\s+)?|\s+and\s+/).map((word) => word.trim()).filter(Boolean);
    const active = Boolean(state.spellHitTypes?.has?.(type));
    const bodies = targets.map((target) => `+${value}% ${target} Penetration`);
    entry(line, active, active ? `a Spell hit deals ${type} Damage: -${value}% ${targets.join(", ")} Resistance held (uptime 1; applied as penetration, provisional)` : `no Spell hit deals ${type} Damage`, { provisional: true, bodies });
    if (active) for (const body of bodies) derive(body, line.source, `Spell hit ${type} Damage (resistance shred, provisional)`, true);
  }
  for (const line of find(PATTERNS.infiltrationOnHit)) {
    const match = line.clean.match(PATTERNS.infiltrationOnHit);
    const type = match[1] || match[2];
    const typeWord = type[0].toUpperCase() + type.slice(1).toLowerCase();
    const active = Boolean(state.anyHit);
    if (active) debuffs.infiltration.add(typeWord);
    entry(line, active, active ? `the build hits the dummy: ${typeWord} Infiltration held (uptime 1, provisional)` : "no modeled hit", { provisional: true, bodies: [`+${BUFF_VALUES.infiltration}% additional ${typeWord} Damage taken`] });
  }
  for (const line of find(PATTERNS.lightningInfiltrationCrit)) { const active = Boolean(state.canCrit) && dealt.has("Lightning"); if (active) debuffs.infiltration.add("Lightning"); entry(line, active, active ? "the build crits with Lightning Damage: Lightning Infiltration held (uptime 1, provisional)" : "no crit with Lightning Damage", { provisional: true }); }
  const frostbitten = (state.enemyAilments || []).includes("Frostbite");
  debuffs.frostbiteRating = frostbitten ? inflictedFrostbiteRating(modifierTexts) : 0;
  // user-confirmed 2026-10-18: Frozen at 100 or higher (TLIDB says "more than 100").
  debuffs.frozen = frostbitten && debuffs.frostbiteRating >= BUFF_VALUES.frostbiteFreezeAt;
  for (const line of find(PATTERNS.coldInfiltrationFrozen)) { if (debuffs.frozen) debuffs.infiltration.add("Cold"); entry(line, debuffs.frozen, debuffs.frozen ? "the dummy is Frozen" : "the dummy is not Frozen (Frostbite Rating < 100)"); }
  for (const line of find(PATTERNS.infiltrationCursedBy)) {
    const [, type, curse] = line.clean.match(PATTERNS.infiltrationCursedBy);
    const typeWord = type[0].toUpperCase() + type.slice(1).toLowerCase();
    const active = (state.curseSkillNames || []).some((name) => name.toLowerCase() === curse.trim().toLowerCase());
    if (active) debuffs.infiltration.add(typeWord);
    entry(line, active, active ? `${curse} is on the dummy: ${typeWord} Infiltration held (uptime 1, provisional)` : `${curse} is not on the dummy (no active ${curse} curse within the curse limit)`, { provisional: true, enemyDebuff: true, bodies: [`+${BUFF_VALUES.infiltration}% additional ${typeWord} Damage taken`] });
  }
  for (const line of find(PATTERNS.coldInfiltrationFrostbitten)) { if (frostbitten) debuffs.infiltration.add("Cold"); entry(line, frostbitten, frostbitten ? "the dummy is Frostbitten" : "the build inflicts no Frostbite"); }
  for (const line of find(PATTERNS.penetrating)) {
    const types = ["Fire", "Lightning", "Cold"].filter((type) => dealt.has(type));
    for (const type of types) debuffs.infiltration.add(type);
    entry(line, types.length > 0, types.length ? `inflicts ${types.join(", ")} Infiltration (the types the build deals; uptime 1, provisional)` : "the build deals no Elemental Damage", { provisional: true });
  }
  // Fire Infiltration on the beam / Ignite path stays the existing condition (src/scorching-beam-hit.js, theoretical-sources).
  // Infiltration Effect (residual batch A-3): scales that type's +13% (keyword value × (1 + Σ effect)). The beam / Ignite
  // path's own Fire Infiltration (src/scorching-beam-hit.js) does not read it.
  const infiltrationEffect = (type) => sum(find(PATTERNS.infiltrationEffect).filter((line) => line.clean.match(PATTERNS.infiltrationEffect)[2].toLowerCase() === type.toLowerCase()).map((line) => num(line.clean.match(PATTERNS.infiltrationEffect)[1]) * (line.multiplier ?? 1)));
  for (const line of find(PATTERNS.infiltrationEffect)) {
    const type = line.clean.match(PATTERNS.infiltrationEffect)[2];
    const word = type[0].toUpperCase() + type.slice(1).toLowerCase();
    const beamFire = word === "Fire" && state.beamActive;
    const held = debuffs.infiltration.has(word) && !beamFire;
    entry(line, held, held ? `scales the ${word} Infiltration on the dummy` : beamFire ? "the beam path's Fire Infiltration does not read Infiltration Effect" : `no ${word} Infiltration source`, beamFire ? { status: "Not modeled" } : {});
  }
  for (const type of debuffs.infiltration) if (!(type === "Fire" && state.beamActive)) derive(`+${round(BUFF_VALUES.infiltration * (1 + infiltrationEffect(type) / 100))}% additional ${type} Damage taken`, `${type} Infiltration (keyword ${type === "Fire" ? "10000103" : type === "Cold" ? "10000104" : "10000105"})`, `${type} Infiltration on the dummy`, true);
  for (const line of find(PATTERNS.perInfiltrationType)) {
    const count = debuffs.infiltration.size + (state.fireInfiltrationCondition && !debuffs.infiltration.has("Fire") ? 1 : 0);
    const value = round(num(line.clean.match(PATTERNS.perInfiltrationType)[1]) * (line.multiplier ?? 1) * count);
    entry(line, count > 0, `${count} Infiltration type${count === 1 ? "" : "s"} on the dummy`, { bodies: [`+${value}% additional Elemental Damage`] });
    if (value > 0) derive(`+${value}% additional Elemental Damage`, line.source, `${count} Infiltration types`, true);
  }
  const paralysisEffect = sum(find(PATTERNS.paralysisEffect).filter((line) => { const hand = line.clean.match(PATTERNS.paralysisEffect)[2]; return !hand || (hand === "Two" ? state.twoHanded : !state.twoHanded); }).map((line) => num(line.clean.match(PATTERNS.paralysisEffect)[1]) * (line.multiplier ?? 1)));
  for (const line of find(PATTERNS.paralysisAttacks)) { const active = Boolean(state.attackHits); if (active) debuffs.paralysis = 1; entry(line, active, active ? "Attacks hit the dummy: Paralysis held (duration not sourced; uptime 1, provisional)" : "no modeled Attack hit", { provisional: true }); }
  for (const line of find(PATTERNS.paralysisOnHit)) { const active = Boolean(state.anyHit); if (active) debuffs.paralysis = 1; entry(line, active, active ? "the build hits the dummy: Paralysis held (duration not sourced; uptime 1, provisional: talent Q18)" : "no modeled hit", { provisional: true }); }
  for (const line of find(PATTERNS.paralysisCursed)) { const active = Boolean(state.cursed && state.anyHit); if (active) debuffs.paralysis = 1; entry(line, active, active ? "the dummy is Cursed and hit: Paralysis held (uptime 1, provisional)" : "the dummy is not Cursed or not hit", { provisional: true }); }
  // Paralysis sources without a chance on the dummy (2026-10-14): each holds Paralysis (4 s base duration, manual rule
  // 1002020420, refreshed long before it lapses) while its condition holds; best case, provisional.
  const tenacity = Number(state.blessingStacks?.Tenacity) || 0, tenacityMax = Number(state.blessingMaxStacks?.Tenacity) || 0;
  const tenacityAtMax = tenacity > 0 && tenacity >= tenacityMax;
  for (const line of find(PATTERNS.paralysisTenacity)) { const active = Boolean(state.anyHit) && tenacityAtMax; if (active) debuffs.paralysis = 1; entry(line, active, active ? `Tenacity Blessing at max stacks (${tenacity}; Blessing model, own buffs held) and the build hits the dummy: Paralysis held (4 s base duration refreshed by hits; provisional)` : !state.anyHit ? "no modeled hit" : tenacity > 0 ? `Tenacity Blessing below max stacks (${tenacity} of ${tenacityMax})` : "no Tenacity Blessing stacks", { provisional: true }); }
  const dealsDamage = Boolean(state.anyHit || state.minionsCrit);
  for (const line of find(PATTERNS.paralysisDealDamage)) { if (dealsDamage) debuffs.paralysis = 1; entry(line, dealsDamage, dealsDamage ? "the build (or its Minions) deals damage to the dummy: Paralysis held (4 s base duration, refreshed); Weaken lowers only the enemy's damage and counts as a crowd control type (provisional)" : "the build deals no modeled damage", { provisional: true, enemyDebuff: true }); }
  for (const line of find(PATTERNS.paralysisNearby)) { const active = state.nearTarget !== false; if (active) debuffs.paralysis = 1; entry(line, active, active ? `the player stands close to the dummy (best case): inside Nearby (${KEYWORD_RADII_METERS.nearby} m, TLIDB keyword radius), so it is Paralyzed` : `the Distant alternative stands ${DISTANT_STANDING_METERS} m away: not Nearby`, { provisional: true, enemyDebuff: true }); }
  // Blocking: the "Hit or blocked recently" best case (condition blockedRecently, state.hitRecently), which needs Block chance.
  const canBlock = (Number(state.blockChance?.attack) || 0) > 0 || (Number(state.blockChance?.spell) || 0) > 0;
  for (const line of find(PATTERNS.paralysisBlocking)) { const active = state.hitRecently !== false && canBlock && state.nearTarget !== false; if (active) debuffs.paralysis = 1; entry(line, active, active ? "blocked recently (best-case assumption, user decision 2026-10-12; condition 'Hit or blocked recently') with the dummy Nearby: Paralysis held (provisional)" : state.hitRecently === false ? "Blocked recently is off (condition 'Hit or blocked recently')" : !canBlock ? "no Block chance, so the build never Blocks" : `the Distant alternative stands ${DISTANT_STANDING_METERS} m away: not Nearby`, { provisional: true }); }
  // Dual Kismet: Bounded Holy Maiden (game affix 908139264: on hit, Paralysis buff 230, Blind 20060, Weaken 270, Slow 260,
  // Taunt 280 and Frostbite): Paralysis held while the build hits (pact scripted-effects batch 2026-10-13; the -60% Crowd
  // Control Effect next to it is not applied to the Paralysis it inflicts: provisional).
  for (const line of find(PATTERNS.holyMaiden)) { const active = Boolean(state.anyHit); if (active) debuffs.paralysis = 1; entry(line, active, active ? "the build hits the dummy: Paralysis held (4 s base duration, refreshed by hits; manual rule 1002020420), Frostbite inflicted on hit (src/enemy-ailments.js), and Blind, Weaken, Slow and Taunt count as crowd control types" : "no modeled hit", { provisional: true, enemyDebuff: true, bodies: [`+${round(BUFF_VALUES.paralysis)}% damage taken`] }); }
  // Regain events (src/regain-model.js, 2026-10-14): the build Regains on hit while it has missing Life / Energy Shield (a
  // self-drain line, or the "Hit or blocked recently" best case); switched by the regainEvents condition. Read again by
  // src/line-conditions.js ("if you have Regained in the last N s") through state.regain (src/line-effects.js).
  const regain = resolveRegain({ modifierTexts: lines, supportDrains: state.regainInputs?.supportDrains || [], stats: state.regainInputs?.stats || {}, anyHit: Boolean(state.anyHit), hitRecently: state.hitRecently !== false, enabled: conditionOn("regainEvents"), hasFervor, castsAttack: Boolean(state.castsAttack), attackCrits: Boolean(state.attackHits && state.canCrit) });
  for (const line of find(PATTERNS.paralysisRegain)) { const meters = Number(line.clean.match(/within (\d+) ?m/i)?.[1] ?? 10); const inside = explicitRadiusHolds(meters, state.nearTarget); const active = regain.active && inside; if (active) debuffs.paralysis = 1; entry(line, active, active ? `${regain.reason}; the dummy is within ${meters} m: Paralysis held (refreshed every Regain; provisional)` : !regain.active ? regain.reason : `the Distant alternative stands ${DISTANT_STANDING_METERS} m away: outside ${meters} m`, { provisional: true, enemyDebuff: true }); }
  // Grudge (support; src/support-effects.js family "paralysis"): "When the supported skill deals damage to a Cursed target, there
  // is a +X% chance to Paralyze it" (leveled). Paralysis (keyword 704, manual rule 1002020420): +15% damage taken × (1 +
  // Paralysis Effect), 4 s base duration, 1 stack. Expected uptime 1 − (1 − p)^(hits in 4 s) at the supported skill's hit rate
  // from the skill-hit model (the Tendonslicer rule; state.chanceParalysis, filled by the planner's second pass with the measured
  // rate), built from zero on the clean dummy (timed schedule "chance": hits from the first use, then every 1 / rate s). Several
  // sources (and Witch Antelope's turns below) combine as 1 − Π(1 − uptime); an on-hit source that holds Paralysis leaves
  // nothing to add (1 stack). No line in the catalogs changes Paralysis duration. Freezing Point's "Debuffs inflicted when the
  // supported skill hits are now affected by Empower Effect" is not applied (open: src/empower-effects.js applies it to the
  // skill's own hit debuff only). Not a best-case assumption: the Cursed dummy and the hits are automatic.
  const chanceParalysisSources = (state.chanceParalysis || []).map((item) => {
    const chancePercent = Math.max(0, Math.min(100, Number(item.chancePercent) || 0));
    const rateKnown = Number.isFinite(item.hitsPerSecond);
    const hitsPerSecond = rateKnown ? Math.max(0, item.hitsPerSecond) : null;
    // Cripple's fissure Paralysis (needsCurse false) needs no Curse; Grudge needs the Cursed dummy.
    const cursedOk = item.needsCurse === false || Boolean(state.cursed);
    const active = cursedOk && chancePercent > 0 && (!rateKnown || hitsPerSecond > 0);
    // Before the hit rate is measured (the planner's first pass) the source holds Paralysis, so state-gated lines read alike.
    // A certain Paralysis on each fissure hit is periodic: 4 s every 1 / rate s (full uptime once the fissure lands every ≤ 4 s).
    const schedule = !active ? null : rateKnown && item.fissure ? { kind: "periodic", durationSeconds: BUFF_VALUES.paralysisDurationSeconds, periodSeconds: 1 / hitsPerSecond, startSeconds: Number.isFinite(item.firstHitSeconds) ? item.firstHitSeconds : 0 } : rateKnown ? { kind: "chance", chancePercent, hitsPerSecond, durationSeconds: BUFF_VALUES.paralysisDurationSeconds, ...(Number.isFinite(item.firstHitSeconds) ? { firstHitSeconds: item.firstHitSeconds } : {}) } : { kind: "full" };
    const uptime = schedule ? sustainedLevel(schedule) : 0;
    const target = item.fissure ? "fissure hit on the dummy" : "hit on the Cursed dummy";
    const rateLabel = item.fissure ? "fissure hits/s (one per Demolisher Charge consumed; skill-hit model, provisional)" : "hits/s (skill-hit model)";
    const reason = !cursedOk ? "the dummy is not Cursed" : !(chancePercent > 0) ? "no Paralysis chance" : !active ? `${item.skill} deals no modeled ${item.fissure ? "fissure hits" : "hits"}` : rateKnown && item.fissure
      ? `Paralysis on every ${target} at ${round(hitsPerSecond)} ${rateLabel}: ${BUFF_VALUES.paralysisDurationSeconds} s every ${round(1 / hitsPerSecond)} s = ${round(uptime * 100)}% uptime, from the first fissure on the clean dummy (provisional)`
      : rateKnown ? `${chancePercent}% chance per ${target} at ${round(hitsPerSecond)} ${rateLabel}: 1 − (1 − ${round(chancePercent / 100)})^(${round(hitsPerSecond)} × ${BUFF_VALUES.paralysisDurationSeconds} s) = ${round(uptime * 100)}% uptime; the 5 s / 20 s windows build it from zero, hit by hit (provisional)`
      : "hit rate not measured yet (held for this pass)";
    return { ...item, chancePercent, hitsPerSecond, rateKnown, active, schedule, uptime: round(uptime), reason };
  });
  const chanceParalysisActive = chanceParalysisSources.filter((item) => item.active);
  for (const line of find(PATTERNS.paralysisEffect)) entry(line, debuffs.paralysis > 0 || chanceParalysisActive.length > 0, debuffs.paralysis || chanceParalysisActive.length ? "scales Paralysis (provisional: the effect scales its damage taken)" : "no Paralysis source", { provisional: true });
  if (debuffs.paralysis) derive(`+${round(BUFF_VALUES.paralysis * (1 + paralysisEffect / 100))}% damage taken`, "Paralysis (keyword 704)", "Paralysis on the dummy", true);
  const scriptedWeaken = [PATTERNS.witchAntelope, PATTERNS.holyMaiden, PATTERNS.channelWeaken, PATTERNS.paralysisDealDamage];
  for (const line of find(PATTERNS.weaken).filter((line) => !scriptedWeaken.some((pattern) => pattern.test(line.clean)))) entry(line, false, "Weaken lowers the enemy's damage (the dummy does not attack)", { status: "No DPS effect" });

  // ---- Frostbite and Freeze ----
  // Overwrite between units (patch notes 2026-10-15: "Priority is now determined first by maximum Frostbite Rating, then by
  // Frostbite effect"): it decides which unit's Frostbite stays when several units Frostbite one enemy. The dummy carries one
  // Frostbite here, the character's: every skill and item line of the character pools into one rating and one effect (a unit's
  // Frostbite, not a per-skill one), and Minions' Frostbite lines are not read (the maxFrostbite reader skips them). With a
  // single unit nothing is overwritten, so the rule changes no figure.
  const frostbiteEffect = sum(values(PATTERNS.frostbiteEffect));
  // Cold Damage taken = rating × (1 + Frostbite Effect) % (user-confirmed 2026-10-13; the creator's calc v0.3 multiplies the two instead).
  if (frostbitten) {
    const taken = round(debuffs.frostbiteRating * BUFF_VALUES.frostbiteTakenPerRating * (1 + frostbiteEffect / 100));
    derive(`+${taken}% additional Cold Damage taken`, "Frostbite (keyword 735: +1% additional Cold Damage taken per Frostbite Rating)", `Frostbite Rating ${debuffs.frostbiteRating} on the dummy${frostbiteEffect ? `, +${frostbiteEffect}% Frostbite Effect applied to it (user-confirmed 2026-10-13)` : ""}`, frostbiteEffect > 0);
  }
  for (const line of find(PATTERNS.maxFrostbite)) entry(line, frostbitten, frostbitten ? `Frostbite Rating ${debuffs.frostbiteRating} (10 base + Max Frostbite Rating, max 120; provisional reading of the inflicted amount)` : "the build inflicts no Frostbite", { provisional: true });
  for (const line of find(PATTERNS.frostbiteEffect)) entry(line, frostbitten, frostbitten ? "scales Frostbite's Cold Damage taken: rating × (1 + Frostbite Effect) (user-confirmed 2026-10-13)" : "the build inflicts no Frostbite");

  // ---- Timed pact-spirit and kismet effects (pact scripted-effects batch 2026-10-13; src/timed-effects.js) ----
  // Each effect derives its sustained lines (full stacks, or value × uptime for a cooldown effect) and reports parts whose
  // clock the 5 s / 20 s windows and the recount follow: a cooldown effect casts at t = 0 (best case, user 2026-10-13) and
  // its sustained figure uses the long-run uptime; debuffs build from zero on the clean dummy; own buffs start full when built
  // before engaging (prebuiltSelfBuffs). Each is a best-case assumption with a stable condition id (`toggle`), listed in the
  // recount assumptions and switched in the Config tab's "Best-case assumptions" list (src/planner.js bestCaseAssumptions).
  const prebuilt = state.prebuiltSelfBuffs !== false;
  const sameSource = (pattern, line) => lines.find((other) => other.source === line.source && pattern.test(other.clean)) || null;
  const cooldownOf = (line, fallback) => { const other = sameSource(PATTERNS.spiritCooldown, line); return other ? num(other.clean.match(PATTERNS.spiritCooldown)[1]) : fallback; };
  const cast = (duration, period) => ({ kind: "periodic", durationSeconds: duration, periodSeconds: period, startSeconds: 0 });
  const castText = (duration, period) => `cast on its ${period} s cooldown from t = 0 (best case), ${duration} s per cast: ${round(Math.min(1, duration / period) * 100)}% uptime in sustained figures; the 5 s / 20 s windows follow the casts (${duration >= period ? "held" : `on 0–${duration} s, ${period}–${round(period + duration)} s, …`})`;
  // `listed`: the recount lists the effect once, under its condition (src/planner.js), not per line; parameter lines (radius,
  // cooldown) share the effect's status and reason.
  const addTimed = (effect, line, paramLines = []) => {
    timedEffects.push({ toggle: true, provisional: true, ...effect, source: line.source, text: line.clean });
    entry(line, effect.active, effect.reason, { provisional: effect.provisional !== false, enemyDebuff: effect.target === "enemy", bodies: effect.bodies || [], ...(effect.status ? { status: effect.status } : {}) });
    entries[entries.length - 1].listedAs = `condition:${effect.id}`;
    for (const param of paramLines.filter(Boolean)) { entry(param, effect.active, `${effect.label}: ${effect.reason}`, { provisional: true, ...(effect.status ? { status: effect.status } : {}) }); entries[entries.length - 1].listedAs = `condition:${effect.id}`; }
    if (effect.active) for (const [text, conditionText] of effect.derived || []) derive(text, effect.derivedSource || (line.source === effect.label ? line.source : `${line.source}: ${effect.label}`), conditionText, true);
  };
  const offReason = (id) => `the ${id} condition is off: left out`;

  // Ice Puppet: Ice Cage (pact badge audit 2026-10-13). TLIDB / game text (affix 404859): "Focus energy to create an ice prison
  // Near yourself and the Pact Holder, which debuffs Frostbitten enemies inside every second and makes them take +X% additional
  // Cold Damage, up to 4 stacks, for 6s. Cooldown: 10s". Sourced: the value per stack (Lv1–5 10%, Lv6 13%), 4 stacks, 6 s per
  // debuff, the 10 s cooldown, Frostbitten enemies only; the in-game tooltip at Ice Puppet Lv2 (user, 2026-10-13) confirms them.
  // Not in the game data (no client-side effect rows): how long the prison stands, when the spirit casts it, and whether a new
  // stack refreshes the others. Best case (condition icePrison): cast next to the player, who stands close to the dummy; the
  // stacks add into one multiplier (4 × X% additional Cold Damage taken, as stacked buffs write p0 × stacks) and are held in
  // sustained figures; the windows and the recount build them at 1 stack per second from t = 0 (src/ice-cage-ramp.js).
  // `iceCage` keeps the per-prison summary the Ice Cage tests and the assumption text read.
  const iceCage = [];
  for (const line of find(PATTERNS.icePrison)) {
    const match = line.clean.match(PATTERNS.icePrison);
    const perStack = num(match[1]) * (line.multiplier ?? 1), stacks = num(match[2]);
    const value = round(perStack * stacks);
    const near = state.nearTarget !== false;
    const allowed = state.icePrison !== false && conditionOn("icePrison");
    const active = frostbitten && near && allowed;
    const reason = !frostbitten ? "the build inflicts no Frostbite (the prison debuffs Frostbitten enemies only)"
      : !allowed ? "the icePrison condition is off: the prison is left out"
      : !near ? `the Distant alternative stands ${DISTANT_STANDING_METERS} m away: the dummy is not inside the prison Near you`
      : `best case: cast on its 10 s cooldown next to you, the Frostbitten dummy inside; ${stacks} stacks of +${perStack}% held in sustained figures; the 5 s / 20 s windows build them at one stack per second on the clean dummy (${match[3]} s each; prison duration ≥ ${stacks} s assumed, not in the tooltip: provisional)`;
    iceCage.push({ source: line.source, perStackPercent: perStack, stacks, valuePercent: value, enabled: allowed, active, reason });
    addTimed({ id: "icePrison", label: "Ice Cage", target: "enemy", enabled: allowed, active, reason, summary: `${stacks} × +${perStack}% additional Cold Damage taken on a Frostbitten dummy, 1 stack per second from t = 0`,
      parts: active ? [{ type: "Cold", reach: "all", percent: perStack, schedule: { kind: "ramp", maxStacks: stacks, intervalSeconds: 1, startStacks: 1 } }] : [],
      bodies: [`+${value}% additional Cold Damage taken`], derived: [[`+${value}% additional Cold Damage taken`, `${stacks} prison stacks on the Frostbitten dummy (best case, provisional)`]],
      derivedSource: `${line.source}: Ice Cage (${stacks} × +${perStack}% additional Cold Damage taken)` }, line, [sameSource(PATTERNS.spiritCooldown, line)]);
  }

  // Melting Flames: Burning Heart (game affix 257943, no client-side effect rows): "Covers targets within a 5m radius with
  // flames and debuffs enemies within the area. Debuff: +26% (Lv6 35%) additional Fire Damage taken by the enemy for 3s.
  // Cooldown: 5 s." Best case (condition meltingFlames; user 2026-10-13): the flames are centred on the player and the dummy is
  // within 5 m (the Distant alternative, 6 m away, loses it); a cast at t = 0, every 5 s: 3 / 5 = 60% uptime.
  for (const line of find(PATTERNS.meltingFlamesDebuff)) {
    const match = line.clean.match(PATTERNS.meltingFlamesDebuff);
    const percent = num(match[1]) * (line.multiplier ?? 1), duration = num(match[2]);
    const area = sameSource(PATTERNS.meltingFlamesArea, line);
    const radius = area ? num(area.clean.match(PATTERNS.meltingFlamesArea)[1]) : 5;
    const cooldown = cooldownOf(line, 5), uptime = Math.min(1, duration / cooldown), sustained = round(percent * uptime);
    const allowed = conditionOn("meltingFlames"), inside = explicitRadiusHolds(radius, state.nearTarget);
    const active = allowed && inside;
    const reason = !allowed ? offReason("meltingFlames") : !inside ? `the Distant alternative stands ${DISTANT_STANDING_METERS} m away, outside the ${radius} m flames centred on you`
      : `best case: the flames are centred on you and the dummy is within ${radius} m; +${percent}% additional Fire Damage taken, ${castText(duration, cooldown)}: +${sustained}% (provisional: the affix has no client-side effect rows)`;
    addTimed({ id: "meltingFlames", label: "Melting Flames", target: "enemy", enabled: allowed, active, reason, summary: `+${percent}% additional Fire Damage taken for ${duration} s every ${cooldown} s (${round(uptime * 100)}% uptime), cast at t = 0`,
      parts: active ? [{ type: "Fire", reach: "all", percent, schedule: cast(duration, cooldown) }] : [],
      bodies: [`+${sustained}% additional Fire Damage taken`], derived: [[`+${sustained}% additional Fire Damage taken`, `Melting Flames at ${round(uptime * 100)}% uptime (best case, provisional)`]] }, line, [area, sameSource(PATTERNS.spiritCooldown, line)]);
  }

  // Bitter Thunder: Excruciating Thunder (game affix 20432, no client-side effect rows): "+14% (Lv6 19%) additional Lightning
  // Damage and +15% (Lv6 20%) additional Max Damage for 5s. Cooldown: 10s." An own buff cast at t = 0 (condition bitterThunder):
  // the 5 s window holds it throughout, the 20 s window half the time, sustained figures 50%. The sustained lines are the two
  // values × uptime (their cross term, uptime × (1 − uptime) × both, is left out: provisional). In the windows the Max Damage
  // part moves a hit's average roll by half its value (equal minimum and maximum rolls: provisional).
  for (const line of find(PATTERNS.bitterThunder)) {
    const match = line.clean.match(PATTERNS.bitterThunder);
    const lightning = num(match[1]) * (line.multiplier ?? 1), max = num(match[2]) * (line.multiplier ?? 1), duration = num(match[3]);
    const cooldown = cooldownOf(line, 10), uptime = Math.min(1, duration / cooldown);
    const allowed = conditionOn("bitterThunder"), active = allowed;
    const reason = !allowed ? offReason("bitterThunder") : `best case: +${lightning}% additional Lightning Damage and +${max}% additional Max Damage, ${castText(duration, cooldown)}: +${round(lightning * uptime)}% and +${round(max * uptime)}% (provisional: the affix has no client-side effect rows; the two values' cross term is left out)`;
    addTimed({ id: "bitterThunder", label: "Bitter Thunder", target: "self", enabled: allowed, active, reason, summary: `+${lightning}% additional Lightning Damage and +${max}% additional Max Damage for ${duration} s every ${cooldown} s (${round(uptime * 100)}% uptime), cast at t = 0`,
      parts: active ? [{ type: "Lightning", reach: "all", percent: lightning, schedule: cast(duration, cooldown) }, { type: null, reach: "hit", percent: max / 2, schedule: cast(duration, cooldown) }] : [],
      bodies: [`+${round(lightning * uptime)}% additional Lightning Damage`, `+${round(max * uptime)}% additional Max Damage`],
      derived: [[`+${round(lightning * uptime)}% additional Lightning Damage`, `Bitter Thunder at ${round(uptime * 100)}% uptime (best case, provisional)`], [`+${round(max * uptime)}% additional Max Damage`, `Bitter Thunder at ${round(uptime * 100)}% uptime (best case, provisional)`]] }, line, [sameSource(PATTERNS.spiritCooldown, line)]);
  }

  // Witch Antelope of Lust: Bewitched (game affix 608081): no cooldown at player start, then every P1 s it inflicts Paralysis
  // (buff 230) and Weaken (buff 270) in turn on enemies within 10 m. Paralysis: +15% damage taken, 1 stack, 4 s base duration
  // (manual rule 1002020420), scaled by Paralysis Effect. Weaken's duration is not sourced: best case equal to the cooldown
  // (user 2026-10-13; provisional). A cast at t = 0: Paralysis on [0, 4) s, Weaken on [cd, 2·cd), Paralysis again at 2·cd, …
  // (condition witchAntelope). Paralysis already held by an on-hit source (Red Umbrella, Bounded Holy Maiden) adds nothing (1 stack).
  const ccSchedules = new Map();
  let paralysisMergedInto = null;
  const holdCc = (type, schedule) => { const current = ccSchedules.get(type); if (!current || schedule.kind === "full") ccSchedules.set(type, schedule); };
  for (const line of find(PATTERNS.witchAntelope)) {
    const match = line.clean.match(PATTERNS.witchAntelope);
    const radius = num(match[1]), cooldown = num(match[2]);
    const paralysisValue = round(BUFF_VALUES.paralysis * (1 + paralysisEffect / 100));
    const ownParalysisSchedule = cast(Math.min(BUFF_VALUES.paralysisDurationSeconds, 2 * cooldown), 2 * cooldown);
    const allowed = conditionOn("witchAntelope"), inside = explicitRadiusHolds(radius, state.nearTarget);
    const active = allowed && inside, held = debuffs.paralysis > 0;
    // Grudge's chance Paralysis (above) is the same debuff (1 stack): one union schedule, 1 − Π(1 − level), carried here.
    const merged = active && !held && chanceParalysisActive.length > 0 && !paralysisMergedInto;
    const paralysisSchedule = merged ? { kind: "union", schedules: [ownParalysisSchedule, ...chanceParalysisActive.map((item) => item.schedule)] } : ownParalysisSchedule;
    if (merged) paralysisMergedInto = "witchAntelope";
    const uptime = sustainedLevel(paralysisSchedule), sustained = round(paralysisValue * uptime);
    if (active) { holdCc("Paralysis", held ? { kind: "full" } : paralysisSchedule); holdCc("Weaken", { kind: "periodic", durationSeconds: cooldown, periodSeconds: 2 * cooldown, startSeconds: cooldown }); }
    const ccLines = find(PATTERNS.ccTypeDamage).length > 0;
    const reason = !allowed ? offReason("witchAntelope") : !inside ? `outside ${radius} m` : held
      ? `Paralysis is already held by an on-hit source (1 stack), so the Paralysis turns add nothing; Weaken lowers only the enemy's damage${ccLines ? " and counts as a crowd control type (Weaken lasts its cooldown: best case, provisional)" : ""}`
      : `best case: Paralysis (+${paralysisValue}% damage taken, 4 s base duration: manual rule 1002020420) and Weaken in turn, a cast every ${cooldown} s from t = 0: Paralysis on 0–4 s of every ${2 * cooldown} s, ${round(sustainedLevel(ownParalysisSchedule) * 100)}% uptime${merged ? `, combined with ${chanceParalysisActive.map((item) => `${item.skill}'s ${item.support}`).join(", ")} (1 − Π(1 − uptime), 1 stack) to ${round(uptime * 100)}%` : ""} (+${sustained}% sustained); Weaken lasts its cooldown (not sourced: best case, provisional)`;
    addTimed({ id: "witchAntelope", label: "Witch Antelope (Paralysis / Weaken)", target: "enemy", enabled: allowed, active, reason, summary: `Paralysis +${paralysisValue}% damage taken for 4 s every ${2 * cooldown} s and Weaken in turn, cast at t = 0`,
      ...(active && held && !ccLines ? { status: "No DPS effect" } : {}),
      parts: active && !held ? [{ type: null, reach: "all", percent: paralysisValue, schedule: paralysisSchedule }] : [],
      bodies: held ? [] : [`+${sustained}% damage taken`], derived: active && !held ? [[`+${sustained}% damage taken`, `Witch Antelope's Paralysis at ${round(uptime * 100)}% uptime (best case, provisional)`]] : [] }, line);
  }

  // Kismet: Ice Soul (game affix 494613472: Frostbite on enemies within 6 m): src/enemy-ailments.js adds Frostbite to the dummy;
  // its Cold Damage taken is the Frostbite line above. Not a best-case assumption (it always holds within 6 m).
  for (const line of find(PATTERNS.iceSoul)) entry(line, frostbitten, frostbitten ? `the dummy is Frostbitten (Nearby enemies, within 6 m: game affix 494613472; holds close and at the Distant 6 m alternative): Frostbite Rating ${debuffs.frostbiteRating}, a crowd control type and an Ailment on the dummy` : "a build-wide Cannot inflict Frostbite line blocks it", { enemyDebuff: true, bodies: frostbitten ? [`+${round(debuffs.frostbiteRating * (1 + frostbiteEffect / 100))}% additional Cold Damage taken`] : [] });

  // Grudge's Paralysis on its own clock (not held by an on-hit source, not merged into Witch Antelope's part above).
  const chanceParalysis = { sources: chanceParalysisSources, value: round(BUFF_VALUES.paralysis * (1 + paralysisEffect / 100)), uptime: 0, factor: 1, held: debuffs.paralysis > 0, mergedInto: paralysisMergedInto };
  if (chanceParalysisActive.length) {
    const schedule = chanceParalysisActive.length === 1 ? chanceParalysisActive[0].schedule : { kind: "union", schedules: chanceParalysisActive.map((item) => item.schedule) };
    const uptime = sustainedLevel(schedule), sustained = round(chanceParalysis.value * uptime);
    Object.assign(chanceParalysis, { schedule, uptime: round(uptime), factor: round(1 + sustained / 100) });
    if (!chanceParalysis.held && !paralysisMergedInto) {
      holdCc("Paralysis", schedule);
      const label = chanceParalysisActive.map((item) => `${item.skill}: ${item.support}`).join(", ");
      timedEffects.push({ id: "chanceParalysis", label: "Paralysis (support chance)", source: label, text: chanceParalysisActive.map((item) => item.text).join(" · "), target: "enemy", toggle: false, provisional: true, enabled: true, active: true,
        reason: chanceParalysisActive.map((item) => item.reason).join("; "), summary: `Paralysis +${chanceParalysis.value}% damage taken at ${round(uptime * 100)}% uptime`,
        parts: [{ type: null, reach: "all", percent: chanceParalysis.value, schedule }], bodies: [`+${sustained}% damage taken`] });
      derive(`+${sustained}% damage taken`, `${label}: Paralysis (+${chanceParalysis.value}% damage taken × ${round(uptime * 100)}% uptime)`, `Paralysis from ${label} at ${round(uptime * 100)}% uptime (provisional)`, true);
    }
  }

  // Crowd control types on the dummy (game keyword 742: Frostbite, Freeze, Paralysis, Knockback, Weaken, Slow, Taunt and
  // Blinding; user-accepted 2026-10-13 that Frostbite and Freeze count). "For every type of crowd control effect the enemy has,
  // you and your Minions deal +X% additional damage to them" (game affix 75106: one multiplier, X × the count at hit time):
  // the count follows each type's clock (Witch Antelope's turns), so it is a timed sum. Knockback is instantaneous: not counted.
  if (frostbitten) holdCc("Frostbite", { kind: "full" });
  if (debuffs.frozen) holdCc("Freeze", { kind: "full" });
  if (debuffs.paralysis) holdCc("Paralysis", { kind: "full" });
  if (find(PATTERNS.holyMaiden).length && state.anyHit) for (const type of ["Weaken", "Slow", "Taunt", "Blinding"]) holdCc(type, { kind: "full" });
  if (find(PATTERNS.paralysisDealDamage).length && dealsDamage) holdCc("Weaken", { kind: "full" });
  for (const line of find(PATTERNS.channelWeaken)) {
    const radius = num(line.clean.match(PATTERNS.channelWeaken)[2]);
    const active = Boolean(state.channeledMain) && explicitRadiusHolds(radius, state.nearTarget);
    if (active) holdCc("Weaken", { kind: "full" });
    entry(line, active && find(PATTERNS.ccTypeDamage).length > 0, active ? "the channeled Main Skill keeps Weaken on the dummy: Weaken lowers only the enemy's damage and counts as a crowd control type" : "no channeled Main Skill", { status: active ? (find(PATTERNS.ccTypeDamage).length ? "In calc" : "No DPS effect") : "Inactive" });
  }
  for (const line of find(PATTERNS.attackProjectileBlind)) {
    const active = Boolean(state.activeTags?.has?.("Attack") && state.activeTags?.has?.("Projectile"));
    if (active) holdCc("Blinding", { kind: "full" });
    entry(line, active && find(PATTERNS.ccTypeDamage).length > 0, active ? "an active Attack Projectile Skill keeps the dummy Blinded: a crowd control type" : "no active Attack Projectile Skill", { status: active ? (find(PATTERNS.ccTypeDamage).length ? "In calc" : "No DPS effect") : "Inactive" });
  }
  const ccTypes = [...ccSchedules.keys()];
  const ccSum = { kind: "sum", schedules: [...ccSchedules.values()] };
  const ccCount = round(sustainedLevel(ccSum));
  for (const line of find(PATTERNS.ccTypeDamage)) {
    const percent = num(line.clean.match(PATTERNS.ccTypeDamage)[1]) * (line.multiplier ?? 1), value = round(percent * ccCount);
    const active = ccCount > 0;
    entry(line, active, active ? `${ccCount} crowd control type${ccCount === 1 ? "" : "s"} on the dummy on average (${ccTypes.join(", ")}; game keyword 742, Frostbite and Freeze included: user-accepted 2026-10-13)` : "no crowd control effect on the dummy", { bodies: [`+${value}% additional damage`, `+${value}% additional Minion Damage`] });
    if (active) {
      derive(`+${value}% additional damage`, line.source, `${ccCount} crowd control types on the dummy`, true);
      derive(`+${value}% additional Minion Damage`, line.source, `${ccCount} crowd control types on the dummy`, true);
      if (ccSum.schedules.some((schedule) => schedule.kind !== "full")) timedEffects.push({ id: `crowdControlTypes:${line.source}`, label: "Crowd control types on the dummy", source: line.source, target: "enemy", toggle: false, enabled: true, active: true, parts: [{ type: null, reach: "all", percent, schedule: ccSum }] });
    }
  }

  // Valkyrie's Night Patrol: Revelations of War. Valkyrie's Hymn (buff 11280; keyword 2000011 "X% additional Elemental Damage
  // to Attack Skills for each stack (multiplies)", the buff's affix 779656320 [4]) is gained per 2% Max Mana consumed; base max
  // 4 stacks (game affix 451704480: GetAttr 3442 + 4) plus "+N Max Valkyrie's Hymn Stacks"; "+X% Elemental Damage for every
  // stack" and "+10% Elemental Resistance Penetration at max stacks". Own buff: full stacks when pre-built (condition
  // valkyrieHymn); the Main Skill is assumed to consume Mana and the Hymn's duration is not in the saved data (provisional).
  for (const line of find(PATTERNS.valkyrieGain)) {
    const maxStacks = 4 + sum(values(PATTERNS.valkyrieMax));
    const perStack = sum(values(PATTERNS.valkyriePerStack)), pen = sum(values(PATTERNS.valkyrieAtMax));
    const hymn = round((1.04 ** maxStacks - 1) * 100);
    const allowed = conditionOn("valkyrieHymn"), active = allowed && Number(state.mainUsesPerSecond) > 0;
    const reason = !allowed ? offReason("valkyrieHymn") : !active ? "no Main Skill consumes Mana" : `best case: ${maxStacks} Hymn stacks held (own buff${prebuilt ? ", pre-built" : "; its build-up from Mana spent is not modeled, held from t = 0"}): +${hymn}% additional Elemental Damage for Attack Skills (4% per stack, multiplies), +${round(perStack * maxStacks)}% Elemental Damage${pen ? `, +${pen}% Elemental Resistance Penetration` : ""} (provisional: the Main Skill consumes Mana; the Hymn's duration is not in the saved data)`;
    const derivedLines = [[`+${hymn}% additional Elemental Damage for Attack Skills`, `${maxStacks} Valkyrie's Hymn stacks`], ...(perStack ? [[`+${round(perStack * maxStacks)}% Elemental Damage`, `${maxStacks} Valkyrie's Hymn stacks`]] : []), ...(pen ? [[`+${pen}% Elemental Resistance Penetration`, "Max Valkyrie's Hymn stacks"]] : [])];
    addTimed({ id: "valkyrieHymn", label: "Valkyrie's Hymn", target: "self", enabled: allowed, active, reason, summary: `${maxStacks} Hymn stacks held`, parts: [], bodies: derivedLines.map(([text]) => text), derived: derivedLines },
      line, [...find(PATTERNS.valkyrieMax), ...find(PATTERNS.valkyriePerStack), ...find(PATTERNS.valkyrieAtMax)]);
  }

  // Icemirror: Stage in the Mirror. Mirrored Shade (buff 11750) every 1 s while standing on a Terra Skill: "+X% additional Terra
  // Skill Damage while having Mirrored Shade" and "+1 Max Terra Charge Stacks when Mirrored Shade reaches max stacks" (the max
  // is not in the saved data). Best case (condition mirroredShade): the player stands on the Main Terra Skill; own buff, so the
  // stacks are full from t = 0 when pre-built; otherwise the damage starts after the first interval and the cap is assumed
  // reached (provisional). The Terra Charge line reaches src/selena-dance.js through src/planner.js (icemirrorTerraChargeLines).
  for (const line of find(PATTERNS.mirroredGain)) {
    const interval = num(line.clean.match(PATTERNS.mirroredGain)[1]);
    const damage = sum(values(PATTERNS.mirroredDamage)), charge = sum(values(PATTERNS.mirroredCharge));
    const allowed = conditionOn("mirroredShade"), active = allowed && Boolean(state.mainIsTerra);
    const reason = !allowed ? offReason("mirroredShade") : !state.mainIsTerra ? "no Main Terra Skill to stand on" : `best case: the player stands on the Main Terra Skill, Mirrored Shade every ${interval} s${prebuilt ? " (own buff, pre-built: full from t = 0)" : ` (from ${interval} s in the windows)`}${damage ? `: +${damage}% additional Terra Skill Damage` : ""}${charge ? `; max stacks reached: +${charge} Max Terra Charge Stacks` : ""} (provisional: the max stacks and duration are not in the saved data)`;
    addTimed({ id: "mirroredShade", label: "Mirrored Shade (Icemirror)", target: "self", enabled: allowed, active, reason, summary: `standing on the Main Terra Skill, Mirrored Shade held${damage ? `: +${damage}% additional Terra Skill Damage` : ""}`,
      parts: active && damage && !prebuilt ? [{ type: null, reach: "all", percent: damage, schedule: { kind: "ramp", maxStacks: 1, intervalSeconds: interval, startStacks: 0 } }] : [],
      bodies: damage ? [`+${damage}% additional Terra Skill Damage`] : [], derived: damage ? [[`+${damage}% additional Terra Skill Damage`, "Mirrored Shade held (best case)"]] : [] },
      line, [...find(PATTERNS.mirroredMax), ...find(PATTERNS.mirroredDamage), ...find(PATTERNS.mirroredCharge)]);
  }

  // Kitty Express: Assassin Cat Snack. Feline Stimulant (buff 11360; keyword 2000014 "X% additional Attack Damage for each stack
  // (multiplies)", the buff's affix 101010078 [5]) on each Main Skill use (game: triggering a Main Skill; read as using it,
  // provisional); base max 3 (game affix 86855680: GetAttr 3442 + 3) plus "+N to Max Feline Stimulant stacks"; "+X% additional
  // Attack Damage when having Feline Stimulant"; Attack Aggression at max (read above). Own buff, full when pre-built
  // (condition felineStimulant); its duration is not in the saved data (provisional).
  for (const line of find(PATTERNS.felineGain)) {
    const maxStacks = 3 + sum(values(PATTERNS.felineMax)), having = sum(values(PATTERNS.felineDamage));
    const buff = round((1.05 ** maxStacks - 1) * 100);
    const allowed = conditionOn("felineStimulant"), active = felineOn;
    const reason = !allowed ? offReason("felineStimulant") : !active ? "no Main Skill in use" : `best case: ${maxStacks} Feline Stimulant stacks held (own buff${prebuilt ? ", pre-built" : "; held from t = 0, its build-up is not modeled"}): +${buff}% additional Attack Damage (5% per stack, multiplies)${having ? `, +${having}% additional Attack Damage while having it` : ""}${find(PATTERNS.felineAggression).length ? ", Attack Aggression at max stacks" : ""} (provisional: the duration is not in the saved data)`;
    const derivedLines = [[`+${buff}% additional Attack Damage`, `${maxStacks} Feline Stimulant stacks`], ...(having ? [[`+${having}% additional Attack Damage`, "having Feline Stimulant"]] : [])];
    addTimed({ id: "felineStimulant", label: "Feline Stimulant (Kitty Express)", target: "self", enabled: allowed, active, reason, summary: `${maxStacks} Feline Stimulant stacks held`, parts: [], bodies: derivedLines.map(([text]) => text), derived: derivedLines },
      line, [...find(PATTERNS.felineMax), ...find(PATTERNS.felineDamage), ...find(PATTERNS.felineAggression)]);
  }

  // Squiddle: Squidnova (buff 11300: "+16% additional Hit Damage for skills cast by Spell Burst", scaled by Squidnova Effect)
  // when Spell Burst is consumed with at least 4 Max Spell Burst; "+X% additional Spell Damage" and "+1 Max Spell Burst" while
  // having it. Best case (condition squidnova): held while a Spell Main Skill Spell Bursts (its duration is not in the saved
  // data; provisional).
  const maxSpellBurst = sum(modifierTexts.map((line) => { const match = String(line.text ?? "").trim().match(/^\+(\d+) Max Spell Burst$/i); return match ? Number(match[1]) * (line.multiplier ?? 1) : 0; }));
  for (const line of find(PATTERNS.squidGain)) {
    const threshold = num(line.clean.match(PATTERNS.squidGain)[1]);
    const effect = sum(values(PATTERNS.squidEffect)), spell = sum(values(PATTERNS.squidDamage)), burst = sum(values(PATTERNS.squidBurst));
    const hit = round(16 * (1 + effect / 100));
    const allowed = conditionOn("squidnova"), active = allowed && Boolean(state.mainIsSpell) && maxSpellBurst >= threshold;
    const reason = !allowed ? offReason("squidnova") : !state.mainIsSpell ? "no Spell Main Skill" : maxSpellBurst < threshold ? `Max Spell Burst ${maxSpellBurst} < ${threshold}` : `best case: Squidnova held (Max Spell Burst ${maxSpellBurst} ≥ ${threshold}): +${hit}% additional Hit Damage for skills cast by Spell Burst${spell ? `, +${spell}% additional Spell Damage` : ""}${burst ? `, +${burst} Max Spell Burst` : ""} (provisional: the duration is not in the saved data)`;
    const derivedLines = [[`+${hit}% additional Hit Damage for skills cast by Spell Burst`, "Squidnova held"], ...(spell ? [[`+${spell}% additional Spell Damage`, "having Squidnova"]] : []), ...(burst ? [[`+${burst} Max Spell Burst`, "having Squidnova"]] : [])];
    addTimed({ id: "squidnova", label: "Squidnova (Squiddle)", target: "self", enabled: allowed, active, reason, summary: "Squidnova held", parts: [], bodies: derivedLines.map(([text]) => text), derived: derivedLines },
      line, [...find(PATTERNS.squidEffect), ...find(PATTERNS.squidDamage), ...find(PATTERNS.squidBurst)]);
  }

  // Kismet: Spider Fluid (game affix 635242752: an independent 4 s stack per Wilt stack inflicted, increased damage attr 57191)
  // and Kismet: Scorpion Stinger (game affix 260658592: an independent 4 s stack per Reap). Own buffs, at their cap when
  // pre-built (user 2026-10-13; conditions spiderFluid / scorpionStinger): the build's Wilt or Reap rate over 4 s is assumed to
  // reach the cap (provisional; the rates resolve after these lines).
  for (const line of find(PATTERNS.spiderFluid)) {
    const match = line.clean.match(PATTERNS.spiderFluid);
    const value = round(num(match[1]) * (line.multiplier ?? 1) * num(match[2]));
    const wilt = (state.enemyAilments || []).includes("Wilt");
    const allowed = conditionOn("spiderFluid"), active = allowed && wilt;
    addTimed({ id: "spiderFluid", label: "Spider Fluid (Wilt stacks)", target: "self", enabled: allowed, active, summary: `${match[2]} Wilt stacks inflicted recently held`,
      reason: !allowed ? offReason("spiderFluid") : !wilt ? "the build inflicts no Wilt" : `best case: ${match[2]} stacks held (own buff${prebuilt ? ", pre-built" : ", held from t = 0"}; the Wilt rate over 4 s is assumed to reach the cap: provisional)`,
      parts: [], bodies: [`+${value}% damage`], derived: [[`+${value}% damage`, `${match[2]} Wilt stacks inflicted recently`]] }, line);
  }
  for (const line of find(PATTERNS.scorpionStinger)) {
    const match = line.clean.match(PATTERNS.scorpionStinger);
    const cap = round(num(match[2]) * (line.multiplier ?? 1));
    const allowed = conditionOn("scorpionStinger"), active = allowed && Boolean(state.hasReaping);
    addTimed({ id: "scorpionStinger", label: "Scorpion Stinger (Reaps recently)", target: "self", enabled: allowed, active, summary: `+${cap}% Reaping Recovery Speed held`,
      reason: !allowed ? offReason("scorpionStinger") : !state.hasReaping ? "no Reaping source" : `best case: +${cap}% Reaping Recovery Speed held (own buff${prebuilt ? ", pre-built" : ", held from t = 0"}; at least ${round(cap / num(match[1]))} Reaps in 4 s assumed: provisional)`,
      parts: [], bodies: [`+${cap}% Reaping Recovery Speed`], derived: [[`+${cap}% Reaping Recovery Speed`, "Reaps dealt recently at the cap"]] }, line);
  }

  // Dual Kismet: Witch's Cauldron: "When at full Energy Shield, removes all Energy Shields, +20% additional Max Mana, and +10%
  // additional Spell Damage for 4s". Best-case uptime (user 2026-10-13; condition witchCauldron): held, the Energy Shield
  // recharge cadence is not modeled (provisional).
  for (const line of find(PATTERNS.witchCauldron)) {
    const match = line.clean.match(PATTERNS.witchCauldron);
    const spell = round(num(match[2]) * (line.multiplier ?? 1));
    const allowed = conditionOn("witchCauldron"), active = allowed && Boolean(state.dealsSpellDamage);
    addTimed({ id: "witchCauldron", label: "Witch's Cauldron", target: "self", enabled: allowed, active, summary: `+${spell}% additional Spell Damage held`,
      reason: !allowed ? offReason("witchCauldron") : !state.dealsSpellDamage ? "the build deals no Spell Damage" : `best case: +${spell}% additional Spell Damage held (re-triggered as soon as Energy Shield refills; the recharge cadence is not modeled: provisional)`,
      parts: [], bodies: [`+${spell}% additional Spell Damage`], derived: [[`+${spell}% additional Spell Damage`, `Witch's Cauldron held (best case, provisional)`]] }, line);
  }

  // Not modeled, with the reason (they read "No DPS effect" before): Sky Piercer needs a Mobility Skill cadence and an "Attack
  // Horizontal Projectile" damage scope; Flash Flood needs the Spell Burst count per 4 s and the halved Spell Burst limit.
  for (const line of find(PATTERNS.skyPiercer)) entry(line, false, state.activeTags?.has?.("Attack") && state.activeTags?.has?.("Projectile") ? "the Mobility Skill cadence and the Attack Horizontal Projectile scope are not modeled" : "no active Attack Projectile Skill", { status: state.activeTags?.has?.("Attack") && state.activeTags?.has?.("Projectile") ? "Not modeled" : "Inactive" });
  for (const line of find(PATTERNS.flashFlood)) entry(line, false, maxSpellBurst >= 1 && state.mainIsSpell ? "Spell Bursts per 4 s and the halved Spell Burst limit are not modeled" : "no Spell Burst", { status: maxSpellBurst >= 1 && state.mainIsSpell ? "Not modeled" : "Inactive" });

  // ---- Numbed ----
  const numbed = (state.enemyAilments || []).includes("Numbed");
  const numbedBase = find(PATTERNS.numbedBase).map((line) => num(line.clean.match(PATTERNS.numbedBase)[1]))[0] ?? BUFF_VALUES.numbedPerStack;
  // + a supported skill's time-averaged crit buff on the Numbed it inflicts (Thunder Spike: Tremble; src/crit-numbed-buff.js,
  // state.numbedEffectBuffs from src/planner.js; 2026-10-14, provisional): the dummy keeps the stronger Numbed.
  const numbedEffect = sum(values(PATTERNS.numbedEffect)) + (state.numbedEffectBuffs || []).reduce((total, buff) => total + (Number(buff.value) || 0), 0);
  debuffs.numbedStacks = numbed ? BUFF_VALUES.numbedMaxStacks : 0;
  // A changed base effect (Conductive: "+11% additional Lightning Damage taken") replaces the +5% per stack and stacks the same,
  // max 10 (user-confirmed 2026-10-12). It acts only on enemies the build Numbs, never on the player.
  const numbedChanged = find(PATTERNS.numbedBase).length > 0;
  // Audit of held debuffs (2026-10-13): the dummy starts clean, so the windows build Numbed at one stack per main-skill use (a
  // Numbing hit inflicts 1 stack; provisional: the "+N additional stacks" and the per-damage thresholds are not counted).
  if (numbed && Number(state.mainUsesPerSecond) > 0) timedEffects.push({ id: "numbed", label: "Numbed", source: "Numbed (keyword 762)", target: "enemy", toggle: false, enabled: true, active: true, parts: [{ type: "Lightning", reach: "all", percent: round(numbedBase * (1 + numbedEffect / 100)), schedule: { kind: "ramp", maxStacks: debuffs.numbedStacks, intervalSeconds: 1 / Number(state.mainUsesPerSecond), startStacks: 1 } }] });
  if (numbed) derive(`+${round(numbedBase * debuffs.numbedStacks * (1 + numbedEffect / 100))}% additional Lightning Damage taken`, `Numbed (keyword 762: +${numbedBase}% additional Lightning Damage taken per stack${numbedChanged ? ", changed base effect" : ""}, max 10)`, `${debuffs.numbedStacks} Numbed stacks on the dummy (best case, as the support resolver reads it: provisional)`, true);
  for (const line of find(PATTERNS.numbedEffect)) entry(line, numbed, numbed ? "scales Numbed's Lightning Damage taken" : "the build inflicts no Numbed");
  for (const line of find(PATTERNS.numbedBase)) entry(line, numbed, numbed ? "replaces Numbed's +5% per stack, max 10 stacks (user-confirmed 2026-10-12)" : "the build inflicts no Numbed");
  for (const line of [...find(PATTERNS.numbedExtra), ...find(PATTERNS.numbedThreshold)]) entry(line, false, numbed ? "Numbed is already at its 10-stack cap in the best-case reading (provisional)" : "the build inflicts no Numbed", { status: numbed ? "No DPS effect" : "Inactive", provisional: true });

  // ---- Lucky ----
  const luckyLines = find(PATTERNS.luckyDamage), veryLucky = find(PATTERNS.veryLuckyDamage), luckyCritLines = find(PATTERNS.luckyCrit), luckyNumbed = find(PATTERNS.luckyVsNumbed);
  const lucky = { damageRolls: veryLucky.length ? 3 : luckyLines.length || (luckyNumbed.length && numbed) ? 2 : 1, critRolls: luckyCritLines.length ? 2 : 1 };
  for (const line of [...luckyLines, ...veryLucky]) entry(line, true, "damage rolls: the best of " + lucky.damageRolls + " rolls (manual \"Lucky & Unlucky\")");
  for (const line of luckyNumbed) entry(line, numbed, numbed ? "the dummy is Numbed" : "the build inflicts no Numbed");
  for (const line of luckyCritLines) entry(line, true, "Critical Strike checks: the better of 2 rolls (manual \"Lucky & Unlucky\")");

  // Buff / debuff source entries without a body of their own carry the derived lines of their state, so their badge
  // reads In calc only where an engine reads those lines (src/line-coverage.js).
  const effectsOf = (entryItem) => {
    const text = entryItem.text;
    const pick = (re) => derived.filter((line) => re.test(line.source)).map((line) => line.text);
    if (PATTERNS.hasFervor.test(text) || PATTERNS.fervorEffect.test(text)) return pick(/^Fervor/);
    if (PATTERNS.attackAggressionGain.test(text) || /Attack Aggression Effect/i.test(text)) return pick(/^Attack Aggression/);
    if (PATTERNS.spellAggressionGain.test(text) || PATTERNS.spellAggressionPerCast.test(text) || /Spell Aggression Effect/i.test(text)) return pick(/^Spell Aggression/);
    if ([PATTERNS.hastenAlways, PATTERNS.hastenAgility, PATTERNS.hastenTrauma, PATTERNS.hastenMinionCrit, PATTERNS.hastenEffect].some((re) => re.test(text))) return pick(/^Hasten/);
    if (PATTERNS.frail.test(text)) return pick(/^Frail/);
    if (PATTERNS.lightningInfiltrationCrit.test(text) || PATTERNS.coldInfiltrationFrozen.test(text) || PATTERNS.coldInfiltrationFrostbitten.test(text) || PATTERNS.penetrating.test(text)) return pick(/Infiltration/);
    if ([PATTERNS.paralysisAttacks, PATTERNS.paralysisCursed, PATTERNS.paralysisEffect].some((re) => re.test(text))) return pick(/^Paralysis/);
    if (PATTERNS.maxFrostbite.test(text) || PATTERNS.frostbiteEffect.test(text)) return pick(/^Frostbite/);
    if (PATTERNS.numbedEffect.test(text) || PATTERNS.numbedBase.test(text)) return pick(/^Numbed/);
    return [];
  };
  for (const item of entries) if (!item.bodies.length && item.active) { const effects = effectsOf(item); if (effects.length) item.bodies = effects.map((text) => ({ body: text, derivedText: text, readers: ["state"] })); }
  return { centralize, regain, entries, derived, buffs: { fervorRating, fervorAttackAilment, hasAttackAggression, hasSpellAggression, hasHasten, fortitudeStacks }, debuffs: { ...debuffs, infiltration: [...debuffs.infiltration] }, lucky, iceCage, timedEffects, chanceParalysis };
}

/** Expected value of the best of `rolls` uniform rolls on [min, max]: min + (max − min) × rolls / (rolls + 1). */
export function luckyRollAverage(min, max, rolls = 1) {
  return min + (max - min) * rolls / (rolls + 1);
}

/** Crit chance with Lucky Critical Strike: 1 − (1 − p)^rolls. */
export function luckyCritChance(percent, rolls = 1) {
  const p = Math.max(0, Math.min(1, percent / 100));
  return (1 - (1 - p) ** rolls) * 100;
}

// Deterioration (manual rule 1002030520 and TLIDB keyword 764): "a debuff that can only be inflicted through Hit Erosion
// Damage … lasts for 1s. When the duration ends, it deals True Damage equal to 60% of the Hit Erosion Damage dealt. Stacks
// up to 99 times. Each stack is calculated independently." Two game buff variants (char_buff 180_4 / 180_6) instead say
// "for every 0.3 [s] it lasts"; the manual and keyword wording is used (open question Q8). Applied by the hit engine
// (src/skill-hit-model.js) to each Erosion hit: chance (capped at 100%) × (1 + expected extra stacks) × 60% of the
// Erosion damage dealt × (1 + increased) × Π(1 + additional). True Damage: no further resistance. The 1 s delay is not
// in the windows (provisional). Duration lines only move the delay: No DPS effect.
export const DETERIORATION_SHARE = 0.6;
export function deteriorationFrom(modifierTexts = [], state = {}, entries = []) {
  const lines = modifierTexts.filter((line) => line.origin !== "derived" && !line.lineEffect).map((line) => ({ ...line, clean: normalizePercentageText(String(line.text ?? "")).replace(/\s+/g, " ").trim() }));
  const pick = (pattern) => lines.filter((line) => pattern.test(line.clean)).map((line) => ({ line, match: line.clean.match(pattern), scale: line.multiplier ?? 1 }));
  const chance = pick(PATTERNS.deteriorationChance), extra = pick(PATTERNS.deteriorationExtra), increased = pick(PATTERNS.deteriorationIncreased), additional = pick(PATTERNS.deteriorationAdditional), duration = pick(PATTERNS.deteriorationDuration);
  const chancePercent = sum(chance.map(({ match, scale }) => num(match[1]) * scale));
  const extraStacks = sum(extra.map(({ match, scale }) => num(match[1]) * scale / 100 * num(match[2])));
  const increasedPercent = sum(increased.map(({ match, scale }) => num(match[1]) * scale));
  const additionalPercents = additional.map(({ match, scale }) => num(match[1]) * scale);
  const active = chancePercent > 0 && Boolean(state.hitErosion);
  const reason = !state.hitErosion ? "no modeled hit deals Erosion Damage (Deterioration needs Hit Erosion Damage)" : chancePercent > 0 ? `${Math.min(100, chancePercent)}% chance per Erosion hit, 60% of the Erosion damage dealt as True Damage when each 1 s stack ends (manual; the delay is not in the windows: provisional)` : "no Deterioration chance";
  const add = (items, status) => { for (const { line } of items) entries.push({ source: line.source, origin: line.origin, text: line.clean, active: status === "In calc", conditionText: reason, status, provisional: true, bodies: [], condition: "combatState", group: null }); };
  add(chance, active ? "In calc" : "Inactive");
  add([...extra, ...increased, ...additional], active ? "In calc" : "Inactive");
  for (const { line } of duration) entries.push({ source: line.source, origin: line.origin, text: line.clean, active: false, conditionText: "duration only delays the damage (dealt when each stack ends)", status: "No DPS effect", provisional: true, bodies: [], condition: "combatState", group: null });
  return active ? { chancePercent: Math.min(100, chancePercent), extraStacks, increasedPercent, additionalPercents, share: DETERIORATION_SHARE, source: "Deterioration (manual rule 1002030520)" } : null;
}

/**
 * Icemirror's "+N to Max Terra Charge Stacks when Mirrored Shade reaches max stacks" as a Terra Charge line for
 * src/selena-dance.js (the Terra Charge model resolves before the line effects): with the Mirrored Shade gain line, a Main
 * Terra Skill to stand on and the mirroredShade condition on (best case: the stacks reach their cap; provisional).
 */
export function mirroredShadeTerraChargeLines(modifierTexts = [], { mainIsTerra = false, requestedConditions = {} } = {}) {
  if (!mainIsTerra || requestedConditions.mirroredShade === false) return [];
  const clean = (line) => normalizePercentageText(String(line.text ?? "")).replace(/\s+/g, " ").trim();
  const gain = modifierTexts.filter((line) => line.origin !== "derived" && PATTERNS.mirroredGain.test(clean(line)));
  return gain.flatMap((line) => modifierTexts.filter((other) => other.source === line.source && PATTERNS.mirroredCharge.test(clean(other)))
    .map((other) => ({ source: `${other.source}: Mirrored Shade at max stacks`, text: `Max Terra Charge Stacks +${Number(clean(other).match(PATTERNS.mirroredCharge)[1]) * (other.multiplier ?? 1)}` })));
}
