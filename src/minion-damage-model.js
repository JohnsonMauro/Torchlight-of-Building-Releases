import { skillLevelDamageMultiplier } from "./engine.js";
import { minionBaseDamage, MINION_BASE_DAMAGE_FROZEN_LEVEL } from "./minion-base-damage.js";
import { level85DummyDefenses, armourMitigationPercent } from "./target-hit-mitigation.js";
import { MINION_PROFILES } from "./minion-profiles.js";
import { supportEffectsFor } from "./support-effects.js";
import { classifyHitLine, scopeApplies } from "./skill-hit-lines.js";

// Minion damage path (2026-10-11; research/base-damage-skills-2026-10-11.md). Minions are independent of the player:
// "Only effects that explicitly increase Minion stats will be applied to Minions" (manual rule 1001011821), so this
// engine reads Minion-named lines only and never the player's Spell / Fire / Area / main-stat layers.
//
// Per hit of a Minion skill at summon-skill level L:
//   hit = (Base Damage(L) × percent(L) + added flat to Minions × effectiveness) × (1 + Σ Minion increased)
//         × Π(1 + Minion additional) × level bonus past Lv.20 (rule 1001000822) × special-skill self buff (while up)
//         × crit factor (rating 500 → 5%, damage 150%: Minion Base Stats on the summon tooltip, user-confirmed 2026-10-11)
//         × dummy armour (50% Physical / 30% other hits) × (1 − (resistance − Minion penetration))
// Base Damage(L) is the shared Minion table (10 at Lv.1 … 300 at Lv.20, frozen; src/minion-base-damage.js), confirmed in
// game for Goblin Priest Lv.1 (10) and God of Swords / Huge Ember Automaton Lv.20 (300).
//
// Use pattern: a deterministic cycle. From the summon cast on, the Minion uses a special skill whenever its cooldown is
// ready and its basic skill otherwise; each use takes its game use time (attack-speed skills ÷ the Minion's attack speed,
// cast-speed skills ÷ its cast speed; the player's speed never applies) and its hit lands at the end of the use. Special
// self buffs run from the use's start. Persistent rows tick once per second for their assumed duration. Every Minion of
// the summon acts identically and simultaneously (one Minion for modules: count unpublished). The town panel reads 0 for
// summon skills (user, 2026-10-11), so no town figure is produced.
//
// Spirit Magi (2026-10-12; manual rules 1001012022–34): the "basic slot" of the cycle is the Base Skill, replaced by the
// Enhanced Skill with the Enhanced-skill chance (Stage 2: +30%; "+X% chance for Spirit Magi to use an Enhanced Skill"
// lines; an expected-value blend of the two casts). The Empower Skill is the cooldown-bound special: it grants the Magus a
// buff (Euphoria) for its duration and, for Blazing Spin / Frost Release, deals its own row. Stage = ⌊Growth ÷ 100⌋ from
// 100 Growth plus "+N initial Growth for Spirit Magi" lines (Stage 1 … 5); Stage 3 enhances the Enhanced Skill (its own
// "When at Stage 3 or higher" lines), Stage 4 adds the Empower Skill's new effect. The Ultimate needs Full Bloom (only The
// Forsaken Iris – Growing Breeze, rule 1001012027) and is not in the cycle.

const number = (value) => Number(String(value).replace("−", "-"));
const NUM = "([+-]?\\d+(?:\\.\\d+)?)";
const TYPE = "(Physical|Fire|Cold|Lightning|Erosion|Elemental)";
const ELEMENTAL = ["Fire", "Cold", "Lightning"];
const round = (value) => Math.round(value * 10000) / 10000;
const sum = (lines) => lines.reduce((total, line) => total + line.value, 0);
const product = (lines) => lines.reduce((factor, line) => factor * (1 + line.value / 100), 1);
const clean = (text) => String(text || "").replace(/\s*%/g, "%").replace(/\+\s+/g, "+").replace(/\s+/g, " ").trim();

const PATTERNS = [
  [new RegExp(`^${NUM}% Minion Damage$`, "i"), (m) => ({ kind: "increased", value: number(m[1]) })],
  [new RegExp(`^${NUM}% (?:damage and|Damage and) Minion Damage$`, "i"), (m) => ({ kind: "increased", value: number(m[1]) })],
  [new RegExp(`^${NUM}% additional Minion Damage$`, "i"), (m) => ({ kind: "additional", value: number(m[1]) })],
  [new RegExp(`^${NUM}% additional damage(?: and ${NUM}% additional Minion Damage)$`, "i"), (m) => ({ kind: "additional", value: number(m[2]) })],
  [new RegExp(`^${NUM}% additional damage; ${NUM}% additional Minion Damage$`, "i"), (m) => ({ kind: "additional", value: number(m[2]) })],
  [new RegExp(`^${NUM}% ${TYPE} Damage for (?:you and your )?Minions$`, "i"), (m) => ({ kind: "increased", value: number(m[1]), type: m[2] })],
  [new RegExp(`^${NUM}% additional ${TYPE} Damage for (?:you and your )?Minions$`, "i"), (m) => ({ kind: "additional", value: number(m[1]), type: m[2] })],
  [new RegExp(`^${NUM}% additional damage for (?:you and your )?Minions$`, "i"), (m) => ({ kind: "additional", value: number(m[1]) })],
  [new RegExp(`^${NUM}% additional (?:Hit )?Damage for Minions$`, "i"), (m) => ({ kind: "additional", value: number(m[1]) })],
  // Support lines on the summon setup (Servant Damage, a summon Magnificent / Noble star or roll, Activation Medium: Minion).
  [new RegExp(`^${NUM}% additional damage for Minions summoned by the supported skill$`, "i"), (m) => ({ kind: "additional", value: number(m[1]) })],
  // Spirit Magus skill lines (minion family "spirit-magus" only; the engine drops them for other Minions).
  [new RegExp(`^${NUM}% additional Spirit Magus Skill Damage$`, "i"), (m) => ({ kind: "additional", value: number(m[1]), spiritMagus: true })],
  [new RegExp(`^${NUM}% Spirit Magus Skill Damage$`, "i"), (m) => ({ kind: "increased", value: number(m[1]), spiritMagus: true })],
  // Gear-pact batch chunk 4: "Spirit Magi" wordings of the same Minion stats (Spirit Magus family only).
  [new RegExp(`^${NUM}% additional Spirit Magi Damage$`, "i"), (m) => ({ kind: "additional", value: number(m[1]), spiritMagus: true })],
  [new RegExp(`^${NUM} Spirit Magi Critical Strike Rating$`, "i"), (m) => ({ kind: "critRating", value: number(m[1]), flat: true, spiritMagus: true })],
  [new RegExp(`^${NUM}% additional Attack and Cast Speed for Minions(?: summoned by the supported skill)?$`, "i"), (m) => ({ kind: "speed", value: number(m[1]), additional: true, attack: true, cast: true })],
  [new RegExp(`^${NUM}% Attack and Cast Speed for Minions(?: summoned by the supported skill)?$`, "i"), (m) => ({ kind: "speed", value: number(m[1]), additional: false, attack: true, cast: true })],
  [new RegExp(`^${NUM}% (?:additional )?Minion Attack Speed$`, "i"), (m, text) => ({ kind: "speed", value: number(m[1]), additional: /additional/i.test(text), attack: true, cast: false })],
  [new RegExp(`^${NUM}% (?:additional )?Minion Cast Speed$`, "i"), (m, text) => ({ kind: "speed", value: number(m[1]), additional: /additional/i.test(text), attack: false, cast: true })],
  [new RegExp(`^${NUM}% Attack Speed for Minions(?: summoned by the supported skill)?$`, "i"), (m) => ({ kind: "speed", value: number(m[1]), additional: false, attack: true, cast: false })],
  [new RegExp(`^${NUM} Critical Strike Rating for Minions$`, "i"), (m) => ({ kind: "critRating", value: number(m[1]), flat: true })],
  [new RegExp(`^${NUM}% (additional )?Critical Strike Rating for Minions$`, "i"), (m) => ({ kind: "critRating", value: number(m[1]), additional: Boolean(m[2]) })],
  [new RegExp(`^${NUM}% (additional )?Critical Strike Damage for Minions$`, "i"), (m) => ({ kind: "critDamage", value: number(m[1]), additional: Boolean(m[2]) })],
  // "+X% additional Max / Min Damage for Minions" (2026-10-14): the Minion hit's upper / lower roll (Minion-named lines only,
  // rule 1001011821; a plain "additional Max Damage" line stays the player's).
  [new RegExp(`^${NUM}% additional (?:${TYPE} )?(Max|Min) (?:${TYPE} )?Damage for (?:you and your )?Minions$`, "i"), (m) => ({ kind: /^max$/i.test(m[3]) ? "maxDamage" : "minDamage", value: number(m[1]), type: (m[2] || m[4]) ? (m[2] || m[4])[0].toUpperCase() + (m[2] || m[4]).slice(1).toLowerCase() : undefined })],
  // "+X% Armor DMG Mitigation Penetration for Minions" (game affix 467574 → char field 2006247 on the Minions): points off the
  // dummy's armour mitigation of Minion hits (src/target-hit-mitigation.js armourMitigationPercent).
  [new RegExp(`^${NUM}% Armor DMG Mitigation Penetration for Minions$`, "i"), (m) => ({ kind: "armourPenetration", value: number(m[1]) })],
  [new RegExp(`^${NUM}% ${TYPE} Penetration for Minions$`, "i"), (m) => ({ kind: "penetration", value: number(m[1]), types: m[2] === "Elemental" ? ELEMENTAL : [m[2]] })],
  [new RegExp(`^Minion Damage penetrates ${NUM}% Elemental Resistance$`, "i"), (m) => ({ kind: "penetration", value: number(m[1]), types: ELEMENTAL })],
  [new RegExp(`^Adds ${NUM}\\s*[–-]\\s*${NUM} (Physical|Fire|Cold|Lightning|Erosion) Damage to (?:your and your Minions['’] Attacks and Spells|Minions)$`, "i"), (m) => ({ kind: "added", min: number(m[1]), max: number(m[2]), type: m[3] })]
];

/** Minion-named modifier line → { kind, ... } or null (anything else, including conditional Minion lines). */
export function classifyMinionLine(text) {
  const line = clean(text);
  for (const [pattern, build] of PATTERNS) {
    const match = line.match(pattern);
    if (match) return build(match, line);
  }
  return null;
}

// Spirit Magus Growth / Enhanced-chance lines (catalog wordings; a trait or kismet text may hold several lines).
const GROWTH_INITIAL = /^\+?(\d+(?:\.\d+)?) initial Growth for Spirit Magi$/i;
const GROWTH_PER = /^For every (\d+) Growth a Spirit Magus has, it deals \+(\d+(?:\.\d+)?)% additional damage(?:, up to \+(\d+(?:\.\d+)?)% additional damage)?$/i;
const GROWTH_PER_100 = /^For every 100 Growth a Spirit Magus has, it deals \+(\d+(?:\.\d+)?)% additional damage and ([+-]?\d+(?:\.\d+)?)% additional Attack and Cast Speed$/i;
const ENHANCED_CHANCE = /^\+?(\d+(?:\.\d+)?)% chance for Spirit Magi to use an Enhanced Skill$/i;
const ENHANCED_FIXED = /chance for Spirit Magi to use an Enhanced Skill is fixed at (\d+(?:\.\d+)?)%/i;
const GROWTH_MENTION = /\bGrowth\b|Spirit Mag(?:us|i)|Enhanced Skill|Nourishment|Full Bloom/i;

/** Spirit Magus Growth, Stage and Enhanced-skill chance from the build's lines (manual rules 1001012024, 1001012029, 1001012031). */
export function spiritMagusState(lines = []) {
  const initial = [], perGrowth = [], per100 = [], chance = [], unread = [];
  let fixedChance = null;
  for (const line of lines) {
    const multiplier = line.multiplier ?? 1;
    for (const raw of String(line.text || "").split(/\r?\n/)) {
      const text = clean(raw);
      if (!text) continue;
      const entry = { source: line.source, text, origin: line.origin || "gear" };
      let match;
      if ((match = text.match(GROWTH_INITIAL))) initial.push({ ...entry, value: number(match[1]) * multiplier });
      else if ((match = text.match(GROWTH_PER))) perGrowth.push({ ...entry, per: number(match[1]), percent: number(match[2]) * multiplier, cap: match[3] != null ? number(match[3]) * multiplier : null });
      else if ((match = text.match(GROWTH_PER_100))) per100.push({ ...entry, percent: number(match[1]) * multiplier, speedPercent: number(match[2]) * multiplier });
      else if ((match = text.match(ENHANCED_CHANCE))) chance.push({ ...entry, value: number(match[1]) * multiplier });
      else if ((match = text.match(ENHANCED_FIXED))) { fixedChance = number(match[1]); unread.push({ ...entry, read: true }); }
      else if (GROWTH_MENTION.test(text) && !/^\+?\d+(?:\.\d+)?% additional (?:Spirit Magus Skill|Minion) Damage$/i.test(text)) unread.push(entry);
    }
  }
  const growth = 100 + sum(initial);
  const stage = Math.max(1, Math.min(5, Math.floor(growth / 100)));
  const stageChance = stage >= 2 ? 30 : 0;
  const enhancedChancePercent = fixedChance != null ? fixedChance : Math.max(0, Math.min(100, stageChance + sum(chance)));
  const additional = [
    ...perGrowth.map((line) => ({ source: line.source, text: `${line.text} (${growth} Growth)`, origin: line.origin, value: Math.min(line.cap ?? Infinity, line.percent * Math.floor(growth / line.per)) })),
    ...per100.map((line) => ({ source: line.source, text: `${line.text} (${growth} Growth)`, origin: line.origin, value: line.percent * Math.floor(growth / 100) }))
  ].filter((line) => line.value !== 0);
  const speed = per100.map((line) => ({ source: line.source, text: `${line.text} (${growth} Growth)`, origin: line.origin, value: line.speedPercent * Math.floor(growth / 100), additional: true, attack: true, cast: true })).filter((line) => line.value !== 0);
  return {
    growth, stage, enhancedChancePercent, fixedChance, stageChancePercent: stageChance,
    sources: { initial, chance, perGrowth, per100 }, additional, speed, unread: unread.filter((line) => !line.read),
    growthRule: "Spirit Magi start at Stage 1 (100 Growth) and gain a Stage per 100 Growth up to Stage 5 (manual rule 1001012029); the build's \"+N initial Growth for Spirit Magi\" lines add to the 100",
    chanceRule: fixedChance != null ? `the Enhanced-skill chance is fixed at ${fixedChance}% (hero trait text)` : `Stage ${stage}: ${stageChance}% base Enhanced-skill chance (manual rule 1001012031: +30% at Stage 2; the Stage 1 base is not published and is read as 0%) + ${sum(chance)}% from lines`
  };
}

// Iris – Growing Breeze Nourishment (2026-10-12; hero trait text, src/data/heroes/base-hero-trait-levels-ss13.generated.js and
// all-hero-traits-ss13.generated.js). The base trait at every level carries: "When a Spirit Magus Skill is set as an Active
// Skill, casting the Active Skill is considered as casting the Trait Skill as well"; "Grants 4 stack(s) of Nourishment to all
// Spirit Magi when using Trait Skills. Cooldown: 5 s"; "When a Spirit Magus casts a skill, +30% chance for it to lose 1 stack
// of Nourishment"; "For every stack of Nourishment a Spirit Magus has, when it uses a skill, +8% chance for it to lose a stack
// of Nourishment"; "Nourishment: When using a skill, +30% additional damage dealt by this skill. Lasts 15 s and stacks up to
// 10 time(s)."; "100% of your Empower Skill Effect bonus is also applied to Spirit Magi's Nourishment"; a movement line. Its
// "+1 additional stack" is an Artificial Moon line (level 5 only; heroTraitStatLines stops at "Artificial Moon:"). Full Bloom
// and "do not lose / do not gain bonuses" are the Lv.60 trait Gentle Zephyr; auto-triggering the Trait Skill is the Lv.75
// trait Grow With Them; Socialite (Lv.45) adds to the per-cast loss chance.
const NOURISH = {
  activeAsTrait: /^When a Spirit Magus Skill is set as an Active Skill, casting the Active Skill is considered as casting the Trait Skill as well$/i,
  grant: /^Grants (\d+(?:\.\d+)?) stack\(s\) of Nourishment to all Spirit Magi when using Trait Skills\. Cooldown: (\d+(?:\.\d+)?) s$/i,
  extraGrant: /^Grant (\d+(?:\.\d+)?) additional stacks? of Nourishment to all Spirit Magi when casting a Trait Skill$/i,
  lose: /^When a Spirit Magus casts a skill, \+?(\d+(?:\.\d+)?)% chance for it to lose 1 stack of Nourishment$/i,
  losePerStack: /^For every stack of Nourishment a Spirit Magus has, when it uses a skill, \+?(\d+(?:\.\d+)?)% chance for it to lose a stack of Nourishment$/i,
  effect: /^Nourishment ?: When using a skill, \+(\d+(?:\.\d+)?)% additional damage dealt by this skill\. Lasts (\d+(?:\.\d+)?) s and stacks up to (\d+) time\(s\)\.?$/i,
  empowerShare: /^(\d+(?:\.\d+)?)% of your Empower Skill Effect bonus is also applied to Spirit Magi's Nourishment$/i,
  autoTrait: /^Always attempts to auto-trigger the Trait Skill, Growing Breeze$/i,
  noLossNoBonus: /^Spirit Magi do not lose Nourishment when casting non-Ultimates but do not gain Nourishment bonuses$/i,
  fullBloom: /^After gaining a total of (\d+) stacks of Nourishment ?, Spirit Magi enter Full Bloom for (\d+(?:\.\d+)?) s$/i,
  movement: /^Within \d+(?:\.\d+)? s of Spirit Magi gaining Nourishment ?, if there are no enemies within \d+ m, \+\d+(?:\.\d+)?% Movement Speed$/i
};

/** Which Nourishment line a text is (a NOURISH key), or null. */
export function nourishmentLineKind(text) {
  const line = clean(text);
  return Object.keys(NOURISH).find((key) => NOURISH[key].test(line)) || null;
}

/** Nourishment mechanics from the build's lines (Iris – Growing Breeze), or null when the build grants none. */
export function nourishmentState(lines = []) {
  const state = { stacksPerTraitCast: 0, extraStacksPerTraitCast: 0, traitCooldownSeconds: null, effectPercent: 0, durationSeconds: null, maxStacks: null, loseChancePercent: 0, losePerStackPercent: 0,
    empowerSharePercent: 0, activeAsTrait: false, autoTrait: false, noLossNoBonus: false, fullBloom: null, sources: [], readTexts: new Set() };
  for (const line of lines) {
    for (const raw of String(line.text || "").split(/\r?\n/)) {
      const text = clean(raw);
      if (!text) continue;
      const read = (key, extra = {}) => { state.sources.push({ source: line.source, text, origin: line.origin || "gear", key, ...extra }); state.readTexts.add(text); };
      let match;
      if (NOURISH.activeAsTrait.test(text)) { state.activeAsTrait = true; read("activeAsTrait"); }
      else if ((match = text.match(NOURISH.grant))) { state.stacksPerTraitCast += number(match[1]); state.traitCooldownSeconds = Math.max(state.traitCooldownSeconds ?? 0, number(match[2])); read("grant"); }
      else if ((match = text.match(NOURISH.extraGrant))) { state.extraStacksPerTraitCast += number(match[1]); read("extraGrant"); }
      else if ((match = text.match(NOURISH.lose))) { state.loseChancePercent += number(match[1]); read("lose"); }
      else if ((match = text.match(NOURISH.losePerStack))) { state.losePerStackPercent += number(match[1]); read("losePerStack"); }
      else if ((match = text.match(NOURISH.effect))) { state.effectPercent = Math.max(state.effectPercent, number(match[1])); state.durationSeconds = number(match[2]); state.maxStacks = Math.max(state.maxStacks ?? 0, number(match[3])); read("effect"); }
      else if ((match = text.match(NOURISH.empowerShare))) { state.empowerSharePercent += number(match[1]); read("empowerShare"); }
      else if (NOURISH.autoTrait.test(text)) { state.autoTrait = true; read("autoTrait"); }
      else if (NOURISH.noLossNoBonus.test(text)) { state.noLossNoBonus = true; read("noLossNoBonus"); }
      else if ((match = text.match(NOURISH.fullBloom))) { state.fullBloom = { totalStacks: number(match[1]), durationSeconds: number(match[2]), source: line.source }; read("fullBloom"); }
      else if (NOURISH.movement.test(text)) read("movement", { noDpsEffect: true });
    }
  }
  if (!(state.stacksPerTraitCast > 0) || !(state.effectPercent > 0)) return null;
  return state;
}

const typeApplies = (lineType, componentTypes) => !lineType || (lineType === "Elemental" ? componentTypes.some((type) => ELEMENTAL.includes(type)) : componentTypes.includes(lineType));

// Combine the self buffs active at a moment for one skill: additional factors multiply (typed buffs only for their types),
// crit rating / crit rating % / crit damage add, attack-speed additional multiplies.
function combineBuffs(active, skillType) {
  const combined = { additionalFactor: 1, critRating: 0, critRatingPercent: 0, critDamagePercent: 0, attackSpeedAdditionalFactor: 1, labels: [] };
  for (const buff of active) {
    if (buff.additionalPercent && (!buff.types || buff.types.includes(skillType))) combined.additionalFactor *= 1 + buff.additionalPercent / 100;
    combined.critRating += buff.critRating || 0;
    combined.critRatingPercent += buff.critRatingPercent || 0;
    combined.critDamagePercent += buff.critDamagePercent || 0;
    if (buff.attackSpeedAdditionalPercent) combined.attackSpeedAdditionalFactor *= 1 + buff.attackSpeedAdditionalPercent / 100;
    combined.labels.push(buff.skill || buff.source || "buff");
  }
  return combined;
}

/**
 * Model one Minion source against the dummy.
 * @param {object} p
 * @param {object} p.profile MINION_PROFILES entry
 * @param {number} p.level summon-skill level (effective)
 * @param {object[]} p.modifierTexts flattened build lines (planner.modifierTexts)
 * @param {object[]} p.traitLines hero trait lines (src/character-stats.js heroTraitStatLines)
 * @param {object} p.target { resistancePercent: { Fire, Cold, Lightning, Erosion }, armourPercent, nonPhysicalArmourPercent }
 * @param {number} p.timelineSeconds how far the hit schedule is generated (dummy recount timeline)
 * @param {{ setupKey, name }[]} p.setups the catalog setups that activate this Minion
 * @param {"cooldown"|"summon"|"none"} p.traitSkill Trait Skill casts for Nourishment (Iris – Growing Breeze): "cooldown" =
 *   pressed whenever off cooldown from the summon cast on (best case; also forced by an auto-trigger trait), "summon" = only
 *   the summon cast counts (the trait's "casting the Active Skill is considered as casting the Trait Skill"; open whether the
 *   Magus it creates receives the stacks), "none" = never.
 */
export function calculateMinion({ profile, level = 20, modifierTexts = [], traitLines = [], target = {}, timelineSeconds = 60, setups = [], windows = [5, 20], extraTaken = [], traitSkill = "cooldown", extraCritOnly = [] } = {}) {
  const resolved = typeof profile === "string" ? MINION_PROFILES[profile] : profile;
  if (!resolved) return null;
  const capped = Math.max(1, Math.min(MINION_BASE_DAMAGE_FROZEN_LEVEL, Math.floor(level || 20)));
  const effectiveLevel = Math.max(1, Math.floor(level || 20));
  const baseDamage = minionBaseDamage(effectiveLevel);
  const levelFactor = skillLevelDamageMultiplier(effectiveLevel);
  const notes = [...(resolved.notes || [])];
  const warnings = [];
  const assumptions = [];
  const isSpiritMagus = resolved.family === "spirit-magus";

  // Minion lines from the build and the hero's traits; other Minion-mentioning lines are listed as not read.
  const lines = { increased: [], additional: [], speed: [], critRating: [], critDamage: [], penetration: [], armourPenetration: [], added: [], unread: [], support: [], maxDamage: [], minDamage: [] };
  for (const line of [...modifierTexts, ...traitLines]) {
    const parsed = classifyMinionLine(line.text);
    const entry = { source: line.source, text: clean(line.text), origin: line.origin || "gear" };
    const multiplier = line.multiplier ?? 1;
    if (!parsed) { if (/\bMinions?\b/i.test(line.text) && !/Minion Max Life|Minion Movement|Minion Life|Minion Energy Shield|Minion Armou?r|Minion Evasion|Skill Area for Minions|Duration for Minions|avoid damage|Aggressiveness|Max Minion|Minion Quantity|Summonable/i.test(line.text)) lines.unread.push(entry); continue; }
    if (parsed.spiritMagus && !isSpiritMagus) continue;
    if (parsed.kind === "added") lines.added.push({ ...entry, type: parsed.type, min: parsed.min * multiplier, max: parsed.max * multiplier });
    else if (parsed.kind === "penetration") lines.penetration.push({ ...entry, value: parsed.value * multiplier, types: parsed.types });
    else lines[parsed.kind].push({ ...entry, ...parsed, value: parsed.value * multiplier });
  }
  // Supports on the setups that summon this Minion (manual rule 1001011821: Minions take only lines that name Minions). Each
  // line is its own multiplier; when several setups of the same Minion carry the same support, it counts once (its
  // highest value; provisional: which setup summoned the Minion is not tracked).
  const supportLines = new Map();
  for (const setup of setups) {
    for (const clause of supportEffectsFor(setup, { engine: "minion" }).clauses.filter((item) => item.family === "minion")) {
      const parsed = classifyMinionLine(clause.text);
      if (!parsed || parsed.kind === "added" || parsed.kind === "penetration" || (parsed.spiritMagus && !isSpiritMagus)) { if (!parsed) lines.unread.push({ source: clause.source, text: clean(clause.text), origin: "support" }); continue; }
      if (!parsed.value) continue;
      const key = `${clause.support}|${clause.origin}|${parsed.kind}|${clause.baseText}`;
      const entry = { source: clause.source, text: `${clean(clause.text)}${clause.origin === "star" ? ` (${clause.stars ?? "?"}★ star bonus)` : clause.origin === "leveled" ? ` (Lv.${clause.level})` : clause.origin === "roll" ? ` (T${clause.tier ?? "?"} roll)` : ""}`, origin: "support", ...parsed, value: parsed.value };
      if (!supportLines.has(key) || supportLines.get(key).value < entry.value) supportLines.set(key, entry);
    }
  }
  for (const entry of supportLines.values()) lines[entry.kind].push(entry);
  lines.support = [...supportLines.values()];
  for (const line of lines.unread) warnings.push(`${line.source}: "${line.text}" names Minions but is not read by the Minion damage model (conditional or unmodeled).`);

  // Spirit Magus Growth / Stage / Enhanced chance; Growth-based additional and speed lines join the Minion layers.
  const magus = isSpiritMagus ? spiritMagusState([...modifierTexts, ...traitLines]) : null;
  // Nourishment (Iris – Growing Breeze): Spirit Magi only. "Nourishment can be applied to Synthetic Troop Minions" (the Memory
  // Revival affix Nourishing Spring Rain) is not modeled: its Troop loss chance is not published.
  const nourish = isSpiritMagus ? nourishmentState([...modifierTexts, ...traitLines]) : null;
  if (magus) {
    lines.additional.push(...magus.additional.map((line) => ({ ...line, kind: "additional" })));
    lines.speed.push(...magus.speed.map((line) => ({ ...line, kind: "speed" })));
    for (const line of magus.unread.filter((item) => !nourish?.readTexts.has(item.text))) warnings.push(`${line.source}: "${line.text}" is a Spirit Magus line the Minion model does not read (Nourishment, Full Bloom, conditional Growth).`);
    assumptions.push({ id: `magusStage:${resolved.key}`, value: magus.stage, text: `${resolved.minion} Stage ${magus.stage} (${magus.growth} Growth: ${magus.growthRule}).` });
    assumptions.push({ id: `magusEnhancedChance:${resolved.key}`, value: magus.enhancedChancePercent, text: `${resolved.minion} Enhanced-skill chance ${round(magus.enhancedChancePercent)}% (${magus.chanceRule}).` });
    if (magus.stage >= 5) notes.push(`${resolved.summon}: Stage 5 grants an additional-damage bonus whose value is a placeholder in the game text (manual rule 1001012034); it is not applied.`);
  }
  const stage = magus?.stage ?? 1;

  const count = resolved.count?.at(effectiveLevel) ?? 1;
  if (resolved.count?.assumed) assumptions.push({ id: `minionCount:${resolved.key}`, value: count, text: `${resolved.summon}: ${resolved.count.source}.` });
  const perMinionAdditional = resolved.perMinionAdditionalPercent ? [{ source: `${resolved.summon}: per Minion summoned`, text: `+${resolved.perMinionAdditionalPercent}% additional damage for every ${resolved.minion} summoned (${count} summoned)`, value: resolved.perMinionAdditionalPercent * count, origin: "skill" }] : [];
  const levelLine = effectiveLevel > 20 ? [{ source: `${resolved.summon} level ${effectiveLevel}`, text: `+${round((levelFactor - 1) * 100)}% additional damage (TLIDB Skill Level: +10%/level 21–30, +8%/level 31+; applies to the skill and its Minions, rule 1001000822)`, value: (levelFactor - 1) * 100, origin: "skill" }] : [];

  // Speeds: the Minion's own attack / cast speed (base 1; player speed never applies).
  const speedFactor = (which) => { const relevant = lines.speed.filter((line) => line[which]); return Math.max(0.0001, 1 + sum(relevant.filter((line) => !line.additional)) / 100) * product(relevant.filter((line) => line.additional)); };
  const attackSpeedFactor = speedFactor("attack"), castSpeedFactor = speedFactor("cast");

  // Crit: Minion Base Stats (rating 500, damage 150) plus Minion crit lines; a special's self buff adds while it runs
  // (flat rating, "+X% Critical Strike Rating" of the Magus's rating, crit damage).
  const baseCritRating = 500, baseCritDamage = 150;
  const critRating = (buff) => (baseCritRating + sum(lines.critRating.filter((line) => line.flat)) + (buff?.critRating || 0)) * Math.max(0, 1 + (sum(lines.critRating.filter((line) => !line.flat && !line.additional)) + (buff?.critRatingPercent || 0)) / 100) * product(lines.critRating.filter((line) => !line.flat && line.additional));
  const critChance = (buff) => Math.min(100, Math.max(0, critRating(buff)) / 100) / 100;
  const critDamage = (buff) => Math.max(100, (baseCritDamage + sum(lines.critDamage.filter((line) => !line.additional)) + (buff?.critDamagePercent || 0)) * product(lines.critDamage.filter((line) => line.additional))) / 100;
  // Enemy crit-taken debuffs on the crit share (the Marked dummy, src/mark-effect.js; 2026-10-14): Minion hits take them too.
  const critOnlyFactor = product(extraCritOnly);
  const critFactor = (buff) => 1 - critChance(buff) + critChance(buff) * critDamage(buff) * critOnlyFactor;

  // Target (src/target-hit-mitigation.js, user-confirmed Lv.85 dummy): 50% armour vs Physical hits, 30% vs other hits,
  // 30% resistances. Minion hits are assumed to take the same mitigation as the player's hits (not sourced for Minions).
  const armourPercent = target.armourPercent ?? level85DummyDefenses.armourPercent;
  const nonPhysicalArmourPercent = target.nonPhysicalArmourPercent ?? level85DummyDefenses.nonPhysicalArmourPercent;
  const resistanceOf = (type) => type === "Physical" ? 0 : (target.resistancePercent?.[type] ?? level85DummyDefenses[`${type.toLowerCase()}ResistancePercent`] ?? 30);

  // Enemy damage taken (residual batch follow-up): a debuff on the dummy (curses, Frail, Infiltrations, Numbed, Paralysis,
  // "taken by Nearby enemies") raises every hit it takes, Minion hits included; the manual's Minion rule (1001011821) limits
  // the Minion's own damage lines, not the target's. Read like src/skill-hit-model.js: the planner's derived lines and typed
  // positive lines, plus the planner's resolved curse lines (Scorch). Tag-scoped lines ("Spell Damage taken") need the hit's
  // skill tags, which a Minion skill does not carry here: not applied (provisional).
  const takenLines = [];
  for (const line of modifierTexts) {
    const parsed = classifyHitLine(line.text);
    if (parsed?.kind !== "taken" || !(line.origin === "derived" || (parsed.value > 0 && parsed.scope.damageTypes))) continue;
    if (parsed.scope.skillTags) continue;
    takenLines.push({ source: line.source, text: clean(line.text), value: parsed.value * (line.multiplier ?? 1), layer: parsed.layer, scope: parsed.scope });
  }
  for (const line of extraTaken) takenLines.push({ source: line.source, text: line.text, value: line.value, layer: line.layer || "additional", scope: { damageTypes: line.types ? new Set(line.types) : null, skillTags: null } });
  const takenFactorFor = (types) => {
    const own = takenLines.filter((line) => scopeApplies(line.scope, { damageTypes: types }));
    return { lines: own, factor: Math.max(0, 1 + sum(own.filter((line) => line.layer === "increased")) / 100) * product(own.filter((line) => line.layer !== "increased")) };
  };

  const skills = resolved.skills.map((raw) => {
    // A buff-only skill (an Empower Skill without a damage row) takes the Minion's dealt type for its layers.
    const entry = raw.type ? raw : { ...raw, type: resolved.skills.find((item) => item.type)?.type || "Physical" };
    const percent = entry.percentByLevel?.[capped - 1] ?? 0;
    const addedEffectiveness = entry.kind === "hit" ? (entry.addedEffectivenessByLevel?.[capped - 1] ?? percent) : 0;
    const types = entry.conversion ? [entry.baseType, entry.type] : [entry.type];
    const added = lines.added.filter((line) => line.type === entry.baseType || line.type === entry.type).map((line) => ({ ...line, effectiveness: addedEffectiveness, value: (line.min + line.max) / 2 * addedEffectiveness / 100 }));
    const addedAverage = sum(added);
    const increased = lines.increased.filter((line) => typeApplies(line.type, types));
    // Stage-dependent bonuses of a Spirit Magus skill (its own "When at Stage N or higher" lines).
    const stageBonus = entry.stageBonus ? entry.stageBonus(stage) : null;
    const stageAdditional = stageBonus?.additionalPercent ? [{ source: `${entry.name}: Stage ${stage}`, text: stageBonus.text, value: stageBonus.additionalPercent, origin: "skill" }] : [];
    const additional = [...lines.additional.filter((line) => typeApplies(line.type, types)), ...levelLine, ...perMinionAdditional, ...(entry.extraAdditional || []).map((line) => ({ ...line, origin: "skill" })), ...stageAdditional];
    const penetration = lines.penetration.filter((line) => line.types.includes(entry.type));
    const increasedFactor = Math.max(0, 1 + sum(increased) / 100);
    const additionalFactor = product(additional);
    const resistancePercent = resistanceOf(entry.type);
    const penetrationPercent = sum(penetration);
    const resistanceFactor = Math.max(0, 1 - (resistancePercent - penetrationPercent) / 100);
    const armourPenetration = lines.armourPenetration;
    const armour = armourMitigationPercent({ physical: entry.type === "Physical", armourPercent, nonPhysicalArmourPercent, penetrationPercent: sum(armourPenetration) });
    const armourFactor = armour.factor;
    const taken = takenFactorFor(types);
    const base = baseDamage * percent / 100;
    const selfBuff = typeof entry.selfBuff === "function" ? entry.selfBuff(stage) : entry.selfBuff || null;
    // `buff` is a combined active-buff object (combineBuffs) or null; `extraAdditionalPercent` a next-use bonus (Frost Release).
    // "+X% additional Max / Min Damage for Minions" (2026-10-14): the roll's upper / lower end (base + added flat) before it is
    // averaged; the Minion base is one value, so both ends start from it. A negative Min total floors at 0.
    const maxOnly = lines.maxDamage.filter((line) => typeApplies(line.type, types));
    const minOnly = lines.minDamage.filter((line) => typeApplies(line.type, types));
    const maxFactor = product(maxOnly), minFactor = Math.max(0, product(minOnly));
    const addedMin = added.reduce((total, line) => total + line.min * line.effectiveness / 100, 0), addedMax = added.reduce((total, line) => total + line.max * line.effectiveness / 100, 0);
    const rollAverage = maxOnly.length || minOnly.length ? ((base + addedMin) * minFactor + (base + addedMax) * maxFactor) / 2 : base + addedAverage;
    const beforeTargetNoCrit = (buff, extraAdditionalPercent = 0) => rollAverage * increasedFactor * additionalFactor * (buff?.additionalFactor ?? 1) * (1 + extraAdditionalPercent / 100);
    const perHit = (buff, extraAdditionalPercent = 0) => beforeTargetNoCrit(buff, extraAdditionalPercent) * critFactor(buff) * taken.factor * armourFactor * resistanceFactor;
    const timing = entry.timing;
    const speed = timing?.speedType === "attack-speed" ? attackSpeedFactor : timing?.speedType === "cast-speed" ? castSpeedFactor : 1;
    const useTime = timing ? timing.useTime / speed : null;
    if (!timing) warnings.push(`${resolved.minion}: ${entry.name} has no use time (no Split file linked and no TLIDB fallback), so it is left out of the cycle.`);
    if (entry.basis === "provisional") assumptions.push({ id: `minionSkill:${entry.name}`, value: "best case", text: `${entry.name}: ${entry.note}.` });
    if (stageBonus?.note) notes.push(`${entry.name}: ${stageBonus.note}`);
    const ownBuff = selfBuff ? combineBuffs([{ ...selfBuff, skill: entry.name }], entry.type) : null;
    return {
      name: entry.name, role: entry.role, kind: entry.kind, groupId: entry.groupId, type: entry.type, baseType: entry.baseType, converted: Boolean(entry.conversion), conversion: entry.conversion,
      buffOnly: Boolean(entry.buffOnly), percent, addedEffectiveness, base, added, addedAverage, maxOnly, minOnly, maxFactor, minFactor, rollAverage, increased, additional, penetration, armourPenetration, armourPercent: armour.before, armourPenetrationPercent: armour.penetrationPercent, increasedFactor, additionalFactor, taken: taken.lines, takenFactor: taken.factor, armourFactor, resistancePercent, penetrationPercent, resistanceFactor,
      hitsPerUse: stageBonus?.hitsPerUse ?? entry.hitsPerUse ?? 1, hitsBasis: entry.basis, hitsNote: entry.note, persistentSeconds: entry.persistentSeconds || null,
      selfBuff, timing, useTimeSeconds: timing?.useTime ?? null, effectiveUseTimeSeconds: useTime, cooldownSeconds: timing?.cooldown || 0, speedFactor: speed,
      perHitNoBuff: perHit(null), perHitBuffed: ownBuff ? perHit(ownBuff) : null, perHitBeforeTargetNoCrit: beforeTargetNoCrit(null),
      critChancePercent: critChance(null) * 100, critDamagePercent: critDamage(null) * 100, critFactor: critFactor(null),
      perHit, usesInCycle: 0, hitsInCycle: 0, damageInCycle: 0
    };
  });

  // Cycle simulation: special skills when ready (longest cooldown first), the basic slot otherwise (Base Skill, replaced by
  // the Enhanced Skill at the Enhanced-skill chance as an expected-value blend); hits at the end of each use. Ultimates
  // (Full Bloom) stay out of the cycle.
  const summonCast = resolved.summonCastSeconds ?? 1;
  const horizon = Math.max(timelineSeconds, 80);
  const specials = skills.filter((item) => item.role === "special" && item.effectiveUseTimeSeconds != null).sort((a, b) => b.cooldownSeconds - a.cooldownSeconds);
  const basic = skills.find((item) => item.role === "basic" && item.effectiveUseTimeSeconds != null) || null;
  const enhanced = skills.find((item) => item.role === "enhanced" && item.effectiveUseTimeSeconds != null) || null;
  const enhancedShare = enhanced && basic ? Math.max(0, Math.min(1, (magus?.enhancedChancePercent ?? 0) / 100)) : 0;
  const ready = new Map(specials.map((item) => [item.name, 0]));
  const buffs = [];
  const events = [];
  const persistentCoveredUntil = new Map();
  let nextUses = null; // { values: [...], until } from an Empower "next N uses" buff (Frost Release)
  let time = summonCast;
  let guard = 0;
  const activeAt = (at) => buffs.filter((buff) => buff.from <= at + 1e-9 && at < buff.until - 1e-9);
  const useTimeOf = (skill, at) => {
    const speedBuff = combineBuffs(activeAt(at), skill.type).attackSpeedAdditionalFactor;
    return skill.timing?.speedType === "attack-speed" ? skill.effectiveUseTimeSeconds / speedBuff : skill.effectiveUseTimeSeconds;
  };
  // Nourishment on the Magus (src: the trait text above nourishmentState). Exact expected value over the stack count: a
  // probability vector over 0 … max stacks. Trait Skill casts grant their stacks (capped) when the Magus is out; every Magus
  // skill use deals ×(1 + effect × (1 + Empower share) × stacks) with the stacks it holds at the use (stacks add: the text
  // gives no "multiply" rule, provisional) and then loses one stack with chance min(1, Σ lose + Σ per-stack × stacks)
  // (one summed chance, provisional). All stacks end 15 s after the last gain (one shared duration refreshed on gain,
  // provisional). Full Bloom (Gentle Zephyr) is entered once the total gained reaches its threshold.
  const traitMode = nourish?.autoTrait ? "cooldown" : traitSkill;
  const nourishCap = nourish ? Math.max(1, Math.round(nourish.maxStacks || 10)) : 0;
  const nourishGain = nourish ? nourish.stacksPerTraitCast + nourish.extraStacksPerTraitCast : 0;
  // "100% of your Empower Skill Effect bonus is also applied to Spirit Magi's Nourishment": the player's Empower Skill Effect
  // lines in the catalog are conditional ("When casting a Defensive Skill …") and are not read, so the bonus is 0 here.
  const empowerEffectPercent = 0;
  const nourishEffect = nourish && !nourish.noLossNoBonus ? nourish.effectPercent * (1 + nourish.empowerSharePercent / 100 * empowerEffectPercent / 100) : 0;
  const traitCooldown = nourish?.traitCooldownSeconds || 5;
  const traitCasts = !nourish || traitMode === "none" ? [] : traitMode === "summon" ? [0] : Array.from({ length: Math.ceil(horizon / traitCooldown) }, (_, index) => index * traitCooldown);
  let nourishDist = nourish ? Object.assign(new Array(nourishCap + 1).fill(0), { 0: 1 }) : null;
  let nourishNext = 0, nourishLastGain = -Infinity, nourishGained = 0;
  const fullBloomEntries = [];
  const nourishExpire = (at) => { if (nourishDist && at - nourishLastGain >= (nourish.durationSeconds ?? 15) - 1e-9 && nourishDist[0] < 1) nourishDist = Object.assign(new Array(nourishCap + 1).fill(0), { 0: 1 }); };
  const nourishUse = (at) => {
    if (!nourishDist) return { factor: 1, stacks: 0 };
    // Grants land when the Magus is out (a Trait cast during the summon reaches it at its first use).
    while (nourishNext < traitCasts.length && traitCasts[nourishNext] <= at + 1e-9) {
      const castAt = Math.max(traitCasts[nourishNext++], summonCast);
      nourishExpire(castAt);
      const next = new Array(nourishCap + 1).fill(0);
      nourishDist.forEach((p, n) => { next[Math.min(nourishCap, n + nourishGain)] += p; });
      nourishDist = next; nourishLastGain = castAt; nourishGained += nourishGain;
      if (nourish.fullBloom && nourishGained >= nourish.fullBloom.totalStacks && !fullBloomEntries.length) fullBloomEntries.push({ at: castAt, until: castAt + nourish.fullBloom.durationSeconds });
    }
    nourishExpire(at);
    const stacks = nourishDist.reduce((total, p, n) => total + p * n, 0);
    if (!nourish.noLossNoBonus) {
      const next = new Array(nourishCap + 1).fill(0);
      nourishDist.forEach((p, n) => { const lose = n > 0 ? Math.min(1, (nourish.loseChancePercent + nourish.losePerStackPercent * n) / 100) : 0; next[n] += p * (1 - lose); if (n > 0) next[n - 1] += p * lose; });
      nourishDist = next;
    }
    return { factor: 1 + nourishEffect / 100 * stacks, stacks };
  };
  const land = (skill, at, weight, extraAdditionalPercent = 0, nourishment = { factor: 1, stacks: 0 }) => {
    if (skill.buffOnly || !(skill.percent > 0)) return;
    const landAt = at + useTimeOf(skill, at);
    const nourishTag = nourishDist ? { nourishmentStacks: nourishment.stacks, nourishmentFactor: nourishment.factor } : {};
    if (skill.kind === "persistent") {
      // One ground effect at a time (a recast refreshes it): ticks once per second over the assumed duration, only for
      // seconds not already covered by the previous cast. Nourishment ("damage dealt by this skill") lifts every tick.
      const ticks = Math.max(1, Math.round(skill.persistentSeconds || 1));
      const covered = persistentCoveredUntil.get(skill.name) ?? -Infinity;
      for (let tick = 0; tick < ticks; tick++) { const atTick = landAt + tick; if (atTick < horizon && atTick >= covered - 1e-9) events.push({ time: atTick, skill: skill.name, damage: skill.perHit(null) * count * weight * nourishment.factor, weight, buffed: false, ...nourishTag }); }
      persistentCoveredUntil.set(skill.name, landAt + ticks);
      return;
    }
    const active = activeAt(landAt).filter((buff) => buff.skill !== skill.name || buff.selfApplies !== false);
    const combined = active.length ? combineBuffs(active, skill.type) : null;
    const buffed = Boolean(combined && (combined.additionalFactor !== 1 || combined.critRating || combined.critRatingPercent || combined.critDamagePercent)) || extraAdditionalPercent > 0;
    events.push({ time: landAt, skill: skill.name, damage: skill.perHit(combined, extraAdditionalPercent) * skill.hitsPerUse * count * weight * nourishment.factor, weight, buffed, buff: buffed ? combined?.labels.join(" + ") || "next-use bonus" : null, ...nourishTag });
  };
  while (time < horizon && guard++ < 100000) {
    const special = specials.find((item) => ready.get(item.name) <= time + 1e-9);
    if (special) {
      ready.set(special.name, time + special.cooldownSeconds);
      if (special.selfBuff) {
        // A recast refreshes the skill's own buff (the Empower cooldown is shorter than its 6 s duration); it does not stack.
        for (const buff of buffs) if (buff.skill === special.name && buff.until > time) buff.until = time;
        buffs.push({ ...special.selfBuff, from: time, until: time + special.selfBuff.durationSeconds, skill: special.name });
        if (special.selfBuff.nextUses) nextUses = { values: [...special.selfBuff.nextUses], until: time + special.selfBuff.durationSeconds, skill: special.name };
      }
      land(special, time, 1, 0, nourishUse(time));
      special.usesInCycle += 1;
      time += useTimeOf(special, time);
      continue;
    }
    if (!basic) {
      // Every skill is on cooldown and there is no filler: idle until the next one is ready.
      const next = Math.min(...specials.map((item) => ready.get(item.name)));
      if (!Number.isFinite(next) || next <= time) break;
      time = next;
      continue;
    }
    // Basic slot: the Base Skill, or the Enhanced Skill with the Enhanced-skill chance (expected-value blend of both casts).
    const bonus = nextUses && time < nextUses.until - 1e-9 && nextUses.values.length ? nextUses.values.shift() : 0;
    const baseWeight = 1 - enhancedShare;
    const slotNourishment = nourishUse(time); // one cast, one loss roll, whichever of the two skills it is
    if (baseWeight > 0) { land(basic, time, baseWeight, bonus, slotNourishment); basic.usesInCycle += baseWeight; }
    if (enhancedShare > 0) { land(enhanced, time, enhancedShare, bonus, slotNourishment); enhanced.usesInCycle += enhancedShare; }
    time += baseWeight * useTimeOf(basic, time) + (enhancedShare > 0 ? enhancedShare * useTimeOf(enhanced, time) : 0);
  }
  events.sort((a, b) => a.time - b.time);
  const windowAverage = (seconds) => events.filter((event) => event.time < seconds).reduce((total, event) => total + event.damage, 0) / seconds;
  const steadyFrom = 20, steadyTo = horizon;
  const steadyDps = events.filter((event) => event.time >= steadyFrom && event.time < steadyTo).reduce((total, event) => total + event.damage, 0) / (steadyTo - steadyFrom);
  const perSkill = skills.map((item) => {
    const own = events.filter((event) => event.skill === item.name && event.time >= steadyFrom && event.time < steadyTo);
    const dps = own.reduce((total, event) => total + event.damage, 0) / (steadyTo - steadyFrom);
    const uses = own.reduce((total, event) => total + (event.weight ?? 1), 0);
    return { ...item, perHit: undefined, steadyDps: dps, steadyUsesPerSecond: (item.kind === "persistent" ? own.length : uses) / (steadyTo - steadyFrom), buffedShare: uses ? own.filter((event) => event.buffed).reduce((total, event) => total + (event.weight ?? 1), 0) / uses : 0, inCycle: item.role === "basic" || item.role === "special" || (item.role === "enhanced" && enhancedShare > 0) };
  });
  const slotLabel = basic ? (enhanced && enhancedShare > 0 ? `${basic.name} (${round((1 - enhancedShare) * 100)}%) or ${enhanced.name} (${round(enhancedShare * 100)}%, ${round(enhanced.effectiveUseTimeSeconds)} s use) every ${round(basic.effectiveUseTimeSeconds)} s` : `${basic.name} every ${round(basic.effectiveUseTimeSeconds)} s`) : "no basic skill";
  const cycle = {
    summonCastSeconds: summonCast, summonCastSource: resolved.summonCastSource || null,
    rule: `${specials.length ? `${specials.map((item) => `${item.name} (${round(item.effectiveUseTimeSeconds)} s use, ${item.cooldownSeconds} s cooldown)`).join(", ")} whenever ready, otherwise ` : ""}${slotLabel}; hits land at the end of each use; the first use starts after the ${summonCast} s summon cast`,
    firstHitSeconds: events[0]?.time ?? null, enhancedShare
  };
  assumptions.push({ id: `minionCycle:${resolved.key}`, value: "deterministic", text: `${resolved.minion} use pattern: ${cycle.rule} (assumed AI; in range of the stationary dummy the whole time).` });
  if (resolved.summonCooldownSeconds && specials.some((item) => item.cooldownSeconds && item.cooldownSeconds !== resolved.summonCooldownSeconds)) notes.push(`${resolved.summon}: the module tooltip's Cooldown ${resolved.summonCooldownSeconds} s is read as the summon's own cooldown; the special skill uses its Split cooldown (${specials.map((item) => `${item.name} ${item.cooldownSeconds} s`).join(", ")}).`);
  // Nourishment summary over the steady window: damage-weighted factor and the stacks held at each use.
  let nourishment = null;
  if (nourish) {
    const steadyEvents = events.filter((event) => event.time >= steadyFrom && event.time < steadyTo && event.nourishmentFactor);
    const lifted = steadyEvents.reduce((total, event) => total + event.damage, 0);
    const bare = steadyEvents.reduce((total, event) => total + event.damage / event.nourishmentFactor, 0);
    const uses = steadyEvents.reduce((total, event) => total + (event.weight ?? 1) * event.nourishmentStacks, 0) / Math.max(1e-9, steadyEvents.reduce((total, event) => total + (event.weight ?? 1), 0));
    nourishment = {
      mode: traitMode, autoTrait: nourish.autoTrait, activeAsTrait: nourish.activeAsTrait, traitCastSeconds: traitCasts.filter((at) => at < timelineSeconds),
      stacksPerTraitCast: nourishGain, traitCooldownSeconds: traitCooldown, effectPercent: nourish.effectPercent, effectivePercent: nourishEffect, durationSeconds: nourish.durationSeconds, maxStacks: nourishCap,
      loseChancePercent: nourish.loseChancePercent, losePerStackPercent: nourish.losePerStackPercent, noLossNoBonus: nourish.noLossNoBonus, empowerSharePercent: nourish.empowerSharePercent,
      steadyAverageStacks: uses, steadyFactor: bare ? lifted / bare : 1,
      fullBloom: nourish.fullBloom ? { ...nourish.fullBloom, entries: fullBloomEntries } : null,
      sources: nourish.sources
    };
    const modeText = traitMode === "cooldown" ? `the Trait Skill is cast whenever off cooldown (every ${traitCooldown} s from the summon cast${nourish.autoTrait ? "; auto-triggered by the trait" : "; best case, flip with the \"Trait Skill on cooldown\" combat condition"})` : traitMode === "summon" ? "only the summon cast counts as a Trait Skill cast (open: whether the Magus it creates receives the stacks)" : "the Trait Skill is never cast (no Nourishment)";
    assumptions.push({ id: `nourishment:${resolved.key}`, value: traitMode, text: `${resolved.minion} Nourishment (Iris – Growing Breeze): ${modeText}; ${nourishGain} stacks per Trait Skill cast (cap ${nourishCap}, ${nourish.durationSeconds} s); ${nourish.noLossNoBonus ? "no loss and no damage bonus (Gentle Zephyr)" : `+${round(nourishEffect)}% additional damage per stack on each Magus skill use (stacks add, provisional); each use then loses a stack with chance ${round(nourish.loseChancePercent)}% + ${round(nourish.losePerStackPercent)}% per stack held (one summed roll, provisional)`}; steady state ${round(uses)} stacks per hit on average, damage ×${round(nourishment.steadyFactor)}.` });
  }
  for (const item of skills.filter((entry) => entry.role === "ultimate")) notes.push(`${resolved.summon}: ${item.name} is the Ultimate (${round(item.perHitNoBuff)} per hit at this level) and needs Full Bloom, which only The Forsaken Iris – Growing Breeze grants (manual rule 1001012027); ${nourishment?.fullBloom ? (fullBloomEntries.length ? `Full Bloom starts at ${round(fullBloomEntries[0].at)} s (${nourishment.fullBloom.totalStacks} Nourishment stacks gained in total) for ${nourishment.fullBloom.durationSeconds} s, but the Ultimate's cooldown is unpublished, so it` : `this build's Full Bloom line (${nourishment.fullBloom.totalStacks} stacks gained in total) is not reached, so it`) : nourish ? "this build has no Full Bloom line (the Lv.60 trait Gentle Zephyr), so it" : "it"} is not in the cycle.`);
  if (enhanced && enhancedShare === 0) notes.push(`${resolved.summon}: ${enhanced.name} (Enhanced Skill, ${round(enhanced.perHitNoBuff)} per hit) is never used at a ${round(magus?.enhancedChancePercent ?? 0)}% Enhanced-skill chance.`);
  for (const line of lines.unread) notes.push(`${resolved.minion}: "${line.text}" (${line.source}) is not applied.`);
  const traitLinesUsed = traitLines.filter((line) => classifyMinionLine(line.text)).map((line) => ({ source: line.source, text: clean(line.text) }));
  const key = `minion:${resolved.key}`;
  return {
    key, minionKey: resolved.key, name: resolved.minion, summon: resolved.summon, family: resolved.family, level: effectiveLevel, baseLevel: capped,
    setupKeys: setups.map((setup) => setup.setupKey), setupNames: setups.map((setup) => setup.name),
    baseDamage, baseDamageSource: resolved.family === "module" ? "shared Minion table; Lv.1 = 10 and Lv.20 = 300 confirmed in game on module tooltips (2026-10-11)" : "TLIDB summon Minion table (damage column)", levelFactor,
    count, countSource: resolved.count?.source || null,
    magus: magus ? { growth: magus.growth, stage: magus.stage, enhancedChancePercent: magus.enhancedChancePercent, fixedChance: magus.fixedChance, growthRule: magus.growthRule, chanceRule: magus.chanceRule, sources: magus.sources, fullBloom: Boolean(fullBloomEntries.length), nourishment } : null,
    lines: { increased: lines.increased, additional: lines.additional, speed: lines.speed, critRating: lines.critRating, critDamage: lines.critDamage, penetration: lines.penetration, armourPenetration: lines.armourPenetration, added: lines.added, unread: lines.unread, trait: traitLinesUsed, support: lines.support, ...(lines.maxDamage.length ? { maxDamage: lines.maxDamage } : {}), ...(lines.minDamage.length ? { minDamage: lines.minDamage } : {}) },
    speeds: { attackSpeedFactor, castSpeedFactor },
    crit: { rating: critRating(null), chancePercent: critChance(null) * 100, damagePercent: critDamage(null) * 100, factor: critFactor(null), baseRating: baseCritRating, baseDamagePercent: baseCritDamage, ...(extraCritOnly.length ? { critOnlyFactor, critOnlySources: extraCritOnly } : {}) },
    skills: perSkill, cycle, events: events.filter((event) => event.time < timelineSeconds),
    combat: { dps: steadyDps, perMinionDps: steadyDps / Math.max(1, count), fiveSecondAverageDps: windowAverage(windows[0] ?? 5), twentySecondAverageDps: windowAverage(windows[1] ?? 20) },
    town: { dps: 0, note: "the character panel reads 0 for summon skills (user, 2026-10-11)" },
    notes, warnings, assumptions, modeled: steadyDps > 0,
    sources: { base: "src/minion-base-damage.js (TLIDB Minion table; in-game module tooltips)", rows: "src/data/skills/minion-skill-damage-ss13.generated.js (config_skill_damage)", timing: "src/data/skills/skill-timing-ss13.generated.js (SkillEditor Split)" }
  };
}

/**
 * Group active Minion-skill damage sources by Minion: one calculation per Minion type however many of its skills are set up.
 * @param {{ name, setupKey, status, profile }[]} damageSources collectSkillDamageSources output
 */
export function groupMinionSources(damageSources = []) {
  const groups = new Map();
  for (const source of damageSources) {
    if (source.status !== "modeled" || source.profile?.engine !== "minion") continue;
    const key = source.profile.minionKey;
    if (!groups.has(key)) groups.set(key, { profile: MINION_PROFILES[key], sources: [] });
    groups.get(key).sources.push(source);
  }
  return [...groups.values()];
}
