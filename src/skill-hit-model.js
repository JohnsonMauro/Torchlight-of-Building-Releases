import { normalizePercentageText } from "./percentage-text.js";
import { passiveSupportLines } from "./passive-support-lines.js";
import { critOnlyLinesFor } from "./crit-only-lines.js";
import { finisherAmplificationPercent, CONSUMED_COMBO_POINTS } from "./combo-points.js";
import { doubleDamageForSkill } from "./double-damage.js";
import { skillLevelDamageMultiplier } from "./engine.js";
import { supportEffectsFor, projectileQuantityFalloff, allElementalState, movementChargeShare, ASSUMED_MOVEMENT_METERS_PER_SECOND } from "./support-effects.js";
import { shotgunVolley, shotgunVolleyText } from "./shotgun-effect.js";
import { level85DummyDefenses, armourMitigationPercent } from "./target-hit-mitigation.js";
import { classifyHitLine, splitHitLineText, scopeApplies, scopeLabel, ELEMENTAL_TYPES } from "./skill-hit-lines.js";
import { skillHitBaseAtLevel, skillHitTiming } from "./skill-hit-profiles.js";
import { castSpeedScaledTriggerInterval } from "./trigger-interval.js";
import { BASE_CRITICAL_DAMAGE_PERCENT } from "./game-attribute-defaults.js";

// Generic spell-hit engine (profile kind "hit", engine "skill-hit"; src/skill-hit-profiles.js).
//
// Per hit component (one per typed entry of each hit group the profile lists, plus one per added-flat type):
//   hit = (base roll + added flat × effectiveness) × (1 + Σ increased) × Π(1 + additional) × crit factor
//         × Π(1 + damage taken) × armour × (1 − (resistance − penetration))
// scoped by the component's damage type and the skill's tags (src/skill-hit-lines.js). The skill-level
// bonus past Lv.20 is an additional-damage line (TLIDB Skill Level), the setup's supports read their
// progression tables, Magnificent/Noble supports add their star bonus, Aim's Projectile/Beam line applies to
// Beam / Projectile skills at its uptime, Terra skills add their Terra Charge line, and the main stat follows the
// Scorching Beam hit ledger's observed 0.5% additional damage per Intelligence point (Intelligence skills
// only; Strength / Dexterity have no modeled rule yet). Hits crit (expected factor from the planner's spell
// crit totals).
//
// Use rate: game use time (speed type "cast-speed" ÷ the planner's cast-speed factor; "fixed" unscaled),
// capped by cooldown ÷ charges after Cooldown Recovery Speed; a Terra skill is recast when its ground effect
// expires (uses/s = 1 / duration, best case continuous uptime); a Combo skill uses its cycle time. Hits per use
// come from each component: a number, or a tick spec (perTick × duration ÷ effective interval × shotgun falloff).
// DoT components are not computed here: src/skill-hit-profiles.js `skillHitDotComponents` turns them into
// skill-DoT profiles the planner feeds to src/skill-dot-model.js.
//
// Town figure: the character panel's skill DPS is assumed to be the average hit (with crit) × hits per use ×
// uses per second with the town layers only (no target armour / resistance, no damage taken, no Aim / combat
// lines). This formula is a hypothesis to confirm against an in-game panel.

const number = (value) => Number(String(value).replace("−", "-"));
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const product = (lines) => lines.reduce((factor, line) => factor * (1 + line.value / 100), 1);
const sum = (lines) => lines.reduce((total, line) => total + line.value, 0);

// Spell Burst full charge time (game manual, pasted by the user 2026-10-12): "Full Spell Burst Charge Restoration Time = 2 /
// (100 + Spell Burst Charge Speed)% x (100 + additional Spell Burst Charge Speed 1)% x (100 + additional Spell Burst Charge
// Speed 2)%…", i.e. 2 s ÷ (1 + Σ increased) ÷ Π(1 + additional) (user-confirmed 2026-10-12: additional Charge Speed
// shortens the charge time). Reads "+X% Spell Burst Charge Speed" and "±X% additional
// Spell Burst Charge Speed" lines from every source (gear, talents, slates, pacts, supports, memories); Minion lines and
// conditional ones (buffs, per stack, "for every") do not match and are not read.
export const SPELL_BURST_BASE_CHARGE_SECONDS = 2;
// "+X% [additional] Attack Speed when performing Multistrikes" (Bladerunner talent; read per skill in calculateSkillHit).
export const MULTISTRIKE_SPEED_LINE = /^([+-]?\d+(?:\.\d+)?)\s?% (additional )?Attack Speed when performing Multistrikes$/i;
export const SPELL_BURST_CHARGE_PATTERN = /^([+-]?\d+(?:\.\d+)?)\s?% (additional )?Spell Burst Charge Speed$/i;
export function spellBurstChargeTime(lines = []) {
  const sources = [];
  let increasedPercent = 0, additionalFactor = 1;
  for (const line of lines) {
    const match = String(line?.text ?? "").match(SPELL_BURST_CHARGE_PATTERN);
    if (!match) continue;
    const value = Number(match[1]) * (line.multiplier ?? 1);
    if (match[2]) additionalFactor *= 1 + value / 100; else increasedPercent += value;
    sources.push({ source: line.source ?? null, text: line.text, value, additional: Boolean(match[2]) });
  }
  const divisor = (1 + increasedPercent / 100) * additionalFactor;
  return { seconds: divisor > 0 ? SPELL_BURST_BASE_CHARGE_SECONDS / divisor : Infinity, increasedPercent, additionalFactor, sources };
}
const round = (value) => Math.round(value * 10000) / 10000;
const average = (range) => (range.min + range.max) / 2;
// Per-hand ranges of an alternate dual-wield component (src/skill-hit-profiles.js), scaled with the component's own share.
const scaleHands = (hands, share) => hands ? hands.map((hand) => ({ ...hand, min: hand.min * share, max: hand.max * share })) : hands;

const signedText = (value) => `${value >= 0 ? "+" : ""}${value}`;
const cap = (word) => String(word || "").charAt(0).toUpperCase() + String(word || "").slice(1).toLowerCase();
// Manual "Conversion of the Type of Damage Dealt": lower to higher only, in this order.
const CONVERSION_ORDER = ["Physical", "Lightning", "Cold", "Fire", "Erosion"];
const UNMODELED_WARNING_SKIP = /Minion|Ailment|Ignite|Trauma|Wilt|Over Time|Cursed|Numbed|Skill Area/i;

// Supports on the setup, read from the shared resolver (src/support-effects.js): leveled TLIDB progression values
// at the effective level (a,b pairs and a/b fractions), fixed base lines, Magnificent / Noble star bonuses and rolled
// affixes. Each additional line keeps its own multiplier (the star bonus and the roll of one support are two lines).
function supportLayers(setup, { dealtTypes, skillTags, profile, speedType }) {
  const effects = supportEffectsFor(setup, { profile, engine: "skill-hit", dealtTypes, tags: [...skillTags], speedType, channeled: Boolean(profile?.useModel && /channel/.test(profile.useModel.kind || "")) });
  const additional = [], increased = [], critOnlyAdditional = [], added = [], castSpeed = [], castFrequency = [], critRating = [], conversion = [], addedAs = [], cooldown = [], unmodeled = [], notes = [], maxStacks = [];
  const attack = speedType === "attack-speed";
  const suffix = (line) => line.origin === "leveled" ? ` (Lv.${line.level})` : line.origin === "roll" ? ` (T${line.tier ?? "?"} roll)` : line.origin === "fixed" ? " (fixed)" : "";
  const typedApplies = (typed) => ELEMENTAL_TYPES.includes(typed) || ["Physical", "Erosion"].includes(typed) ? dealtTypes.includes(typed) : typed === "Elemental" ? dealtTypes.some((type) => ELEMENTAL_TYPES.includes(type)) : typed === "Hit" || typed === "Spell" || skillTags.has(typed);
  for (const line of effects.additional) {
    if (line.origin === "star") { if (line.value) additional.push({ source: line.source, text: `+${line.value}% additional damage (${line.stars ?? "?"}★ star bonus)`, value: line.value, category: "Additional damage" }); continue; }
    if (!line.typed) { additional.push({ source: line.source, text: `${signedText(line.value)}% additional damage for the supported skill${suffix(line)}`, value: line.value, category: "Additional damage" }); continue; }
    if (typedApplies(line.typed)) additional.push({ source: line.source, text: `${signedText(line.value)}% additional ${line.typed} Damage for the supported skill${suffix(line)}`, value: line.value, category: "Additional damage", scopeTypes: line.typed === "Elemental" ? [...ELEMENTAL_TYPES] : ["Physical", "Fire", "Cold", "Lightning", "Erosion"].includes(line.typed) ? [line.typed] : null });
    else notes.push(`${line.support}: "${line.text}" does not reach this skill's ${dealtTypes.join("/")} hits.`);
  }
  // Conditional lines resolved from the planner's state (src/support-effects.js resolveCondition): cursed / Numbed /
  // ailment-type count / one enemy / weapon type / standing still or moving / distance. Unresolved (no state) adds nothing.
  // Lines for triggered uses only (Rhythm's movement bonus) wait for the trigger model below.
  const triggeredAdditional = [];
  for (const line of effects.conditionalAdditional.filter((item) => item.active && item.appliedValue && item.triggeredOnly)) triggeredAdditional.push({ source: line.source, text: `${line.text}${suffix(line)} — ${line.conditionText}`, value: line.appliedValue, category: "Additional damage", condition: line.conditionText });
  // Activation Medium triggers on the dummy (src/support-effects.js statuses): interval, always and Boss / Elite mediums.
  const triggers = effects.trigger.filter((item) => ["interval", "target", "maxMultistrike"].includes(item.kind) && item.status !== "Inactive" && item.status !== "Not modeled");
  const castSpeedShare = effects.triggerDetail.find((item) => item.kind === "castSpeedShare")?.share ?? null;
  const manualPenalty = effects.manualPenalty.map((line) => ({ source: line.source, text: `${line.text} (the skill is used, not triggered)`, value: line.value, category: "Additional damage" }));
  for (const line of effects.conditionalAdditional.filter((item) => item.active && item.appliedValue && !item.triggeredOnly)) additional.push({ source: line.source, text: `${line.text}${suffix(line)} — ${line.conditionText}`, value: line.appliedValue, category: "Additional damage", condition: line.conditionText });
  // Passivation on hits: "up to +X% additional <Type> Damage" vs enemies with more Life, full value (best case; the
  // dummy's Life share is not tracked: provisional), on components of that type.
  for (const clause of effects.clauses.filter((item) => item.family === "conditionalTyped" && dealtTypes.includes(item.typed) && item.value)) additional.push({ source: clause.source, text: `up to +${clause.value}% additional ${clause.typed} Damage vs enemies with more Life${suffix(clause)} (full value assumed; provisional)`, value: clause.value, category: "Additional damage", scopeTypes: [clause.typed] });
  // "+X% additional damage for the supported skill for each stack of Focus Blessing" (Overload): × the planner's Focus
  // Blessing stacks (blessing model); 0 stacks (Provisional) when the setup was resolved without a stack count.
  for (const line of effects.perStack.filter((item) => item.stackSource === "focusBlessing" && item.appliedValue)) additional.push({ source: line.source, text: `+${line.value}% additional damage for the supported skill × ${line.stacks} Focus Blessing stacks${suffix(line)}`, value: line.appliedValue, category: "Additional damage" });
  for (const line of effects.increased.filter((item) => item.status === "In calc")) increased.push({ source: line.source, text: `${line.text}${suffix(line)}`, value: line.value, category: "Increased damage", scope: { damageTypes: line.scope?.damageTypes ? new Set(line.scope.damageTypes) : null, skillTags: line.scope?.skillTags ? new Set(line.scope.skillTags) : null, hitOnly: Boolean(line.scope?.hitOnly) } });
  for (const line of effects.critOnlyAdditional) critOnlyAdditional.push({ source: line.source, text: `${signedText(line.value)}% additional damage on Critical Strikes${suffix(line)}`, value: line.value, category: "Additional damage (crits only)" });
  for (const line of effects.added) added.push({ source: line.source, text: `Adds ${line.min}–${line.max} ${line.type} Damage to the supported skill${suffix(line)}`, type: line.type, min: line.min, max: line.max });
  for (const line of effects.speed) {
    const wording = line.kind === "both" ? "Attack and Cast Speed" : line.kind === "attack" ? "Attack Speed" : line.kind === "cast" ? "Cast Speed" : "Cast Frequency for Sentries";
    const entry = { source: line.source, text: `${signedText(line.value)}% ${line.additional ? "additional " : ""}${wording}${suffix(line)}`, value: line.value, additional: line.additional };
    if (line.kind === "castFrequency") { castFrequency.push(entry); continue; }
    if ((line.kind === "attack" && !attack) || (line.kind === "cast" && attack)) continue;
    // Quick Decision's additional speed is already in the planner's cast-speed total for spells (src/scorching-beam-cast-rate.js
    // reads it per setup); attacks use the weapon's Attack Speed, which never included it (B3), so it applies here.
    if (line.kind === "both" && line.additional && line.support === "Quick Decision" && !attack) continue;
    castSpeed.push(entry);
  }
  for (const line of effects.crit) critRating.push({ source: line.source, text: `${line.kind === "ratingFlat" ? signedText(line.value) : `${signedText(line.value)}%`} ${line.kind === "ratingAdditional" ? "additional " : ""}Critical Strike Rating${suffix(line)}`, value: line.value, kind: line.kind });
  for (const line of effects.conversion) conversion.push({ source: line.source, text: line.text, from: cap(line.from), to: cap(line.to), percent: line.percent });
  for (const line of effects.addedAs) addedAs.push({ source: line.source, text: `${line.text}${suffix(line)}`, from: cap(line.from), to: cap(line.to), percent: line.percent });
  for (const line of effects.cooldown) cooldown.push({ source: line.source, text: `${signedText(line.value)}% ${line.additional ? "additional " : ""}Cooldown Recovery Speed${suffix(line)}`, value: line.value, additional: line.additional });
  // "+N Max Channeled Stacks for the supported skill" (Channeled Depths +2, Immolate +13): the same reading as
  // src/build-mechanics.js for the Scorching Beam channel.
  for (const line of effects.channel.max) maxStacks.push({ source: line.source, text: `+${line.value} Max Channeled Stacks`, value: line.value });
  for (const clause of effects.clauses) if (clause.status === "Not modeled" && /[Dd]amage/.test(clause.text) && !UNMODELED_WARNING_SKIP.test(clause.text)) unmodeled.push({ source: clause.source, text: clause.text });
  return { additional, increased, critOnlyAdditional, added, castSpeed, castFrequency, critRating, conversion, addedAs, cooldown, unmodeled, notes, maxStacks, triggers, castSpeedShare, manualPenalty, triggeredAdditional, effects };
}

// Channeled-skill lines the shared classifier does not parse (the same templates src/build-mechanics.js reads for
// the Scorching Beam channel): increased damage for Channeled Skills, per-additional-max-stack damage, and the
// max-stack lines themselves. Returns null for anything else.
const CHANNEL_INCREASED = /^\+(\d+(?:\.\d+)?)% damage for Channeled Skills$/i;
const CHANNEL_PER_STACK_INCREASED = /^\+(\d+(?:\.\d+)?)% damage for every \+1 additional Max Channeled Stack\(s\)$/i;
const CHANNEL_PER_STACK_ADDITIONAL = /^\+(\d+(?:\.\d+)?)% additional damage for every \+(\d+) additional Max Channeled Stack\(s\)$/i;
const CHANNEL_MAX_STACKS = /^\+(\d+) (?:to )?Max Channeled Stacks?$/i;
function classifyChannelLine(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  let match = clean.match(CHANNEL_INCREASED);
  if (match) return { kind: "increased", value: number(match[1]) };
  match = clean.match(CHANNEL_PER_STACK_INCREASED);
  if (match) return { kind: "perStackIncreased", value: number(match[1]), per: 1 };
  match = clean.match(CHANNEL_PER_STACK_ADDITIONAL);
  if (match) return { kind: "perStackAdditional", value: number(match[1]), per: number(match[2]) };
  match = clean.match(CHANNEL_MAX_STACKS);
  if (match) return { kind: "maxStacks", value: number(match[1]) };
  return null;
}

// Sentry Cast Frequency lines (sentry batch, 2026-10-12). Manual rule 1001011724: "The speed at which Sentries use skills is
// controlled by Cast Frequency and not Attack or Cast Speed. It is calculated in the same way as Attack and Cast Speed."
// Plain lines ("+X% Sentry Skill cast frequency", "+X% additional Sentry Skill Cast Frequency") are read; conditional
// wordings (no Sentries Nearby, per Sentry Skill used recently, per Numbed enemy, per Chaos point) are listed as not read.
const SENTRY_CAST_FREQUENCY = /^([+-]?\d+(?:\.\d+)?)% (additional )?Sentry(?: Skill)? [Cc]ast [Ff]requency$/i;
const SENTRY_CAST_FREQUENCY_ANY = /Sentr(?:y|ies)[^.]*[Cc]ast [Ff]requency|[Cc]ast [Ff]requency[^.]*Sentr(?:y|ies)/i;
export function classifySentryLine(text) {
  const clean = String(text || "").replace(/\s*%/g, "%").replace(/\+\s+/g, "+").replace(/\s+/g, " ").trim();
  const match = clean.match(SENTRY_CAST_FREQUENCY);
  if (match) return { kind: "castFrequency", value: number(match[1]), additional: Boolean(match[2]) };
  if (SENTRY_CAST_FREQUENCY_ANY.test(clean)) return { kind: "castFrequency", conditional: true };
  return null;
}

// Shotgun Effect (src/shotgun-effect.js): of a volley of n, `reach` decides how many land on the dummy (a fan: ceil(n / 2)
// standing close, one at range; "all" otherwise), and they total 1 + factor × (landed − 1) (linear: game hit rule
// repeatDmgDecPercent, Chromatic Shot runs 2026-10-12). Replaces the compounding Σ factor^i used before.
const falloffVolley = (falloff, nearTarget) => falloff ? shotgunVolley(falloff, { nearTarget }) : null;

// One Multistrike sequence (Attack skills). Game manual (config_multi_language_en, sourced): 1001020124 "Multistrike Chance is
// 0 by default. When the Multistrike Chance exceeds 100%, one additional attack is guaranteed to be performed after your
// initial attack, and each full 100% increment grants another additional attack. The excessive chance that is lower than 100%
// will be the chance of performing another additional attack after the additional attacks"; 1001020125 "Each attack performed
// during Multistrike of the skill will receive additional damage bonus based on the Multistrike Damage Increment (the second
// attack receives the bonus once, the third attack receives the bonus twice, and so on)"; 1001020126 "Additional Multistrike
// Damage Increment … its value will be multiplied by (100% + Additional Increment percentage)"; 1001020127 "The Multistrike
// Count starts from 1 (E.g. When the Multistrike Chance is 200%, … a cycle of 1, 2, 3...). The Max Multistrike Count depends
// on the Multistrike Chance"; 1001020123 / TLIDB: +20% Attack Speed during Multistrikes.
// Attack j of a sequence (j = 0 the initial attack) has Multistrike Count 1 + initialCountBonus + j and takes
// (count − 1) × increment. Provisional readings (Erika batch 2026-10-14, questions to the user):
// - "+N initial Multistrike Count" shifts every count of the sequence by N; the number of attacks still follows the chance, so
//   the Max Multistrike Count is the last attack's count (reading A). The alternative (the sequence stops at a fixed Max, so a
//   higher start means fewer, stronger attacks) is not modeled.
// - "+X% additional damage during Multistrike" (repeatAdditionalPercent) reaches the repeated attacks (j ≥ 1), not the
//   initial attack (the planner's reading of "+20% Attack Speed during Multistrikes" too).
// - "attacks that reach max Multistrike Count" (maxCountAdditionalPercent) is the last attack of a sequence that multistrikes;
//   a sequence below 100% chance reaches it only when the repeat happens. One Max Multistrike Count event per such sequence.
// - Additional Multistrike Damage Increment from several sources (Cat's Scratch, Thunder Slash's "2% additional damage
//   increment for every +1% Steep Strike chance" = skillIncrementAdditionalPercent) add up into the one "additional increment"
//   percentage the manual multiplies the increment by. User-supplied answer (2026-10-14, the user's pasted AI answer; not an
//   in-game test): Cat's Scratch and the Steep-chance increment share that one additive pool. Provisional.
// - Cat Dive (Erika, catDiveChancePercent; user-supplied reading, confirmed 2026-10-14, provisional): each repeated attack
//   (j ≥ 1) has that chance to take the damage increment of the Max Multistrike Count attack instead of its own; expected
//   value chance × max-count strike + (1 − chance) × own strike. A Cat Dive trigger is not a Max Multistrike Count event
//   (user-confirmed 2026-10-14), so maxCountAdditionalPercent and the event count do not change. The max-count strike is the
//   last attack's count (whole + 1 when the remainder may add one more, else whole); each repeat's other multipliers
//   (Stalker's repeat bonus) are kept.
export function multistrikeSequence({ chancePercent = 0, incrementPercent = 0, initialCountBonus = 0, repeatAdditionalPercent = 0, maxCountAdditionalPercent = 0, incrementAdditionalPercent = 0, skillIncrementAdditionalPercent = 0, catDiveChancePercent = 0 } = {}) {
  const expected = Math.max(0, chancePercent) / 100, whole = Math.floor(expected), remainder = expected - whole;
  const increment = incrementPercent * (1 + (incrementAdditionalPercent + skillIncrementAdditionalPercent) / 100) / 100;
  const dive = Math.min(1, Math.max(0, catDiveChancePercent / 100));
  const maxIndex = remainder > 0 ? whole + 1 : whole;
  const plainStrike = (index) => (1 + (initialCountBonus + index) * increment) * (index >= 1 ? 1 + repeatAdditionalPercent / 100 : 1);
  const strikeAt = (index) => index >= 1 && dive > 0 && index < maxIndex ? dive * plainStrike(maxIndex) + (1 - dive) * plainStrike(index) : plainStrike(index);
  // The +X% on the attack that reaches the Max Multistrike Count (the last attack of the sequence) applies to whatever that
  // attack deals, a Cat Dive included; the dive itself never makes an earlier attack count as reaching it.
  const strike = strikeAt;
  let damage = 0;
  for (let index = 0; index <= whole; index++) damage += strike(index);
  damage += remainder * strike(whole + 1);
  const atMax = maxCountAdditionalPercent / 100;
  if (atMax) damage += atMax * ((whole >= 1 ? (1 - remainder) * strike(whole) : 0) + remainder * strike(whole + 1));
  const cycleIntervals = 1 + expected / 1.2;
  return { chancePercent, incrementPercent, skillIncrementAdditionalPercent, catDiveChancePercent: dive * 100, effectiveIncrementPercent: increment * 100, initialCountBonus, expectedExtraAttacks: expected, damagePerCycle: damage, cycleIntervals, rateFactor: (1 + expected) / cycleIntervals, averageDamageFactor: damage / (1 + expected), maxCountEventsPerCycle: whole >= 1 ? 1 : remainder, maxCount: 1 + initialCountBonus + whole + (remainder > 0 ? 1 : 0) };
}
// Steep Strike chance per Slash-Strike skill (2026-10-14): the skill's own chance (profile.steepStrike, TLIDB "This skill +20%
// Steep Strike chance") + "The supported skill +X% Steep Strike chance" on its supports (Raging Slash) + the build's plain
// "+X% Steep Strike chance" lines (gear, talents, slates; src/passive-support-lines.js). Only Slash-Strike skills have a Steep
// Strike form, so a plain line reaches each of them.
// - fromChance (the default): min(100%, total) of attacks are Steep Strikes and replace the Sweep Slash (observed: Whirlwind Lv16
//   run 2026-10-12, research/attack-weapon-tests-2026-10-12.md); components marked `steep` in src/attack-hit-profiles.js follow
//   that share (the Steep Strike, Icy Blade's Explosion at 0.7 per Steep Strike, the Sweep Slash on the rest).
// - Thunder Slash (fromChance false; TLIDB "This skill cannot obtain Steep Strike attempts with Steep Strike Chance"): the
//   chance adds no Steep Strikes; its own Steep Strike "for every 2 Multistrikes during Sweep Slash" keeps its component, and
//   "The skill's Multistrikes gain 2% additional damage increment for every +1% Steep Strike chance" reads the total
//   (multistrikeSequence skillIncrementAdditionalPercent; provisional: added to the other additional increments).
// - Thunder Slash's Steep Strike attempts (spec.multistrikeAttempts; user-supplied mechanism 2026-10-14, provisional; the
//   per-attack check confirmed by a user-supplied answer 2026-10-15: attempts are checked once per individual attack, not once
//   per sequence): it stores
//   one attempt per 2 Multistrikes (repeat attacks); each use with a stored attempt spends it and is a Steep Strike, which
//   replaces that use's Sweep Slash (TLIDB "When having Steep Strike attempts, launches a Steep Strike"; Raging Slash's keyword
//   text: "the skill will be cast in Steep Strike form and consume 1 Steep Strike attempt"). Steep Strikes per use = min(1,
//   expected repeat attacks per use ÷ 2), a use being one attack of the Multistrike sequence (the model's use rate counts every
//   attack): repeats per use = E ÷ (1 + E) from multistrikeSequence (calculateSkillHit sets `share`). Big Stride's window
//   (`window`, user-supplied 2026-10-14: every attack within 4 s after moving 8 m is a Steep Strike; the window held while
//   moving, confirmed by a user-supplied answer 2026-10-15) makes it 1 while Moved recently holds (always moving: best case).
// - Blade Cluster (TLIDB "Generates 2 additional Steep Strikes when the supported skill launches a Steep Strike"; user-supplied
//   answer 2026-10-15, provisional; replaces the 2026-10-14 "+2 max stored attempts" reading): each launched Steep Strike
//   produces N more Steep Strike hits on the same target, so the Steep Strike component's hits per launch are × (1 + N)
//   (`clusterHits` = N). The extra hits are Steep Strikes (they take "+X% additional Steep Strike Damage" and the skill's
//   crit), spend no attempt and add no Multistrike; they count in the skill's hits/s (src/planner.js hitRateFacts).
export function steepStrikeState({ profile, supportLines = [], passiveLines = [] } = {}) {
  const spec = profile?.steepStrike;
  if (!spec) return null;
  const window = supportLines.find((line) => line.kind === "guaranteedAfterMoving") || null;
  const extraAttempts = supportLines.filter((line) => line.kind === "extraAttempts");
  supportLines = supportLines.filter((line) => !line.kind || line.kind === "chance");
  const sources = [
    ...(spec.ownChancePercent ? [{ source: `${profile.name} (skill text)`, text: `This skill +${spec.ownChancePercent}% Steep Strike chance (TLIDB)`, value: spec.ownChancePercent, origin: "skill" }] : []),
    ...supportLines.map((line) => ({ source: line.source, text: line.text, value: line.value, origin: "support" })),
    ...passiveLines.map((line) => ({ source: line.source, text: line.text, value: line.value, origin: line.origin }))
  ];
  const chancePercent = sources.reduce((total, line) => total + (Number(line.value) || 0), 0);
  const fromChance = spec.fromChance !== false;
  const perChance = spec.multistrikeIncrementPerChancePercent || 0;
  return { chancePercent, sources, fromChance, share: fromChance ? Math.min(1, Math.max(0, chancePercent / 100)) : null, perChance, incrementAdditionalPercent: perChance * Math.max(0, chancePercent), source: spec.source || null,
    multistrikeAttempts: spec.multistrikeAttempts || null, window: window ? { source: window.source, text: window.text, meters: window.meters ?? null, seconds: window.seconds ?? null } : null, extraAttempts: extraAttempts.map((line) => ({ source: line.source, text: line.text, attempts: Number(line.attempts) || 0 })),
    clusterHits: extraAttempts.reduce((total, line) => total + (Number(line.attempts) || 0), 0) };
}

/** Steep Strikes per use from stored attempts (Thunder Slash; see steepStrikeState): { share, repeatsPerUse, fromRepeats, window }. */
// Without the Multistrike sequence model (no Multistrike chance on the skill's supports or the build's lines) the profile's own
// reading holds: `ownRepeatsPerUse` repeated attacks per use (Thunder Slash: its +20% Multistrike chance as 0.2 repeated sweeps).
export function steepAttemptShare({ multistrike = null, perRepeats = 2, window = false, ownRepeatsPerUse = 0 } = {}) {
  const extra = multistrike ? Math.max(0, multistrike.expectedExtraAttacks || 0) : 0;
  const repeatsPerUse = multistrike ? extra / (1 + extra) : Math.max(0, ownRepeatsPerUse);
  const fromRepeats = Math.min(1, repeatsPerUse / perRepeats);
  return { share: window ? 1 : fromRepeats, repeatsPerUse, fromRepeats, window: Boolean(window) };
}

// Expected damage per sequence over weighted states ({ weight, ...multistrikeSequence options }).
export function multistrikeStatesDamage(base, states = []) {
  const total = states.reduce((sum, state) => sum + (Number(state.weight) || 0), 0);
  if (!(total > 0)) return multistrikeSequence(base).damagePerCycle;
  return states.reduce((sum, state) => sum + (Number(state.weight) || 0) / total * multistrikeSequence({ ...base, ...state }).damagePerCycle, 0);
}

/**
 * Hit events per use: one per strike, not per damage part (2026-10-15 hit-count fix). The typed parts of one hit group (a
 * row's damage types, a weapon's damage types, profile or support conversion pieces) share a `strikeKey` (src/skill-hit-
 * profiles.js skillHitBaseAtLevel) and count once; distinct groups (Sweep Slash vs Steep Strike, a Pummel vs its Explosion)
 * stay separate. Added-only parts (added flat of a new type, "added as") never count. Before the fix every typed part counted,
 * so Thunder Slash with a Physical→Lightning and a Lightning weapon part read 6.4 hits per use instead of 3.2.
 * `hitsOf(component)` gives a part's hits per use (default its hitsPerUse); parts of one strike share it, the max is taken.
 */
export function strikeHitsPerUse(components = [], hitsOf = (component) => component.hitsPerUse) {
  const strikes = new Map();
  for (const component of components) {
    if (!component || component.addedOnly || component.splitPart) continue;
    const key = component.strikeKey ?? component.componentKey ?? component.key ?? component.label;
    strikes.set(key, Math.max(strikes.get(key) ?? 0, Number(hitsOf(component)) || 0));
  }
  return [...strikes.values()].reduce((total, hits) => total + hits, 0);
}

/**
 * Projectiles of one hit group that reach the dummy per use, without Shotgun falloff: a fan's falloff-weighted hits
 * (`hitsPerUse` = per-use hits × shotgun.total) count each landing projectile once (× shotgun.reached / shotgun.total). Youga's
 * Recall (src/youga-ultimate-one.js) returns every one of them as a full-damage fresh hit.
 */
export function recalledProjectilesPerUse(component) {
  const hits = Number(component?.hitsPerUse) || 0;
  const shotgun = component?.shotgun;
  return shotgun && shotgun.total > 0 && Number.isFinite(shotgun.reached) ? hits / shotgun.total * shotgun.reached : hits;
}

/**
 * Model one skill's hits against the dummy.
 * @param {object} p
 * @param {object} p.setup resolved setup (effectiveLevel, supports)
 * @param {object} p.profile SKILL_HIT_PROFILES entry
 * @param {object[]} p.modifierTexts flattened modifier lines (planner.modifierTexts)
 * @param {object} p.castSpeed { factor, sources } — the planner's cast-speed total as a multiplier on uses/s
 * @param {object} p.crit scorchingBeamCritical(...) output for this setup (spell crit totals)
 * @param {object[]} p.auraEntries active aura entries (effectiveEffects)
 * @param {object} p.aim planner.aim
 * @param {number} p.intelligenceAdditionalPercent main-stat line (0.5% × total Intelligence) from the hit ledger
 * @param {object} p.target { resistancePercent: { Fire, Cold, Lightning, Erosion }, armourPercent, nonPhysicalArmourPercent }
 * @param {boolean} p.targetCursed
 * @param {object[]} p.extraTaken typed enemy damage-taken lines the planner settles ({ source, text, value, types })
 * @param {object} p.multistrikeEffects hero states on Multistrike sequences (src/erika-wind-stalker.js): { steps: [{ source,
 *   text, states: [{ weight, initialCountBonus, repeatAdditionalPercent, maxCountAdditionalPercent, incrementAdditionalPercent }] }] }
 *   — each step's states are cumulative; each step becomes one additional-damage line (its factor over the previous step)
 * @param {object[]} p.extraCritOnly enemy crit-taken debuffs on the crit share ({ source, text, value }; Mark, src/mark-effect.js)
 */
export function calculateSkillHit({ luckyDamageRolls = 1, deterioration = null, setup, profile, modifierTexts = [], castSpeed = { factor: 1, sources: [] }, attackSpeed = null, weapon = null, crit = {}, auraEntries = [], aim = null, intelligenceAdditionalPercent = 0, intelligenceSource = null, mainStatPoints = null, target = {}, targetCursed = false, targetCurseCount = 0, enemyAilments = null, extraTaken = [], windows = [5, 20], nearTarget = true, multistrikeEffects = null, extraCritOnly = [], movedRecently = true, multistrikeEventsPerSecond = null, heroEffects = null } = {}) {
  // Hero effects on one skill (src/youga-ultimate-one.js: Clockwork Core's Tangle cadence, its shared bonuses, Recall hits,
  // the crit cooldown reduction, the Spell Burst rules, the Alternate Spacetime lines): skill-local plain lines join the
  // modifier lines read below.
  if (heroEffects?.extraModifierTexts?.length) modifierTexts = [...modifierTexts, ...heroEffects.extraModifierTexts];
  const level = Math.max(1, Math.floor(setup?.effectiveLevel ?? 20));
  // Weapon Attack Damage skills (src/attack-hit-profiles.js) scale the equipped weapon's damage (src/weapon-damage-model.js).
  const attackProfile = Boolean(profile.weaponScaling);
  const base = skillHitBaseAtLevel(profile, level, attackProfile ? weapon : null);
  const timing = skillHitTiming(profile);
  const skillTags = new Set(profile.tags || []);
  // Lines scoped to tags the skill text borrows ("Spell Damage bonus and additional bonus also apply to the skill's
  // Attack Damage": Moon Strike) reach the hit; the ailment inputs keep the skill's real tags.
  const scopeTags = new Set([...skillTags, ...(profile.lineScopeTags || [])]);
  // Skill-tag changes from supports ("The supported skill gains the Cold Tag", "Removes the Area tag"): the line scopes follow.
  const tagEffects = supportEffectsFor(setup, { profile, engine: "skill-hit" }).tags;
  for (const line of tagEffects.add) scopeTags.add(line.tag);
  for (const line of tagEffects.remove) scopeTags.delete(line.tag);
  const dealtTypes = profile.dealtTypes || [];
  const notes = [...(profile.notes || [])];
  const warnings = [...(profile.warnings || [])];
  const speedTypeForSupports = skillHitTiming(profile)?.speedType || "cast-speed";
  const supportsRaw = supportLayers(setup, { dealtTypes, skillTags: scopeTags, profile, speedType: speedTypeForSupports });
  // Aura stats scoped to the Melee tag (gear-pact batch G4; game-data aura records, src/data/skills/aura-scaling-ss13.js):
  // Fearless "+X% Critical Strike Rating for Melee Skills" joins the attack crit rating's increased pool and Precise:
  // Fearless "+X% Melee Attack Speed" the attack-speed pool, like the supports' lines of the same kind. Melee skills only;
  // a Melee skill without an attack crit base (no weapon model) does not read the crit line (provisional).
  const auraTagSpeed = [], auraTagCrit = [];
  for (const entry of auraEntries) {
    const effects = entry.effectiveEffects || {};
    if (!scopeTags.has("Melee")) continue;
    if (effects.meleeAttackSpeedPercent && speedTypeForSupports === "attack-speed") auraTagSpeed.push({ source: `Aura: ${entry.name} / Melee Attack Speed`, text: `+${round(effects.meleeAttackSpeedPercent)}% Melee Attack Speed`, value: effects.meleeAttackSpeedPercent, additional: false });
    if (effects.meleeCriticalStrikeRatingPercent) auraTagCrit.push({ kind: "ratingPercent", source: `Aura: ${entry.name} / Melee Critical Strike Rating`, text: `+${round(effects.meleeCriticalStrikeRatingPercent)}% Critical Strike Rating for Melee Skills`, value: effects.meleeCriticalStrikeRatingPercent });
  }
  // Passive build-wide conversion, added-as, Multistrike and Projectile Quantity lines (src/passive-support-lines.js; gear-pact
  // batch chunk 2) join the support arrays they share their rules with.
  const passive = passiveSupportLines(modifierTexts);
  const capType = (type) => type[0].toUpperCase() + type.slice(1).toLowerCase();
  const supports = {
    ...supportsRaw,
    castSpeed: [...supportsRaw.castSpeed, ...auraTagSpeed],
    critRating: [...supportsRaw.critRating, ...auraTagCrit],
    conversion: [...supportsRaw.conversion, ...passive.conversion.map((line) => ({ source: line.source, text: line.text, from: capType(line.from), to: capType(line.to), percent: line.percent }))],
    addedAs: [...supportsRaw.addedAs, ...passive.addedAs.map((line) => ({ source: line.source, text: `${line.text} (provisional reading)`, from: capType(line.from), to: capType(line.to), percent: line.percent }))],
    effects: { ...supportsRaw.effects, multistrike: [...supportsRaw.effects.multistrike, ...passive.multistrike], quantity: [...supportsRaw.effects.quantity, ...passive.quantity] }
  };
  notes.push(...supports.notes);
  // Steep Strike chance (Slash-Strike skills; steepStrikeState above).
  const steepStrike = steepStrikeState({ profile, supportLines: supportsRaw.effects.steepStrike || [], passiveLines: passive.steepStrike || [] });
  if (steepStrike) notes.push(steepStrike.fromChance
    ? `${profile.name}: Steep Strike chance ${round(steepStrike.chancePercent)}% (${steepStrike.sources.map((line) => `${line.source} +${round(line.value)}%`).join(", ")}) → ${round(steepStrike.share * 100)}% of attacks are Steep Strikes replacing the Sweep Slash (observed reading, Whirlwind Lv16 run 2026-10-12).`
    : `${profile.name}: cannot obtain Steep Strikes from Steep Strike chance (TLIDB); ${round(steepStrike.chancePercent)}% chance${steepStrike.sources.length ? ` (${steepStrike.sources.map((line) => `${line.source} +${round(line.value)}%`).join(", ")})` : ""}${steepStrike.perChance ? ` × ${steepStrike.perChance}% = +${round(steepStrike.incrementAdditionalPercent)}% additional Multistrike damage increment (provisional)` : ""}.`);
  for (const line of supports.unmodeled) warnings.push(`${line.source}: "${line.text}" is not read by the ${profile.name} hit model.`);

  // Use model: "cast" (one use per cast), "terra" (one ground effect / sentry at a time, recast on expiry), "channel"
  // (one use per channel interval, stacks held at max) or "rate" (a trigger cadence the profile fixes).
  // "channel-release" (attack channels such as Charged Pummel): the channel is built to its max stacks and released; one
  // use is the whole cycle (stacks × channel interval), with per-stack hits during the channel and release hits at its end.
  const release = profile.useModel?.kind === "channel-release" ? profile.useModel : null;
  const channel = profile.useModel?.kind === "channel" || release ? profile.useModel : null;
  const rateModel = profile.useModel?.kind === "rate" ? profile.useModel : null;
  // Weapon restriction ("Limited to …"): a weapon the skill cannot be used with makes the skill inactive (no uses; the
  // per-hit figures are still computed so the ledger shows what an allowed weapon of the same damage would deal).
  let inactiveReason = null;
  if (attackProfile) {
    const restriction = profile.weaponScaling.restriction;
    const held = weapon?.mainHand?.weapon ? weapon.mainHand : weapon?.offHand?.weapon ? weapon.offHand : null;
    if (!weapon || weapon.unarmed) warnings.push(`${profile.name}: deals Weapon Attack Damage and no weapon damage is available (no weapon model / unarmed), so its hits compute to 0.`);
    else if (restriction?.types && held?.type && !restriction.types.includes(held.type)) inactiveReason = `${restriction.text} — the equipped ${held.type} cannot use this skill in game`;
    else if (restriction?.dualWield && !weapon.dualWielding) inactiveReason = `${restriction.text} — the skill needs two one-handed weapons and the build is not dual wielding`;
    if (inactiveReason) warnings.push(`${profile.name}: inactive — ${inactiveReason}; its hits are shown for reference and its rate is 0.`);
    for (const note of weapon?.notes || []) notes.push(`${profile.name}: ${note}`);
    for (const warning of weapon?.warnings || []) warnings.push(`${profile.name}: ${warning}`);
  }
  // A trigger that needs an ailment on the target (Ice Focus: Focus Pts only from damage to Frostbitten enemies) is inactive
  // unless the enemy-ailment model (src/enemy-ailments.js: a support such as Glacial Freeze on an active skill dealing Hit
  // <Type> Damage) finds the build inflicting it; the per-hit figures are still computed for reference.
  if (profile.requiresEnemyAilment && !inactiveReason) {
    const present = Boolean(enemyAilments?.types?.some((type) => type.name === profile.requiresEnemyAilment));
    if (!present) {
      inactiveReason = `${profile.requiresEnemyAilmentNote || `its trigger needs ${profile.requiresEnemyAilment} on the target`} and the build inflicts no ${profile.requiresEnemyAilment} (enemy-ailment model: a support such as Glacial Freeze on an active skill dealing Hit Cold Damage)`;
      warnings.push(`${profile.name}: inactive — ${inactiveReason}; its hits are shown for reference and its rate is 0.`);
    }
  }

  // Modifier lines by kind, scoped later per component.
  const damageLines = [], takenLines = [], penetrationLines = [], armourPenetrationLines = [], addedLines = [], unspecifiedAdded = [], cooldownLines = [], maxLines = [], minLines = [], channelLines = [];
  // A compound "Min …, and Max …" line (Impermanence) is read as its two lines (src/skill-hit-lines.js splitHitLineText).
  for (const line of modifierTexts.flatMap((item) => { const parts = splitHitLineText(item.text); return parts.length > 1 ? parts.map((text) => ({ ...item, text, compoundText: item.text })) : [item]; })) {
    const channelParsed = channel ? classifyChannelLine(line.text) : null;
    if (channelParsed) { channelLines.push({ ...channelParsed, source: line.source, text: line.text, origin: line.origin, value: channelParsed.value * (line.multiplier ?? 1) }); continue; }
    const parsed = classifyHitLine(line.text, { targetCursed, enemyAilments });
    if (!parsed) continue;
    const scaled = (value) => value * (line.multiplier ?? 1);
    const entry = { source: line.source, text: line.text, origin: line.origin };
    if (parsed.kind === "damage") damageLines.push({ ...entry, value: scaled(parsed.value), layer: parsed.layer, scope: parsed.scope, condition: parsed.condition, category: parsed.layer === "increased" ? "Increased damage" : "Additional damage" });
    else if (parsed.kind === "maxDamage") maxLines.push({ ...entry, value: scaled(parsed.value), scope: parsed.scope, category: "Additional Max Damage" });
    // "+X% additional [<scope>] Min Damage" (Impermanence, 2026-10-14; user-supplied reading, provisional): the lower roll only.
    else if (parsed.kind === "minDamage") minLines.push({ ...entry, value: scaled(parsed.value), scope: parsed.scope, category: "Additional Min Damage" });
    // Enemy damage taken: the planner's derived curse lines, or a typed positive line. Untyped or negative
    // "damage taken" lines on gear are the character's own defence (e.g. "-30% additional damage taken").
    else if (parsed.kind === "taken") { if (line.origin === "derived" || (parsed.value > 0 && parsed.scope.damageTypes)) takenLines.push({ ...entry, value: scaled(parsed.value), layer: parsed.layer, scope: parsed.scope, category: parsed.layer === "additional" ? "Additional damage taken" : "Increased damage taken" }); }
    else if (parsed.kind === "penetration") penetrationLines.push({ ...entry, value: scaled(parsed.value), damageTypes: parsed.damageTypes, category: "Penetration" });
    else if (parsed.kind === "armourPenetration") armourPenetrationLines.push({ ...entry, value: scaled(parsed.value), category: "Armor DMG Mitigation Penetration" });
    else if (parsed.kind === "added") { if (parsed.to === "spells") addedLines.push({ ...entry, type: parsed.type, min: scaled(parsed.min), max: scaled(parsed.max) }); else if (parsed.to === "unspecified") unspecifiedAdded.push(entry); }
    else if (parsed.kind === "cooldownRecovery") cooldownLines.push({ ...entry, value: scaled(parsed.value), additional: parsed.additional });
  }
  // Curse models the planner resolves itself (Scorch) and the skill's own hit debuffs (Blizzard) arrive as typed lines.
  const typedTaken = (line, origin) => ({ source: line.source, text: line.text, origin, value: line.value, layer: line.layer || "additional", scope: { damageTypes: line.types ? new Set(line.types) : null, skillTags: null, hitOnly: false }, category: "Additional damage taken" });
  for (const line of extraTaken) takenLines.push(typedTaken(line, "derived"));
  for (const line of profile.selfDebuffTaken || []) takenLines.push(typedTaken({ ...line, source: `${profile.name}: hit debuff` }, "skill"));
  for (const line of unspecifiedAdded) warnings.push(`${line.source}: "${line.text}" names no skill type (Spells / Attacks), so it is not added to ${profile.name}.`);
  addedLines.push(...supports.added.map((line) => ({ ...line, origin: "support" })));
  // Attack skills: "Adds X–Y <Type> Damage to Attacks [and Spells]" and the weapon model's handedness lines
  // ("+X% additional damage for Main-Hand Weapons", "… when holding a Two-Handed Weapon", "… while Dual Wielding").
  if (attackProfile && weapon) addedLines.push(...weapon.addedToAttacks.map((line) => ({ source: line.source, text: line.text, origin: line.origin, type: line.type, min: line.min, max: line.max })));
  const weaponAdditional = attackProfile && weapon ? weapon.additional.map((line) => ({ ...line, category: "Additional damage" })) : [];
  const weaponIncreased = attackProfile && weapon ? weapon.increased.map((line) => ({ ...line, category: "Increased damage" })) : [];

  // Channel stacks (channel skills): base max from the Split struct + supports + build lines; the channel is held at
  // max stacks (own buffs pre-built), so per-stack cadences read the full count. The skill's own and the build's
  // per-additional-max-stack lines scale with the stacks above the base.
  const channelState = (() => {
    if (!channel) return null;
    const base = profile.channel?.baseMaxStacks ?? 5;
    const sources = [...supports.maxStacks, ...channelLines.filter((line) => line.kind === "maxStacks").map((line) => ({ source: line.source, text: line.text, value: line.value }))];
    const maxStacks = base + sum(sources);
    const additionalMaxStacks = Math.max(0, maxStacks - base);
    const increased = channelLines.filter((line) => line.kind === "increased").map((line) => ({ source: line.source, text: line.text, origin: line.origin, value: line.value, category: "Increased damage" }));
    increased.push(...channelLines.filter((line) => line.kind === "perStackIncreased").map((line) => ({ source: line.source, text: `${line.text} (${additionalMaxStacks} additional)`, origin: line.origin, value: line.value * additionalMaxStacks, category: "Increased damage" })));
    const additional = channelLines.filter((line) => line.kind === "perStackAdditional").map((line) => ({ source: line.source, text: `${line.text} (${additionalMaxStacks} additional)`, origin: line.origin, value: line.value * additionalMaxStacks / line.per, category: "Additional damage" }));
    const own = profile.channel?.perAdditionalMaxStackAdditionalPercent;
    if (own) additional.push({ source: `${profile.name}: additional Max Channeled Stacks`, text: `+${own}% additional damage for every +1 additional Max Channeled Stack(s) (${additionalMaxStacks} additional; TLIDB skill text)`, origin: "skill", value: own * additionalMaxStacks, category: "Additional damage" });
    return { baseMaxStacks: base, baseMaxSource: profile.channel?.baseMaxSource || null, maxStacks, additionalMaxStacks, fullStacks: maxStacks, sources, increased, additional: additional.filter((line) => line.value !== 0) };
  })();

  // Use rate (before the components: tick intervals scale with cast speed). Attack skills (speed type "attack-speed")
  // use the weapon model's attacks-per-second factor, the supports' "Attack and Cast Speed" lines and the skill's own
  // "+X% additional Attack Speed for this skill" line instead of the cast-speed total.
  const speedType = timing?.speedType || "cast-speed";
  // Attack skills (B3): the supports' increased Attack Speed joins the weapon model's increased pool and their additional
  // lines multiply (manual: speed is calculated like Critical Strike Rating, Σ non-additional × Π additional); without
  // the weapon model's breakdown (direct calls) they multiply separately. Spells keep the separate support factor.
  // Multistrike (Attack skills; the sequence model below): whether this skill can Multistrike decides the speed lines that act
  // "when performing Multistrikes".
  const multistrikeChance = sum(supports.effects.multistrike.filter((line) => line.kind === "chance"));
  const multistrikeIncrement = sum(supports.effects.multistrike.filter((line) => line.kind === "increment"));
  const canMultistrike = speedType === "attack-speed" && !channel && !profile.sentry && !skillTags.has("Mobility") && multistrikeChance > 0;
  // "+X% [additional] Attack Speed when performing Multistrikes" (Bladerunner talent, rank multiplier applied; 2026-10-14): active
  // for an attacking skill that can Multistrike, on that skill's attack speed only. Read as the whole sequence's attack speed
  // (best case); whether it covers only the repeat attacks is not sourced (provisional).
  const multistrikeSpeedLines = canMultistrike ? modifierTexts.flatMap((line) => {
    const match = normalizePercentageText(String(line.text || "")).replace(/\s+/g, " ").trim().match(MULTISTRIKE_SPEED_LINE);
    return match ? [{ source: line.source, text: `${line.text} (${profile.name} can Multistrike; whole sequence, provisional)`, origin: line.origin, value: Number(match[1]) * (line.multiplier ?? 1), additional: Boolean(match[2]) }] : [];
  }) : [];
  const supportIncreasedSpeed = sum(supports.castSpeed.filter((line) => !line.additional)) + sum(multistrikeSpeedLines.filter((line) => !line.additional));
  const supportAdditionalSpeed = product(supports.castSpeed.filter((line) => line.additional)) * product(multistrikeSpeedLines.filter((line) => line.additional));
  const pooledAttackSpeed = speedType === "attack-speed" && attackSpeed && Number.isFinite(attackSpeed.increasedPercent) && Number.isFinite(attackSpeed.weaponAttacksPerSecond) && (attackSpeed.factor || 0) > 0;
  const supportSpeedFactor = pooledAttackSpeed
    ? Math.max(0, 1 + (attackSpeed.increasedPercent + supportIncreasedSpeed) / 100) / Math.max(1e-9, 1 + attackSpeed.increasedPercent / 100) * supportAdditionalSpeed
    : Math.max(0, 1 + supportIncreasedSpeed / 100) * supportAdditionalSpeed;
  const ownSpeedLine = speedType === "attack-speed" && profile.attackSpeed?.additionalPercent ? { source: `${profile.name}: own Attack Speed`, text: `+${profile.attackSpeed.additionalPercent}% additional Attack Speed for this skill (${profile.attackSpeed.source || "skill text"})`, value: profile.attackSpeed.additionalPercent, additional: true } : null;
  const speedFactor = speedType === "attack-speed" ? Math.max(0.0001, attackSpeed?.factor ?? 1) * supportSpeedFactor * (ownSpeedLine ? 1 + ownSpeedLine.value / 100 : 1) : Math.max(0.0001, castSpeed.factor || 1) * supportSpeedFactor;
  const baseUseTime = profile.cycle?.useTimeSeconds ?? timing?.useTimeSeconds ?? null;
  const useTime = baseUseTime != null ? baseUseTime / (speedType === "cast-speed" || speedType === "attack-speed" ? speedFactor : 1) : null;
  const cooldownRecovery = [...cooldownLines, ...supports.cooldown];
  const cooldownFactor = Math.max(0.0001, 1 + sum(cooldownRecovery.filter((line) => !line.additional)) / 100) * product(cooldownRecovery.filter((line) => line.additional));
  // A hero's flat cooldown reduction on events (Clockwork Core: -0.1 s per crit) as a divisor of the cooldown.
  const effectiveCooldown = timing?.cooldownSeconds > 0 ? timing.cooldownSeconds / cooldownFactor / Math.max(1, timing.charges || 1) / Math.max(1, heroEffects?.cooldownFactor || 1) : 0;
  const terra = profile.useModel?.kind === "terra" ? profile.useModel : null;
  // Triggered use model (Activation Mediums: interval / always / Boss / Elite within reach of the dummy). Manual "Cast",
  // "Use", "Trigger": a triggered skill "generates skill effects directly without any action", so it has no use time.
  // Rate: one use per max(trigger interval, effective cooldown[, Terra duration: one ground effect at a
  // time]). Modeled as triggered only (best case: no manual casts, so "-X% additional damage for manually used Supported
  // Skill" does not apply); a skill the medium cannot trigger here (channel, rate-driven, combo) is used and takes it.
  // Wind Rhythm: its share of the Cast Speed bonus shortens the trigger cooldown (interval ÷ (1 + share × bonus); provisional).
  // 1 / max(interval, effective cooldown) is user-confirmed 2026-10-12 (Q2): Frost Shield with Activation Medium: Boss (T1,
  // 11 m, Duration +13%, no Cooldown Recovery line) fires every 6 s, its cooldown, and a Cooldown Recovery roll on the medium
  // lowers the skill's cooldown. The Terra-duration cap, the first use at the first trigger and Wind Rhythm's share stay provisional.
  const sentry_ = Boolean(profile.sentry);
  const triggerLine = !channel && !rateModel && !release && !profile.cycle && !inactiveReason ? supports.triggers[0] || null : null;
  const castBonus = Math.max(0, (speedType === "cast-speed" ? castSpeed.factor || 1 : speedFactor) - 1);
  // Activation Medium: Multistrike (2026-10-14): one trigger per Max Multistrike Count event of the build's multistriking hits
  // (the planner's hit pass: multistrikeEventsPerSecond), at most one per the medium's interval; before the rate is measured
  // the medium's interval (best case for that pass); no events, no trigger (the skill is used manually).
  const maxMultistrikeInterval = triggerLine?.kind === "maxMultistrike" ? (multistrikeEventsPerSecond == null ? triggerLine.interval : multistrikeEventsPerSecond > 0 ? Math.max(triggerLine.interval, 1 / multistrikeEventsPerSecond) : null) : undefined;
  const triggerInterval = maxMultistrikeInterval !== undefined ? maxMultistrikeInterval : triggerLine?.interval > 0 ? (triggerLine.castSpeedScaled ? castSpeedScaledTriggerInterval(triggerLine.interval, { share: supports.castSpeedShare ?? 0, castIncreasedPercent: castBonus * 100 }) : triggerLine.interval) : null;
  const triggered = triggerInterval > 0;
  if (triggered) {
    supports.additional.push(...supports.triggeredAdditional);
    notes.push(`${profile.name}: triggered by ${triggerLine.source.replace(/^Support: /, "")} every ${round(triggerInterval)} s (no use time); uses per second = 1 / max(${round(triggerInterval)} s, cooldown ${round(effectiveCooldown)} s${terra ? `, Terra ${terra.durationSeconds} s` : ""}) — user-confirmed 2026-10-12 (Q2: Frost Shield + Boss every 6 s, its cooldown)${terra ? "; the Terra-duration cap is provisional" : ""}. Only triggered uses are modeled, so the manual-use penalty does not apply.`);
  } else if (supports.manualPenalty.length) {
    supports.additional.push(...supports.manualPenalty);
    notes.push(`${profile.name}: no Activation Medium trigger applies to this skill here, so its uses are manual and take ${supports.manualPenalty.map((line) => `${line.value}%`).join(", ")} additional damage.`);
  }
  const intervalSeconds = triggered ? Math.max(triggerInterval, effectiveCooldown, terra?.durationSeconds || 0) : rateModel ? (rateModel.usesPerSecond > 0 ? 1 / rateModel.usesPerSecond : null) : release && useTime != null ? useTime * (channelState?.fullStacks ?? 5) : useTime != null ? Math.max(useTime, effectiveCooldown, terra?.durationSeconds || 0) : null;
  // Multistrike (Attack skills; TLIDB glossary: "Chance to perform an additional attack … If the chance exceeds 100%, one
  // additional attack will be performed with every 100% of the chance. +20% Attack Speed during Multistrikes … Mobility,
  // Channeled Skills, and Sentry skills cannot Multistrike"). Expected extra attacks E = chance ÷ 100 (whole attacks plus the
  // remainder as a chance of one more); the k-th Multistrike deals +k × increment% (the Multistrike Count rises by one per
  // attack; provisional reading of "increasing damage"); a cycle lasts 1 + E ÷ 1.2 attack intervals. Provisional.
  // Thunder Slash: Steep Strike chance → additional Multistrike damage increment (steepStrikeState), its own ledger line.
  const skillIncrementAdditionalPercent = canMultistrike ? steepStrike?.incrementAdditionalPercent || 0 : 0;
  const plainMultistrike = canMultistrike ? multistrikeSequence({ chancePercent: multistrikeChance, incrementPercent: multistrikeIncrement }) : null;
  const multistrike = canMultistrike ? multistrikeSequence({ chancePercent: multistrikeChance, incrementPercent: multistrikeIncrement, skillIncrementAdditionalPercent }) : null;
  if (multistrike) {
    supports.additional.push({ source: "Multistrike (supports)", text: `Multistrikes: ${round(plainMultistrike.expectedExtraAttacks)} extra attacks per attack at +${multistrikeIncrement}% increasing damage each; average ×${round(plainMultistrike.averageDamageFactor)} per strike (provisional)`, value: (plainMultistrike.averageDamageFactor - 1) * 100, category: "Additional damage" });
    if (skillIncrementAdditionalPercent) supports.additional.push({ source: `${profile.name}: Steep Strike chance → Multistrike damage increment`, text: `+${steepStrike.perChance}% additional Multistrike damage increment per +1% Steep Strike chance × ${round(steepStrike.chancePercent)}% = +${round(skillIncrementAdditionalPercent)}%: increment ${multistrikeIncrement}% → ${round(multistrike.effectiveIncrementPercent)}% (TLIDB skill text; manual 1001020126; one additive pool with Cat's Scratch: user-supplied answer 2026-10-14; provisional)`, value: (multistrike.damagePerCycle / plainMultistrike.damagePerCycle - 1) * 100, category: "Additional damage" });
    notes.push(`${profile.name}: Multistrike ${multistrikeChance}% → ${round(multistrike.expectedExtraAttacks)} extra attacks per attack (TLIDB glossary), cycle ${round(multistrike.cycleIntervals)} attack intervals (+20% Attack Speed during Multistrikes), strikes ×${round(multistrike.rateFactor)} per second; increasing damage read as +${multistrikeIncrement}% × count (provisional).`);
    // Hero states on the sequence (Erika: Stalker, initial Multistrike Count, Hunting Instinct; src/erika-wind-stalker.js): each
    // step's expected damage per sequence over the previous step's, as its own additional-damage line (the working).
    const base = { chancePercent: multistrikeChance, incrementPercent: multistrikeIncrement, skillIncrementAdditionalPercent };
    let previous = multistrike.damagePerCycle;
    for (const step of multistrikeEffects?.steps || []) {
      const damage = multistrikeStatesDamage(base, step.states);
      if (previous > 0 && Math.abs(damage / previous - 1) > 1e-12) supports.additional.push({ source: step.source, text: step.text, value: (damage / previous - 1) * 100, category: "Additional damage" });
      previous = damage;
    }
    if (multistrikeEffects?.steps?.length) {
      multistrike.heroDamagePerCycle = previous;
      multistrike.heroFactor = previous / multistrike.damagePerCycle;
    }
  }
  // Thunder Slash's stored Steep Strike attempts (steepStrikeState / steepAttemptShare; user-supplied mechanism 2026-10-14,
  // provisional; per-attack check and Big Stride's held window confirmed by a user-supplied answer 2026-10-15): 1 per 2 repeat
  // attacks, or every use inside Big Stride's window while Moved recently holds.
  if (steepStrike?.multistrikeAttempts) {
    const attempts = steepAttemptShare({ multistrike, perRepeats: steepStrike.multistrikeAttempts.perRepeats || 2, window: Boolean(steepStrike.window) && movedRecently, ownRepeatsPerUse: steepStrike.multistrikeAttempts.ownRepeatsPerUse || 0 });
    Object.assign(steepStrike, { share: attempts.share, attempts });
    notes.push(`${profile.name}: Steep Strike attempts (user-supplied mechanism 2026-10-14, provisional): 1 per ${steepStrike.multistrikeAttempts.perRepeats || 2} repeat attacks; ${round(attempts.repeatsPerUse)} repeat attacks per use (${multistrike ? `Multistrike ${round(multistrike.expectedExtraAttacks)} per sequence ÷ ${round(1 + multistrike.expectedExtraAttacks)} attacks` : "no Multistrike model: the skill's own repeated-sweep reading"}) → min(1, ${round(attempts.repeatsPerUse)} ÷ ${steepStrike.multistrikeAttempts.perRepeats || 2}) = ${round(attempts.fromRepeats)} Steep Strikes per use (0.1 before 2026-10-14)${steepStrike.window ? movedRecently ? `; ${steepStrike.window.source.replace(/^Support: /, "")}: every use within ${steepStrike.window.seconds} s after moving ${steepStrike.window.meters} m is a Steep Strike, the window held open while Moved recently is on (user-supplied reading, best case) → 1 per use` : `; ${steepStrike.window.source.replace(/^Support: /, "")}: Moved recently is off, so its window is closed` : ""}. Each Steep Strike replaces that use's Sweep Slash.${steepStrike.clusterHits > 0 ? ` ${steepStrike.extraAttempts.map((line) => line.source.replace(/^Support: /, "")).join(", ")}: each launched Steep Strike generates ${steepStrike.clusterHits} additional Steep Strikes on the same target → Steep Strike hits × ${1 + steepStrike.clusterHits} (no attempt spent, no Multistrike added; user-supplied answer 2026-10-15, provisional).` : ""}`);
  }
  // Spell Burst (game manual, pasted by the user 2026-10-12; sourced): "When Spell Burst is fully charged, casting a Spell
  // Skill will activate Spell Burst, which will consume all stacks of Spell Burst charged and automatically cast the Spell
  // Skill the same number of times as the number of stacks consumed." "Skills that are cast by Spell Burst, skills with a
  // cooldown, Summon Skills, Sentry Skills, Channel Skills, and Triggered Skills cannot activate Spell Burst." "The Spell
  // Skill that activates the Spell Burst is considered a skill cast by Spell Burst." "Spell Burst can only be cast when Max
  // Spell Burst is no lower than 1." Full charge time: spellBurstChargeTime. Per activation: the activating cast plus N
  // automatic casts (N = Max Spell Burst; a full charge holds that many stacks); all 1 + N are cast by Spell Burst, so
  // "… cast by Spell Burst" lines raise them all. Activations per second = 1 / max(full charge time, use interval).
  // User-confirmed 2026-10-12 (listed in the recount assumptions): the N automatic casts neither take up nor add to manual
  // cast time; the activation period is max(charge time, use interval), not rounded up to a whole number of use intervals.
  // Combo-cycle skills stay out (user-confirmed 2026-10-12: Combo skills cannot Spell Burst); rate-model skills stay out (user-confirmed 2026-10-12 for Corrosion Focus; the other rate-model skills follow by the same reading). The automatic casts cannot activate Spell Burst
  // again (manual), so they add no activations.
  const maxSpellBurst = modifierTexts.reduce((total, line) => { const match = String(line.text).match(/^\+(\d+) Max Spell Burst$/i); return total + (match ? Number(match[1]) * (line.multiplier ?? 1) : 0); }, 0);
  const spellBurstStacks = Math.floor(maxSpellBurst);
  const spellBurstBlock = !skillTags.has("Spell") ? "it is not a Spell Skill"
    : timing?.cooldownSeconds > 0 ? "it has a cooldown" : triggered ? "it is a Triggered Skill (cast by an Activation Medium)"
    : channel ? "it is a Channel Skill" : sentry_ ? "it is a Sentry Skill" : skillTags.has("Summon") ? "it is a Summon Skill"
    : rateModel ? "its uses come from a rate model, not casts (user-confirmed for Corrosion Focus)" : profile.cycle ? "it is a Combo skill (user-confirmed: Combo skills cannot Spell Burst)" : heroEffects?.spellBurstBlock || null;
  // A hero's trigger component on top of (or, with `manualCasts: false`, instead of) the skill's own (manual) uses: `heroEffects.triggerComponent.perInterval` uses per
  // casting interval (Clockwork Core: Max Tangle Quantity Tangle triggers, × I Will Hunt You Down's Core Cast Speed while the
  // Vault is up; user-supplied answers 2026-10-18). Those uses are Triggered casts: they never activate Spell Burst.
  const heroTrigger = heroEffects?.triggerComponent && Number.isFinite(heroEffects.triggerComponent.perInterval) && heroEffects.triggerComponent.perInterval > 0 ? heroEffects.triggerComponent : null;
  const heroTriggerUsesPerSecond = heroTrigger && intervalSeconds > 0 && !inactiveReason ? heroTrigger.perInterval / intervalSeconds : 0;
  const spellBurstCharge = spellBurstChargeTime([...modifierTexts, ...supports.effects.spellBurst.filter((line) => line.kind === "chargeIncreased" || line.kind === "chargeAdditional")
    .map((line) => ({ source: line.source, text: `${line.value}% ${line.kind === "chargeAdditional" ? "additional " : ""}Spell Burst Charge Speed` }))]);
  const canSpellBurst = !spellBurstBlock && spellBurstStacks >= 1 && intervalSeconds > 0 && Number.isFinite(spellBurstCharge.seconds);
  if (spellBurstStacks >= 1 && skillTags.has("Spell") && spellBurstBlock) notes.push(`${profile.name}: cannot activate Spell Burst: ${spellBurstBlock}${/provisional/.test(spellBurstBlock) ? "" : spellBurstBlock === heroEffects?.spellBurstBlock ? ` (${heroEffects.spellBurstBlockSource || "trait text"})` : " (game manual)"}.`);
  const spellBurst = canSpellBurst ? (() => {
    const activationsPerSecond = 1 / Math.max(spellBurstCharge.seconds, intervalSeconds);
    const extraUsesPerSecond = spellBurstStacks * activationsPerSecond;
    const burstCastsPerSecond = (1 + spellBurstStacks) * activationsPerSecond;
    const bonusLines = [...supports.effects.spellBurst.filter((line) => line.kind === "hitAdditional").map((line) => ({ source: line.source, text: line.text, value: line.value })),
      ...modifierTexts.map((line) => { const match = String(line.text).match(/^\+?(\d+(?:\.\d+)?)% additional Hit Damage for skills cast by Spell Burst$/i); return match ? { source: line.source, text: line.text, value: Number(match[1]) * (line.multiplier ?? 1) } : null; }).filter(Boolean)];
    const bonusFactor = product(bonusLines);
    // A hero's separate trigger component (Clockwork Core's Tangle triggers) adds uses that never burst: the share is of all uses.
    const share = burstCastsPerSecond / (1 / intervalSeconds + extraUsesPerSecond + heroTriggerUsesPerSecond);
    return { maxSpellBurst: spellBurstStacks, fullChargeSeconds: spellBurstCharge.seconds, chargeSpeed: spellBurstCharge, castsPerActivation: 1 + spellBurstStacks, automaticCastsPerActivation: spellBurstStacks, activationsPerSecond, extraUsesPerSecond, burstCastsPerSecond, bonusLines, bonusFactor, share, rateFactor: 1 + extraUsesPerSecond * intervalSeconds, averageDamageFactor: 1 + share * (bonusFactor - 1) };
  })() : null;
  if (spellBurst) {
    if (spellBurst.averageDamageFactor !== 1) supports.additional.push({ source: "Spell Burst casts", text: `${round(spellBurst.share * 100)}% of casts are cast by Spell Burst (the activating cast + ${spellBurstStacks} automatic, game manual) at ×${round(spellBurst.bonusFactor)} (${spellBurst.bonusLines.map((line) => line.text).join("; ")}); average ×${round(spellBurst.averageDamageFactor)}`, value: (spellBurst.averageDamageFactor - 1) * 100, category: "Additional damage" });
    notes.push(`${profile.name}: Spell Burst ${spellBurstStacks} stack(s), fully charged in ${round(spellBurst.fullChargeSeconds)} s = 2 s ÷ ${round(1 + spellBurstCharge.increasedPercent / 100)} ÷ ${round(spellBurstCharge.additionalFactor)} (game manual), activated every ${round(1 / spellBurst.activationsPerSecond)} s = max(charge time, use interval ${round(intervalSeconds)} s); each activation is the activating cast + ${spellBurstStacks} automatic cast(s), all cast by Spell Burst (game manual); +${round(spellBurst.extraUsesPerSecond)} casts per second without player time (user-confirmed 2026-10-12: automatic casts take no manual cast time; the period is not rounded; additional Charge Speed shortens the charge).`);
  }
  const rateFactor = multistrike?.rateFactor ?? spellBurst?.rateFactor ?? 1;
  // A hero's use-rate factor (Clockwork Core: every attached Tangle triggers the skill; I Will Hunt You Down's Cast Speed).
  const heroRateFactor = Number.isFinite(heroEffects?.rateFactor) && heroEffects.rateFactor > 0 ? heroEffects.rateFactor : 1;
  // A hero trigger component with `manualCasts: false` replaces the player's own casts as a hit source (Clockwork Core: the
  // player's cast only summons or moves the Core and fires nothing; user-decided 2026-10-18 from game-code evidence,
  // research/youga-recall-mechanics-2026-10-18.md R1), so only the trigger component deals hits.
  const manualHits = !(heroTrigger && heroTrigger.manualCasts === false);
  const manualUsesPerSecond = manualHits && intervalSeconds > 0 && !inactiveReason ? rateFactor * heroRateFactor / intervalSeconds : 0;
  const usesPerSecond = manualUsesPerSecond + heroTriggerUsesPerSecond;
  // The two rate components, kept apart for the working (Clockwork Core triggers vs manual casts).
  const rateComponents = heroTrigger ? [
    ...(manualHits ? [{ key: "manual", label: heroTrigger.manualLabel || "manual casts", usesPerSecond: manualUsesPerSecond }] : []),
    { key: "trigger", label: heroTrigger.label || "hero triggers", usesPerSecond: heroTriggerUsesPerSecond, perInterval: heroTrigger.perInterval }
  ] : null;
  if (heroRateFactor !== 1 || heroEffects?.rateNote) notes.push(`${profile.name}: ${heroEffects.rateNote || "hero use-rate factor"}${heroRateFactor !== 1 ? ` (uses × ${round(heroRateFactor)})` : ""}.`);
  if (rateComponents) notes.push(manualHits
    ? `${profile.name}: uses per second = ${round(manualUsesPerSecond)} ${rateComponents[0].label} + ${round(heroTriggerUsesPerSecond)} ${rateComponents[1].label} (${round(heroTrigger.perInterval)} per casting interval of ${round(intervalSeconds)} s) = ${round(usesPerSecond)}.`
    : `${profile.name}: uses per second = ${round(heroTriggerUsesPerSecond)} ${rateComponents[0].label} (${round(heroTrigger.perInterval)} per casting interval of ${round(intervalSeconds)} s); ${heroTrigger.manualNote || "the player's own casts deal no hits"}.`);
  // Sequences per second and the Max Multistrike Count events they reach (Erika's Stalker / Hunting Instinct read them).
  if (multistrike) {
    multistrike.sequencesPerSecond = usesPerSecond / (1 + multistrike.expectedExtraAttacks);
    multistrike.maxCountEventsPerSecond = multistrike.sequencesPerSecond * multistrike.maxCountEventsPerCycle;
  }
  // Demolisher Charge (Charged Pummel, Savage Charge: "gains Demolisher Charge once every 3 s"): the share of release
  // cycles that consume a charge, min(1, cycle ÷ 3 s) (expected-value reading; the charge is assumed banked at most once).
  const demolisherShare = profile.demolisher && intervalSeconds > 0 ? Math.min(1, intervalSeconds / profile.demolisher.everySeconds) : 0;
  // First use: the opening cast completes after its use time (a cooldown- or Terra-bound skill does not wait a whole
  // interval first). Flame Jet Lv16 dummy run 2026-10-11: the 21 s average (121) sits near the steady figure, so damage
  // starts with the first cast, not one interval in. A rate-model skill waits for its first trigger; a release channel's
  // first cycle lands after its full channel.
  // A triggered skill's first use lands at its first trigger (one trigger interval in; provisional).
  const firstUseSeconds = triggered ? triggerInterval : rateModel ? rateModel.firstUseSeconds ?? intervalSeconds : release ? intervalSeconds : useTime != null ? useTime : null;
  if (terra) notes.push(`${profile.name}: ${terra.note}`);
  if (profile.demolisher) notes.push(`${profile.name}: Demolisher Charge once every ${profile.demolisher.everySeconds} s (TLIDB); ${round(demolisherShare * 100)}% of ${release ? "release cycles" : "uses"} (${round(intervalSeconds || 0)} s each) consume one (expected-value reading, provisional).`);
  if (speedType === "attack-speed" && attackSpeed) notes.push(`${profile.name}: ${attackSpeed.note}`);
  if (channel) notes.push(`${profile.name}: ${channel.note}`);
  if (rateModel) notes.push(`${profile.name}: ${rateModel.note}`);
  if (profile.cycle) notes.push(`${profile.name}: ${profile.cycle.note}`);
  if (timing && timing.agreesWithTlidb === false && timing.tlidbCastSeconds) warnings.push(`${profile.name}: game use time ${timing.useTimeSeconds} s differs from TLIDB's ${timing.tlidbCastSeconds} s; the game value is used.`);
  if (timing && speedType === "fixed" && !rateModel) notes.push(`${profile.name}: its use time is not scaled by Cast Speed (game speed type "fixed").`);
  if (!timing && !rateModel) warnings.push(`${profile.name}: no use time is available, so its hit rate is 0.`);
  if (timing?.charges > 1) notes.push(`${profile.name}: ${timing.charges} charges recharge in ${timing.cooldownSeconds} s each (sustained rate = charges ÷ cooldown; provisional reading of cdTimes).`);

  // Sentries (profile.sentry; src/skill-hit-profiles.js / src/attack-hit-profiles.js). Manual rule 1001011723: "Sentries'
  // stats are inherited from the player, so their damage stat calculation should be the same as the player's" (no Spell
  // Burst, no Multistrike unless the skill grants it), and rule 1001011721: a Sentry's hits count as the player's. So the
  // hit layers above are the player's; only the Sentry's own cadence differs: Cast Frequency (rule 1001011724) scales
  // the tick interval, and an Attack Sentry's base Cast Frequency is the weapon's average Attack Speed (TLIDB skill
  // text), so its interval is 1 ÷ weapon attacks per second (the build's Attack Speed bonuses do not apply to it).
  const sentry = profile.sentry || null;
  const castFrequencyLines = [];
  if (sentry) {
    for (const line of modifierTexts) {
      const parsed = classifySentryLine(line.text);
      if (!parsed) continue;
      if (parsed.conditional) { warnings.push(`${line.source}: "${line.text}" is a conditional Sentry Cast Frequency line and is not read by the ${profile.name} sentry model.`); continue; }
      castFrequencyLines.push({ source: line.source, text: line.text, origin: line.origin, value: parsed.value * (line.multiplier ?? 1), additional: parsed.additional });
    }
    // Support lines "+X% additional Cast Frequency for Sentries deployed by the supported skill" (Sentry Modification).
    castFrequencyLines.push(...supports.castFrequency.map((line) => ({ ...line, origin: "support" })));
    for (const own of sentry.castFrequency || []) castFrequencyLines.push({ source: `${profile.name}: own Cast Frequency`, text: own.text, origin: "skill", value: own.value, additional: own.additional !== false });
    // "Cast Speed bonus and 100% of additional bonus are also applied to Spell Sentries' Cast Frequency" (and the Attack
    // wording; belt blends, residual batch): the player's whole Cast / Attack Speed factor for this setup joins the Sentry's
    // Cast Frequency as one more factor (both are "calculated in the same way", manual rule 1001011724).
    const spellSentry = scopeTags.has("Spell"), attackSentry = scopeTags.has("Attack");
    for (const line of modifierTexts) {
      const match = String(line.text ?? "").replace(/\s+/g, " ").trim().match(/^(Cast|Attack) Speed bonus and (\d+(?:\.\d+)?)% of additional bonus are also applied to (Spell|Attack) Sentries' Cast Frequency$/i);
      if (!match || (match[3].toLowerCase() === "spell" ? !spellSentry : !attackSentry)) continue;
      const factor = /^Cast$/i.test(match[1]) ? castSpeed?.factor ?? 1 : attackSpeed?.factor ?? 1;
      if (factor !== 1) castFrequencyLines.push({ source: line.source, text: `${line.text} (×${round(factor)} ${match[1]} Speed; the "100% of additional bonus" share is read as the whole factor: provisional)`, origin: line.origin, value: (factor - 1) * 100, additional: true });
    }
  }
  const castFrequencyFactor = sentry ? Math.max(0.0001, 1 + sum(castFrequencyLines.filter((line) => !line.additional)) / 100) * product(castFrequencyLines.filter((line) => line.additional)) : 1;
  const weaponAttacksPerSecond = attackSpeed?.weaponAttacksPerSecond ?? null;
  if (sentry) notes.push(`${profile.name}: ${sentry.note || "the Sentry's cadence follows Cast Frequency (manual rule 1001011724), not Attack / Cast Speed"}; Cast Frequency ×${round(castFrequencyFactor)}${castFrequencyLines.length ? ` (${castFrequencyLines.map((line) => line.text).join("; ")})` : " (no Cast Frequency lines)"}.`);
  if (sentry?.weaponAttackSpeed && attackProfile && !(weaponAttacksPerSecond > 0)) warnings.push(`${profile.name}: its base Cast Frequency is the weapon's Attack Speed and no weapon Attack Speed is available, so its rate is 0.`);

  // Hits per use for a component: a number, or perTick × (duration ÷ effective interval) × shotgun falloff ÷ everyUses.
  // The tick duration is the Terra's (or sentry's) lifetime, or one effective channel interval for a channel skill.
  // Release channels: `perStack` hits land once per channel stack of the cycle, `countAtStacks(stacks)` fixes a count
  // (barrage waves), `durationAtStacks(stacks)` a tick span (Charged Pummel's Electric Field), and `demolisherGated`
  // components only land on cycles that consume a Demolisher Charge.
  const hitsFor = (component) => {
    const spec = component.perUse;
    const gate = component.demolisher?.gated ? demolisherShare : 1;
    // A component that only lands on a Cursed target (Shackles of Malice's Explosion): 0 hits on an uncursed dummy.
    if (component.requiresCursed && !targetCursed) return { hits: 0, detail: "0 per use (the dummy carries no Curse)" };
    if (typeof spec === "number") return { hits: spec * gate, detail: `${spec} per use${gate !== 1 ? ` × ${round(gate)} Demolisher share` : ""}` };
    if (spec?.perStack) { const stacks = channelState?.fullStacks ?? 5; return { hits: spec.perStack * stacks * gate, detail: `${spec.perStack} per channel stack × ${stacks} stacks per cycle` }; }
    if (spec?.countAtStacks) { const stacks = channelState?.fullStacks ?? 5; const count = spec.countAtStacks(stacks); const volley = falloffVolley(spec.falloff, nearTarget); const falloff = volley?.total ?? 1; return { hits: count * (spec.perTick ?? 1) * falloff * gate, shotgun: volley, detail: `${round(count)} at ${stacks} stacks × ${spec.perTick ?? 1} per tick${volley ? ` × ${shotgunVolleyText(volley)}` : ""}` }; }
    // A per-stack rate (Ring of Blades: one hit per blade per second, blades = channeled stacks): hits per use = stacks ×
    // rate × the effective channel interval, so the hit rate is independent of cast speed.
    if (spec?.perSecondPerStack) {
      const stacks = channelState?.fullStacks ?? 5;
      const span = channel && useTime != null ? useTime : 1;
      return { hits: spec.perSecondPerStack * stacks * span, detail: `${stacks} stacks × ${spec.perSecondPerStack} hit/s each × ${round(span)} s channel use` };
    }
    // Sentry tick specs: `intervalSeconds` may be a function of the weapon's attacks per second (Einherjar cadence);
    // `castFrequencyScaled` divides the interval by the Cast Frequency factor; `weaponAttackSpeedScaled` by the weapon's
    // base attacks per second (no weapon → no ticks).
    const rawInterval = spec?.intervalAtStacks ? spec.intervalAtStacks(channelState?.fullStacks ?? 5) : typeof spec?.intervalSeconds === "function" ? spec.intervalSeconds({ weaponAttacksPerSecond: weaponAttacksPerSecond || 0, castFrequencyFactor }) : spec?.intervalSeconds;
    const sentryDivisor = (spec?.castFrequencyScaled ? castFrequencyFactor : 1) * (spec?.weaponAttackSpeedScaled ? (weaponAttacksPerSecond || 0) : 1);
    const baseInterval = rawInterval ? (sentryDivisor > 0 ? rawInterval / sentryDivisor : Infinity) : rawInterval;
    const speedScaled = speedType === "attack-speed" ? spec?.attackSpeedScaled : spec?.castSpeedScaled;
    const interval = baseInterval ? baseInterval / (speedScaled ? speedFactor : 1) : null;
    // `durationSeconds` on the spec: a fixed span per use (Spiral Strike's dash) whose ticks follow the speed-scaled interval.
    const span = spec?.durationAtStacks ? spec.durationAtStacks(channelState?.fullStacks ?? 5) : spec?.durationSeconds ?? terra?.durationSeconds ?? (channel && !release && useTime != null ? useTime : 1);
    const ticks = interval ? span / interval : 1;
    const volley = falloffVolley(spec?.falloff, nearTarget);
    const falloff = volley?.total ?? 1;
    const everyUses = Math.max(1, spec?.everyUses || 1);
    const hits = ticks * (spec?.perTick ?? 1) * falloff / everyUses * gate;
    return { hits, shotgun: volley, detail:`${interval ? `${round(ticks)} ticks (every ${round(interval)} s${terra ? ` over ${terra.durationSeconds} s` : spec?.durationAtStacks ? ` over ${round(span)} s at ${channelState?.fullStacks ?? 5} stacks` : spec?.durationSeconds ? ` over a ${round(span)} s use` : channel ? ` per ${round(span)} s channel use` : ""}${spec?.intervalAtStacks ? ` at ${channelState?.fullStacks ?? 5} stacks` : ""})` : "1 tick"} × ${spec?.perTick ?? 1} per tick${volley ? ` × ${shotgunVolleyText(volley)}` : ""}${everyUses > 1 ? ` ÷ every ${everyUses} uses` : ""}${gate !== 1 ? ` × ${round(gate)} Demolisher share` : ""}` };
  };
  const provisionalComponents = [];

  // Components: the hit rows' typed entries plus one per added-flat type (attached to the primary component).
  // A component's Demolisher bonus ("+X% additional Hit Damage [per channeled stack] when consuming Demolisher Charge")
  // joins its additional layer at the expected share: E = hit × (1 + share × X% [× stacks]).
  // Extra projectiles from Projectile Quantity reach the single dummy only when the skill text says its projectiles can hit
  // the same enemy (src/support-effects.js projectileQuantityFalloff). A projectile volley component (falloff spec) gains the
  // projectiles and keeps its reach rule; a single-component skill's lone projectile becomes a fan of 1 + extra (manual
  // 1001011021: additional projectiles share the origin and fly at an angle), of which ceil(n / 2) reach the dummy standing
  // close, each after the first at the skill text's coefficient, else 70% (src/shotgun-effect.js: linear, Chromatic Shot
  // runs 2026-10-12; the fan count is observed there and provisional elsewhere). Every other skill keeps one projectile on one target: Ice Lances
  // Lv16 + Multiple Projectiles (user, 2026-10-12) showed one floating number per cast and only the ×1.15 additional damage.
  // A profile's own projectile rule (`projectileVolley`, from the skill's TLIDB card): its coefficient and reach, and how many
  // extra projectiles the Projectile Quantity gives (Homing Frost Bolt: 1 per +2, up to +2).
  const volleyRule = profile.projectileVolley || null;
  const projectileQuantity = sum(supports.effects.quantity.filter((line) => line.kind === "projectiles"));
  const extraProjectiles = volleyRule ? Math.min(volleyRule.maxExtra ?? Infinity, Math.floor(projectileQuantity / (volleyRule.perQuantity || 1))) : projectileQuantity;
  const falloffFactor = extraProjectiles > 0 ? (volleyRule ? volleyRule.factor : projectileQuantityFalloff(profile.name)) : null;
  const projectileTargets = falloffFactor ? base.components.filter((component) => component.perUse?.falloff || (base.components.length === 1 && component.perUse != null)) : [];
  if (extraProjectiles > 0 && !falloffFactor) notes.push(`${profile.name}: +${extraProjectiles} Projectile Quantity — the skill text does not say its projectiles can hit the same enemy, so one reaches the dummy (Ice Lances run, 2026-10-12).`);
  if (falloffFactor && !projectileTargets.length) notes.push(`${profile.name}: +${extraProjectiles} Projectile Quantity — the projectile component is not identified in this profile, so the extra projectiles are not counted.`);
  const comboAmplification = supports.effects.combo.filter((line) => line.kind === "amplification");
  // "+X% additional Steep Strike Damage" (gear, e.g. Shadowless Swordsman's Blade; user-supplied reading 2026-10-14): an
  // independent multiplier on Steep Strike hits only (the components marked steep role "steep"). The shared damage classifier
  // leaves these lines out (src/damage-line-classifier.js), so no other layer reads them.
  const steepDamageLines = steepStrike ? modifierTexts.flatMap((line) => String(line.text ?? "").split(/;|\n/).flatMap((part) => {
    const match = normalizePercentageText(part).replace(/\s+/g, " ").trim().match(/^\+?([+-]?\d+(?:\.\d+)?)% additional Steep Strike Damage\.?$/i);
    return match ? [{ source: line.source, text: `${part.trim()} (Steep Strike hits only; user-supplied reading 2026-10-14)`, value: Number(match[1]) * (line.multiplier ?? 1) }] : [];
  })) : [];
  const components = base.components.map((component) => {
    const projectileBoost = projectileTargets.includes(component);
    // Slash-Strike components follow the summed Steep Strike share (steepStrikeState; 2026-10-14).
    // Thunder Slash (stored attempts): the Steep Strike lands on `share` of uses and replaces that use's Sweep Slash, so the
    // Sweep Slash keeps its profile count less the share (1.2 − share: the profile's +20% repeated sweep stays a sweep).
    const attemptMode = Boolean(steepStrike?.attempts) && component.steep;
    const steepRole = (steepStrike?.fromChance || attemptMode) && component.steep ? component.steep : null;
    // Blade Cluster (2026-10-15): each launched Steep Strike → 1 + clusterHits Steep Strike hits (steepStrikeState).
    const clusterFactor = steepRole?.role === "steep" ? 1 + (steepStrike.clusterHits || 0) : 1;
    const steepPerUse = !steepRole ? null : attemptMode
      ? (steepRole.role === "sweep" ? Math.max(0, (typeof component.perUse === "number" ? component.perUse : 1) - steepStrike.share) : steepStrike.share * (steepRole.perSteep ?? 1) * clusterFactor)
      : (steepRole.role === "sweep" ? 1 - steepStrike.share : steepStrike.share * (steepRole.perSteep ?? 1) * clusterFactor);
    const spec = steepPerUse != null ? steepPerUse : projectileBoost && component.perUse?.falloff ? { ...component.perUse, falloff: { ...component.perUse.falloff, count: component.perUse.falloff.count + extraProjectiles } } : component.perUse;
    const steppedPerUse = hitsFor({ ...component, perUse: spec });
    const rawPerUse = !steepRole ? steppedPerUse : attemptMode
      ? { ...steppedPerUse, detail: `${steppedPerUse.detail} (${steepRole.role === "sweep" ? `${typeof component.perUse === "number" ? component.perUse : 1} − ${round(steepStrike.share)}` : `${round(steepStrike.share)}${clusterFactor !== 1 ? ` × ${clusterFactor}` : ""}`}: Steep Strikes per use from stored attempts${steepStrike.attempts.window ? ", Big Stride's window open" : ""}${clusterFactor !== 1 ? `; × ${clusterFactor} Blade Cluster hits per launched Steep Strike` : ""}; user-supplied mechanism, provisional)` }
      : { ...steppedPerUse, detail: `${steppedPerUse.detail} (${steepRole.role === "sweep" ? `1 − ${round(steepStrike.share)}` : `${round(steepStrike.share)}${(steepRole.perSteep ?? 1) !== 1 ? ` × ${steepRole.perSteep}` : ""}${clusterFactor !== 1 ? ` × ${clusterFactor}` : ""}`}: Steep Strike share min(100%, ${round(steepStrike.chancePercent)}% chance))` };
    const extraVolley = projectileBoost && !component.perUse?.falloff ? shotgunVolley({ count: extraProjectiles + 1, factor: falloffFactor, reach: volleyRule?.reach || "fan" }, { nearTarget }) : null;
    const perUse = extraVolley ? { hits: rawPerUse.hits * extraVolley.total, shotgun: extraVolley, detail: `${rawPerUse.detail} × ${shotgunVolleyText(extraVolley)} (1 + ${extraProjectiles} projectiles from supports ${volleyRule ? `by the skill's own rule: ${volleyRule.note}` : "in a fan; provisional"})` } : projectileBoost ? { ...rawPerUse, detail: `${rawPerUse.detail} (+${extraProjectiles} projectiles from supports; provisional)` } : rawPerUse;
    if (component.basis === "provisional") provisionalComponents.push(component);
    const extraAdditional = [...(component.extraAdditional || []), ...(component.steep?.role === "steep" ? steepDamageLines : [])];
    // "+X% additional Damage for every +1 Projectile Quantity of this skill" (Hound's Fangs; TLIDB skill text).
    if (profile.additionalPerProjectileQuantityPercent && projectileQuantity > 0) extraAdditional.push({ source: `${profile.name}: Projectile Quantity`, text: `+${profile.additionalPerProjectileQuantityPercent}% additional Damage for every +1 Projectile Quantity of this skill (TLIDB) × ${projectileQuantity}`, value: profile.additionalPerProjectileQuantityPercent * projectileQuantity });
    const bonus = component.demolisher;
    if (bonus && (bonus.additionalPercent || bonus.perStackAdditionalPercent) && demolisherShare > 0) {
      const stacks = channelState?.fullStacks ?? 5;
      const percent = (bonus.additionalPercent || 0) + (bonus.perStackAdditionalPercent || 0) * stacks;
      extraAdditional.push({ source: `${profile.name}: Demolisher Charge`, text: `${bonus.text || `+${percent}% additional Hit Damage when consuming Demolisher Charge`}${bonus.perStackAdditionalPercent ? ` (${bonus.perStackAdditionalPercent}% × ${stacks} stacks)` : ""} × ${round(demolisherShare)} share of cycles`, value: percent * demolisherShare });
    }
    // "+X% additional Hit Damage for every 1 Curse Effect on the enemy (multiplies)" (Shackles of Malice's Explosion): the
    // planner's count of curses on the dummy (skill curses + gear-triggered curses within the curse limit).
    if (component.additionalPerCursePercent && targetCurseCount > 0) extraAdditional.push({ source: `${profile.name}: Curse Effects on the target`, text: `+${component.additionalPerCursePercent}% additional Hit Damage for every 1 Curse Effect on the enemy (multiplies; TLIDB) × ${targetCurseCount} curse${targetCurseCount === 1 ? "" : "s"} on the dummy = ×${round(Math.pow(1 + component.additionalPerCursePercent / 100, targetCurseCount))}`, value: (Math.pow(1 + component.additionalPerCursePercent / 100, targetCurseCount) - 1) * 100 });
    // "+X% Combo Finisher Amplification for the supported skill" (Recuperation): Amplification sums with the skill's own, and the
    // Finisher's Hit Damage is additionally increased by consumed Combo Points × Amplification (game manual 1001013024;
    // src/combo-points.js: 2 consumed points read, provisional).
    // The Amplification values add up first, then one additional factor (consumed points × Σ Amplification).
    const ownIndex = extraAdditional.findIndex((line) => /Combo Finisher Amplification/.test(line.source || ""));
    if (comboAmplification.length && ownIndex >= 0) {
      const own = extraAdditional[ownIndex];
      const total = (own.amplification ?? own.value / CONSUMED_COMBO_POINTS) + sum(comboAmplification);
      extraAdditional[ownIndex] = { ...own, source: [own.source, ...comboAmplification.map((line) => line.source)].join(" + "), text: `${total}% Combo Finisher Amplification (skill ${own.amplification ?? own.value / CONSUMED_COMBO_POINTS}% + supports ${sum(comboAmplification)}%) × ${CONSUMED_COMBO_POINTS} consumed Combo Points (manual; points per Starter provisional)`, value: finisherAmplificationPercent(total), amplification: total };
    }
    return { ...component, extraAdditional, hitsPerUse: perUse.hits, hitsDetail: perUse.detail, shotgun: perUse.shotgun ? { ...perUse.shotgun, extraProjectiles: projectileBoost ? extraProjectiles : 0 } : null, added: { min: 0, max: 0 }, addedSources: [] };
  });
  // Recalled hits (src/youga-ultimate-one.js; provisional): the recalling hit group (its typed parts share a strike key) lands
  // again `hitsFactor` times per use on average, as its own strike, with the Recalled-only lines. Added flat damage and
  // conversions reach it like the group it copies.
  // Each Recall is a full-damage fresh hit (user-supplied 2026-10-18; no Shotgun falloff), so it counts the projectiles that
  // reach the dummy, not the falloff-weighted hits: a 3-bolt fan at 60% falloff lands 2.2 weighted hits but Recalls 3 bolts.
  // Before 2026-10-18 the Recalled group copied the weighted count (2.2 × Recalls), contradicting that reading.
  const recall = heroEffects?.recall;
  if (recall?.hitsFactor > 0) {
    const group = components.filter((component) => !component.addedOnly && (component.strikeKey ?? component.componentKey) === recall.strikeKey);
    for (const component of group) {
      const key = `${component.componentKey}:recall`;
      const projectiles = recalledProjectilesPerUse(component);
      components.push({ ...component, componentKey: key, strikeKey: `${component.strikeKey ?? component.componentKey}:recall`, label: `${component.label} (Recalled)`, hitsPerUse: projectiles * recall.hitsFactor, hitsDetail: `${round(projectiles)}${component.shotgun?.total > 0 ? ` projectile${projectiles === 1 ? "" : "s"} reaching the dummy (no Shotgun falloff on a Recall)` : ""} × ${round(recall.hitsFactor)} Recalls per use (${round(recall.recallsPerProjectile)} per projectile × ${round(recall.shareOfUses * 100)}% of uses inside Stasis Vault; provisional)`, shotgun: null, recalled: true, extraAdditional: [...(component.extraAdditional || []), ...(recall.additional || [])], added: { min: 0, max: 0 }, addedSources: [] });
    }
    if (group.length && recall.note) notes.push(`${profile.name}: ${recall.note}.`);
  }
  const primaryComponent = components[0] || null;
  for (const line of addedLines) {
    let targets = components.filter((item) => item.type === line.type && !item.addedOnly);
    if (!targets.length) {
      const extra = { componentKey: `added:${line.type}`, label: `Added ${line.type} damage`, type: line.type, originalType: line.type, min: 0, max: 0, converted: false, effectiveness: primaryComponent?.effectiveness ?? 100, hitsPerUse: primaryComponent?.hitsPerUse ?? 1, hitsDetail: primaryComponent?.hitsDetail || "", basis: primaryComponent?.basis || "text", extraAdditional: primaryComponent?.extraAdditional || [], source: "added flat damage", added: { min: 0, max: 0 }, addedSources: [], addedOnly: true };
      components.push(extra); targets = [extra];
    }
    for (const component of targets) {
      const effectiveness = Number.isFinite(component.effectiveness) ? component.effectiveness / 100 : 1;
      component.added.min += line.min * effectiveness; component.added.max += line.max * effectiveness;
      component.addedSources.push({ source: line.source, text: line.text, min: line.min, max: line.max, value: (line.min + line.max) / 2, effectiveness: component.effectiveness });
    }
  }
  for (const component of provisionalComponents) warnings.push(`${profile.name}: ${component.label} — hits per use are a best-case assumption (${component.note}).`);

  // Support conversion and "added as" (hit damage only; manual "Damage Over Time": conversion or addition of the damage
  // type does not affect DoT). "Adds X% of <A> Damage as <B> Damage" (provisional reading): an extra <B> component worth
  // X% of each <A> component's roll (base + added flat), taken before conversion. Conversion (manual "Conversion of the
  // Type of Damage Dealt"): lower to higher only, in the order Physical → Lightning → Cold → Fire → Erosion; more than 100%
  // from one type is scaled down by weight. Converted damage keeps its origin (user-stated 2026-10-12, Q8): a converted part
  // takes the modifiers of every type in its chain (origin, intermediate and final), additional ones included, and each line
  // applies once however many of the part's types it names. Profile conversions read the same way ([originalType, type]).
  for (const line of supports.addedAs) {
    for (const component of components.filter((item) => item.type === line.from && !item.addedAs)) {
      const share = line.percent / 100;
      components.push({ ...component, componentKey: `${component.componentKey}+as:${line.to}`, label: `${component.label} (${line.percent}% of ${line.from} as ${line.to})`, type: line.to, originalType: line.from, converted: true, min: component.min * share, max: component.max * share, hands: scaleHands(component.hands, share), added: { min: component.added.min * share, max: component.added.max * share }, addedSources: [], addedOnly: true, addedAs: line, scopeTypes: [...new Set([...(component.scopeTypes || [component.originalType, component.type]), line.to])] });
      notes.push(`${profile.name}: ${line.source} — ${line.text} adds a ${line.to} part to ${component.label} (provisional reading: X% of its roll before conversion).`);
    }
  }
  for (const from of CONVERSION_ORDER) {
    const lines = supports.conversion.filter((line) => line.from === from && CONVERSION_ORDER.indexOf(line.to) > CONVERSION_ORDER.indexOf(from));
    for (const line of supports.conversion.filter((item) => item.from === from && !lines.includes(item))) warnings.push(`${line.source}: "${line.text}" converts to a lower type, which the manual does not allow; not applied.`);
    if (!lines.length) continue;
    const total = lines.reduce((sum, line) => sum + line.percent, 0);
    const scale = total > 100 ? 100 / total : 1;
    for (const component of components.filter((item) => item.type === from)) {
      const index = components.indexOf(component);
      const parts = lines.map((line) => {
        const share = line.percent * scale / 100;
        const priorTypes = component.scopeTypes || (component.converted ? [component.originalType, component.type] : [component.type]);
        return { ...component, componentKey: `${component.componentKey}>${line.to}`, label: `${component.label} (${round(line.percent * scale)}% ${from} → ${line.to})`, type: line.to, originalType: component.originalType || from, converted: true, min: component.min * share, max: component.max * share, hands: scaleHands(component.hands, share), added: { min: component.added.min * share, max: component.added.max * share }, addedSources: component.addedSources, supportConversion: line, scopeTypes: [...new Set([...priorTypes, line.to])] };
      });
      const kept = 1 - total * scale / 100;
      const remaining = kept > 1e-9 ? [{ ...component, min: component.min * kept, max: component.max * kept, hands: scaleHands(component.hands, kept), added: { min: component.added.min * kept, max: component.added.max * kept } }] : [];
      // A converted share is part of the same hit, not another hit (manual: conversion changes the damage type of Hit
      // Damage): only one piece of each split counts towards hits per use, ailment applications and on-hit triggers.
      // Before 2026-10-12 every piece counted as a hit, so a partial conversion doubled the skill's ailment applications.
      parts.forEach((part, partIndex) => { part.splitPart = remaining.length > 0 || partIndex > 0 || Boolean(component.splitPart); });
      components.splice(index, 1, ...remaining, ...parts);
    }
  }

  // Shared (type-independent) layers.
  const levelLine = level > 20 ? [{ source: `${profile.name} level ${level}`, text: `+${round((skillLevelDamageMultiplier(level) - 1) * 100)}% additional damage (TLIDB Skill Level: +10%/level 21–30, +8%/level 31+)`, value: (skillLevelDamageMultiplier(level) - 1) * 100, category: "Additional damage", origin: "skill" }] : [];
  // A Terra Charge line that only reaches "enemies on the Terra" (Corrosive Shot) applies to the Terra's DoT, not the hit.
  const terraLine = profile.terraCharge && !profile.terraCharge.dotOnly ? [{ source: `${profile.name}: Terra Charge`, text: profile.terraCharge.text, value: profile.terraCharge.value, category: "Additional damage", origin: "skill" }] : [];
  // Additional damage a granted support gives this skill (src/planner.js: Activation Medium: Terra on the Main Terra Skill).
  const grantedLines = [...(profile.grantedAdditional || []).map((line) => ({ ...line, category: "Additional damage", origin: "skill" })),
    // Hero lines on this skill (Clockwork Core's shared bonuses: src/youga-ultimate-one.js).
    ...(heroEffects?.additional || []).filter((line) => line.value).map((line) => ({ ...line, category: "Additional damage", origin: "trait" }))];
  // "X% additional damage for this skill for every +1% Attack Speed" (Gale Slash): the build's increased Attack Speed
  // total from the weapon model (additional Attack Speed lines are not counted: provisional reading of "bonuses").
  const speedBonusLine = profile.additionalPerAttackSpeedPercent && attackSpeed ? [{ source: `${profile.name}: Attack Speed bonus`, text: `+${profile.additionalPerAttackSpeedPercent}% additional damage for this skill for every +1% Attack Speed (TLIDB) × ${round(Math.max(0, attackSpeed.increasedPercent || 0))}% increased Attack Speed from the build's lines (additional Attack Speed lines not counted: provisional)`, value: profile.additionalPerAttackSpeedPercent * Math.max(0, attackSpeed.increasedPercent || 0), category: "Additional damage", origin: "skill" }] : [];
  // Gale (Marksman core, "X% of the Projectile Speed bonus is also applied to the additional bonus for Projectile Damage") and
  // the plain wording ("… applied to Projectile Damage"). Game affixes 114414 / 101140017 are node 114 conversions from the
  // increased (mod 3) value of attribute 60051 (Projectile Speed) to attribute 57191 (damage, all) for the Projectile tag
  // (6001110): mod 4 (additional) for Gale, mod 3 (increased) for the plain wording, no cap (src/data/affix-index-ss13.generated.js).
  // The increased pool this skill reads: the build's plain "+X% Projectile Speed" lines, its own supports' "+X% Projectile
  // Speed for the supported skill", the Aura buffs' Projectile Speed and hero buffs (Youga's Centralization). "+X% additional
  // Projectile Speed" (mod 4) is not converted. Before 2026-10-18 Gale read No DPS effect.
  const projectileSpeedState = (() => {
    if (!scopeTags.has("Projectile")) return null;
    const converters = modifierTexts.flatMap((line) => {
      const match = normalizePercentageText(String(line.text || "")).replace(/\s+/g, " ").trim().match(/^(\d+(?:\.\d+)?)% of the Projectile Speed bonus is also applied to (the additional bonus for )?Projectile Damage$/i);
      return match ? [{ source: line.source, text: line.text, share: Number(match[1]) * (line.multiplier ?? 1), layer: match[2] ? "additional" : "increased" }] : [];
    });
    if (!converters.length) return null;
    const sources = [];
    for (const line of modifierTexts) {
      const match = normalizePercentageText(String(line.text || "")).replace(/\s+/g, " ").trim().match(/^([+-]?\d+(?:\.\d+)?)% Projectile Speed$/i);
      if (match) sources.push({ source: line.source, text: line.text, value: Number(match[1]) * (line.multiplier ?? 1) });
    }
    for (const clause of setup?.supportEffects?.clauses || []) {
      const match = normalizePercentageText(String(clause.text || "")).replace(/\s+/g, " ").trim().match(/^([+-]?\d+(?:\.\d+)?)% Projectile Speed for the supported skill$/i);
      if (match) sources.push({ source: clause.source || `Support: ${clause.support}`, text: clause.text, value: Number(match[1]) });
    }
    for (const entry of auraEntries) if (entry.effectiveEffects?.projectileSpeedPercent) sources.push({ source: `Aura: ${entry.name} / Projectile Speed`, text: `+${round(entry.effectiveEffects.projectileSpeedPercent)}% Projectile Speed`, value: entry.effectiveEffects.projectileSpeedPercent });
    for (const line of heroEffects?.projectileSpeed || []) sources.push({ source: line.source, text: line.text, value: line.value });
    const increasedPercent = sources.reduce((total, line) => total + line.value, 0);
    return { increasedPercent, sources, converters };
  })();
  const galeLines = (projectileSpeedState?.converters || []).map((converter) => {
    const value = converter.share / 100 * Math.max(0, projectileSpeedState.increasedPercent);
    return { source: converter.source, text: `+${round(value)}% ${converter.layer === "additional" ? "additional " : ""}Projectile Damage (${converter.text}: ${converter.share}% × +${round(projectileSpeedState.increasedPercent)}% increased Projectile Speed = ${projectileSpeedState.sources.map((line) => `${round(line.value)} ${line.source}`).join(" + ")}; additional Projectile Speed not converted; game affix node 114)`, value, layer: converter.layer, category: converter.layer === "additional" ? "Additional damage" : "Increased damage", origin: "derived" };
  }).filter((line) => line.value > 0);
  const auraLines = [];
  for (const entry of auraEntries) {
    const effects = entry.effectiveEffects || {};
    if (effects.additionalSpellDamagePercent && scopeTags.has("Spell")) auraLines.push({ source: `Aura: ${entry.name} / Spell Damage`, text: `+${round(effects.additionalSpellDamagePercent)}% additional Spell Damage`, value: effects.additionalSpellDamagePercent, category: "Additional damage", origin: "derived" });
    if (effects.additionalAreaDamagePercent && skillTags.has("Area")) auraLines.push({ source: `Aura: ${entry.name} / Area Damage`, text: `+${round(effects.additionalAreaDamagePercent)}% additional Area Damage`, value: effects.additionalAreaDamagePercent, category: "Additional damage", origin: "derived" });
    // Skill-tag and typed aura stats (gear-pact batch G4): Cruelty "+X% additional Attack Damage" (Attack skills), Fearless
    // "+X% additional Melee Skill Damage" (Melee skills), Charged Flames / Frigid Domain / Electric Conversion "+X% additional
    // Fire / Cold / Lightning Damage" (components of that type). Physical / Erosion arrive as derived modifier texts when
    // the planner emitted them (src/aura-damage.js), so they are added here only when that line is absent.
    if (effects.additionalAttackDamagePercent && scopeTags.has("Attack")) auraLines.push({ source: `Aura: ${entry.name} / Attack Damage`, text: `+${round(effects.additionalAttackDamagePercent)}% additional Attack Damage`, value: effects.additionalAttackDamagePercent, category: "Additional damage", origin: "derived" });
    if (effects.additionalMeleeSkillDamagePercent && scopeTags.has("Melee")) auraLines.push({ source: `Aura: ${entry.name} / Melee Skill Damage`, text: `+${round(effects.additionalMeleeSkillDamagePercent)}% additional Melee Skill Damage`, value: effects.additionalMeleeSkillDamagePercent, category: "Additional damage", origin: "derived" });
    for (const [stat, type] of [["additionalFireDamagePercent", "Fire"], ["additionalColdDamagePercent", "Cold"], ["additionalLightningDamagePercent", "Lightning"], ["additionalPhysicalDamagePercent", "Physical"], ["additionalErosionDamagePercent", "Erosion"]]) {
      if (!effects[stat] || modifierTexts.some((line) => line.aura === entry.name && line.stat === stat)) continue;
      auraLines.push({ source: `Aura: ${entry.name} / ${type} Damage`, text: `+${round(effects[stat])}% additional ${type} Damage`, value: effects[stat], category: "Additional damage", origin: "derived", types: [type] });
    }
    if (effects.additionalProjectileDamagePercent && skillTags.has("Projectile")) auraLines.push({ source: `Aura: ${entry.name} / Projectile Damage`, text: `+${round(effects.additionalProjectileDamagePercent)}% additional Projectile Damage`, value: effects.additionalProjectileDamagePercent, category: "Additional damage", origin: "derived" });
  }
  const mainStatLines = [];
  // Main stats (manual keyword text, config_multi_language_en: "Every point of Strength / Dexterity additionally increases
  // the damage of skills that have Strength / Dexterity as a main stat by 0.5% … When a skill has multiple main stats, the
  // bonuses of the main stats are added together before calculating the final damage bonus"; gear-pact batch chunk 3, Q-G8).
  // Intelligence keeps the beam hit ledger's pooled total (observed); Strength and Dexterity read the stat-sheet totals.
  const mainStats = profile.mainStats || [];
  const statParts = [
    ...(mainStats.includes("Intelligence") && intelligenceAdditionalPercent ? [{ stat: "Intelligence", value: intelligenceAdditionalPercent }] : []),
    ...["Strength", "Dexterity"].filter((stat) => mainStats.includes(stat) && Number(mainStatPoints?.[stat.toLowerCase()])).map((stat) => ({ stat, value: 0.5 * Number(mainStatPoints[stat.toLowerCase()]) }))
  ];
  if (statParts.length === 1 && statParts[0].stat === "Intelligence") mainStatLines.push({ source: intelligenceSource || "Total Intelligence (0.5% per point)", text: `+${round(intelligenceAdditionalPercent)}% additional damage (Intelligence main stat, Scorching Beam hit-ledger rule)`, value: intelligenceAdditionalPercent, category: "Additional damage", origin: "derived" });
  else if (statParts.length) {
    const value = statParts.reduce((total, part) => total + part.value, 0);
    mainStatLines.push({ source: `Main stats (${statParts.map((part) => part.stat).join(" + ")}; 0.5% per point, added together)`, text: `+${round(value)}% additional damage (${statParts.map((part) => `${part.stat} ${round(part.value)}%`).join(" + ")}; manual: main-stat bonuses are added before the final bonus)`, value, category: "Additional damage", origin: "derived" });
  }
  // Double Damage (src/double-damage.js; manual + executable trace): expected ×(1 + min(100, Σ chance)/100) on hits.
  const doubleDamage = doubleDamageForSkill(modifierTexts, { tags: [...scopeTags], stats: mainStatPoints || {} });
  const doubleDamageLines = doubleDamage.chancePercent > 0 ? [{ source: `Double Damage (${doubleDamage.sources.map((line) => line.source).join(", ")})`, text: `${round(doubleDamage.chancePercent)}% Double Damage chance → ×${round(doubleDamage.factor)} expected hit damage (manual: chances stack, then one 2× roll per hit)`, value: (doubleDamage.factor - 1) * 100, category: "Additional damage (Double Damage, expected)", origin: "derived" }] : [];
  const combatLines = [];
  // Aim's scope since the 2026-10-15 data: "Projectile and Beam Skills" (game tag 6001130 Ranged → 6001110 Projectile).
  if (aim?.active && aim.averageDamagePercent && (skillTags.has("Beam") || skillTags.has("Projectile"))) combatLines.push({ source: `Aim: Projectile and Beam Skills additional damage (${aim.uptimeLabel || "uptime averaged"})`, text: `+${round(aim.damagePercent)}% while active`, value: aim.averageDamagePercent, category: "Additional damage", origin: "derived" });

  // Critical strikes: expected factor with crit-only additional lines on the crit share.
  // Attack skills (B3): the supports' Critical Strike Rating lines join the weapon crit by the manual's formula, rating =
  // Σ base (weapon + flat) × (1 + Σ %) × Π(1 + additional %), 100 rating per 1% chance. Spell crit already reads its
  // supports in src/scorching-beam-critical.js (Critical Strike Rating Increase there keeps its Lv.21 cap, B6 open; the
  // attack path reads the TLIDB table at the support's level).
  const attackCritBase = attackProfile ? (crit.attackCrit || weapon?.crit || null) : null;
  let supportCrit = null;
  // Tag-scoped crit rating lines ("+30% Projectile Critical Strike Rating"; src/scorching-beam-critical.js taggedCrit, read for
  // this setup's tags) join the attack crit like the supports' lines (residual batch).
  const taggedRating = attackCritBase ? crit.taggedCrit || { ratingPercent: 0, ratingFlat: 0 } : { ratingPercent: 0, ratingFlat: 0 };
  if (attackCritBase && (supports.critRating.length || taggedRating.ratingPercent || taggedRating.ratingFlat)) {
    const flat = sum(supports.critRating.filter((line) => line.kind === "ratingFlat")) + taggedRating.ratingFlat;
    const percent = sum(supports.critRating.filter((line) => line.kind === "ratingPercent")) + taggedRating.ratingPercent;
    const additionalFactor = product(supports.critRating.filter((line) => line.kind === "ratingAdditional"));
    const rating = Math.max(0, ((attackCritBase.weaponRating || 0) + (attackCritBase.flatRating || 0) + flat) * Math.max(0, 1 + ((attackCritBase.increasedRatingPercent || 0) + percent) / 100) * additionalFactor);
    supportCrit = { rating, chancePercent: Math.min(100, rating / 100), sources: supports.critRating, base: { weaponRating: attackCritBase.weaponRating || 0, flatRating: attackCritBase.flatRating || 0, increasedRatingPercent: attackCritBase.increasedRatingPercent || 0 } };
  }
  let critChance = Math.max(0, Math.min(100, supportCrit ? supportCrit.chancePercent : crit.criticalChancePercent || 0)) / 100;
  // Default crit damage: config_attributes 4803, 150% (2026-10-17 game attribute data).
  const critDamage = Math.max(100, crit.combatCriticalDamagePercent ?? crit.criticalDamagePercent ?? BASE_CRITICAL_DAMAGE_PERCENT) / 100;
  const townCritDamage = Math.max(100, crit.criticalDamagePercent ?? BASE_CRITICAL_DAMAGE_PERCENT) / 100;
  // Build-wide "+X% additional damage on [<Tag>] Critical Strike" lines (src/crit-only-lines.js) join the supports' crit-only list.
  // The planner's enemy crit-taken debuffs (Mark on the dummy, src/mark-effect.js) act on the crit share the same way.
  const critOnlySources = [...supports.critOnlyAdditional, ...critOnlyLinesFor(modifierTexts, [...scopeTags]), ...extraCritOnly];
  const critOnlyFactor = product(critOnlySources);
  // Alternate dual wielding (user-confirmed 2026-10-14): each swing uses its own hand's crit rating with the build-wide lines
  // (the supports' and tagged rating lines, the cap, crit damage, crit-only lines); the hands are not averaged. Each hand's
  // chance: the supports' formula on that hand's weapon rating, or the planner's per-hand chance (crit.hands: Lucky / Sentry
  // rules applied), else the weapon model's. The reported chance is the swing average.
  const weaponHands = attackProfile && weapon?.hands?.length && attackCritBase?.hands?.length === weapon.hands.length ? attackCritBase.hands : null;
  const handCrits = weaponHands ? weaponHands.map((hand, index) => {
    let chancePercent;
    if (supportCrit) {
      const flat = sum(supports.critRating.filter((line) => line.kind === "ratingFlat")) + taggedRating.ratingFlat;
      const percent = sum(supports.critRating.filter((line) => line.kind === "ratingPercent")) + taggedRating.ratingPercent;
      const rating = Math.max(0, ((hand.weaponRating || 0) + (attackCritBase.flatRating || 0) + flat) * Math.max(0, 1 + ((attackCritBase.increasedRatingPercent || 0) + percent) / 100) * product(supports.critRating.filter((line) => line.kind === "ratingAdditional")));
      chancePercent = Math.min(100, rating / 100);
    } else chancePercent = crit.hands?.[index]?.criticalChancePercent ?? hand.chancePercent;
    const chance = Math.max(0, Math.min(100, chancePercent || 0)) / 100;
    return { hand: hand.hand, share: hand.share, chancePercent: chance * 100, factor: (1 - chance) + chance * critDamage * critOnlyFactor, townFactor: (1 - chance) + chance * townCritDamage * critOnlyFactor };
  }) : null;
  if (handCrits) critChance = handCrits.reduce((total, hand) => total + hand.share * hand.chancePercent / 100, 0);
  // Main-hand-only additional lines (src/weapon-damage-model.js `hand: "main"`): per-hand in alternate dual wielding (2026-10-14).
  const mainHandOnlyLines = handCrits ? weaponAdditional.filter((line) => line.hand === "main") : [];
  const mainHandOnlyFactor = product(mainHandOnlyLines);
  if (mainHandOnlyLines.length) notes.push(`${profile.name}: ${mainHandOnlyLines.map((line) => `"${line.text}" (${line.source})`).join(", ")} applies to the main-hand swings only (alternate dual wielding: half the swings), ×${round(mainHandOnlyFactor)} on those.`);
  const critFactor = handCrits ? handCrits.reduce((total, hand) => total + hand.share * hand.factor, 0) : (1 - critChance) + critChance * critDamage * critOnlyFactor;
  const townCritFactor = handCrits ? handCrits.reduce((total, hand) => total + hand.share * hand.townFactor, 0) : (1 - critChance) + critChance * townCritDamage * critOnlyFactor;

  // Target (src/target-hit-mitigation.js: user-confirmed Lv.85 dummy): 50% armour vs Physical hits, 30% vs other hits.
  const armourPercent = target.armourPercent ?? level85DummyDefenses.armourPercent;
  const nonPhysicalArmourPercent = target.nonPhysicalArmourPercent ?? level85DummyDefenses.nonPhysicalArmourPercent;
  const resistanceOf = (type) => type === "Physical" ? 0 : (target.resistancePercent?.[type] ?? level85DummyDefenses[`${type.toLowerCase()}ResistancePercent`] ?? 30);

  // "When the supported skill deals damage, there is a X% chance to inflict a debuff: +Y% damage taken by the enemy from the
  // supported skill for Z s" (Tendonslicer): expected uptime 1 − (1 − X%)^(hits in Z s) at the skill's hit rate (provisional).
  const hitsPerSecondForDebuff = usesPerSecond * strikeHitsPerUse(components);
  for (const line of supports.effects.selfDebuff) {
    const uptime = 1 - Math.pow(1 - Math.min(100, line.chancePercent) / 100, hitsPerSecondForDebuff * line.durationSeconds);
    if (uptime > 0) supports.additional.push({ source: line.source, text: `${line.text} — uptime ${round(uptime * 100)}% at ${round(hitsPerSecondForDebuff)} hits/s (provisional)`, value: line.value * uptime, category: "Additional damage taken (from this skill)" });
  }
  // 2026-10-15 patch update (src/support-effects.js). Elemental Impact: active when the final hit parts (own types, conversions,
  // added flat damage) include Fire, Cold and Lightning; Elemental parts only. Hunting Tempo: the buffed share of uses
  // min(1, (m/s ÷ metres) × N ÷ uses per second) × its additional damage, while the Movement group is Moving.
  const finalTypes = components.filter((component) => component.min + component.max + (component.added?.min || 0) + (component.added?.max || 0) > 0).map((component) => component.type);
  for (const clause of supports.effects.clauses.filter((item) => item.family === "allElementalAdditional" && item.value)) {
    const { missing } = allElementalState(finalTypes);
    if (missing.length) notes.push(`${clause.support}: the supported skill doesn't deal all three Elemental types (missing: ${missing.join(", ")}), so "${clause.text}" is inactive.`);
    else supports.additional.push({ source: clause.source, text: `${clause.text} (Lv.${clause.level ?? "?"}) — the hits deal Fire, Cold and Lightning; "recently" held while the skill is used continuously`, value: clause.value, category: "Additional damage", scopeTypes: [...ELEMENTAL_TYPES] });
  }
  for (const clause of supports.effects.clauses.filter((item) => item.family === "movementCharges" && item.active && item.value)) {
    const share = movementChargeShare({ uses: clause.uses, meters: clause.meters, usesPerSecond });
    if (share > 0) supports.additional.push({ source: clause.source, text: `${clause.text} (Lv.${clause.level ?? "?"}) — moving at the assumed ${ASSUMED_MOVEMENT_METERS_PER_SECOND} m/s: min(1, (${ASSUMED_MOVEMENT_METERS_PER_SECOND} ÷ ${clause.meters}) × ${clause.uses} ÷ ${round(usesPerSecond)} uses/s) = ${round(share * 100)}% of uses buffed`, value: clause.value * share, category: "Additional damage", share });
  }

  // Per component.
  const perType = components.map((component) => {
    const types = component.scopeTypes || (component.converted ? [component.originalType, component.type] : [component.type]);
    const additionalTypes = component.additionalScopeTypes || types;
    const applies = (line) => scopeApplies(line.scope, { damageTypes: types, skillTags: scopeTags });
    const appliesAdditional = (line) => scopeApplies(line.scope, { damageTypes: additionalTypes, skillTags: scopeTags });
    const componentIncreased = (component.extraIncreased || []).map((line) => ({ ...line, category: "Increased damage", origin: "skill" }));
    const increased = [...damageLines.filter((line) => line.layer === "increased" && applies(line)), ...supports.increased.filter((line) => applies(line)), ...(channelState?.increased || []), ...weaponIncreased, ...componentIncreased, ...galeLines.filter((line) => line.layer === "increased")];
    const componentLines = (component.extraAdditional || []).map((line) => ({ ...line, category: "Additional damage", origin: "skill" }));
    const additional = [...damageLines.filter((line) => line.layer === "additional" && appliesAdditional(line)), ...supports.additional.filter((line) => !line.scopeTypes || line.scopeTypes.some((type) => additionalTypes.includes(type))), ...levelLine, ...terraLine, ...grantedLines, ...speedBonusLine.filter((line) => line.value > 0), ...galeLines.filter((line) => line.layer === "additional"), ...(channelState?.additional || []), ...componentLines, ...auraLines.filter((line) => !line.types || line.types.some((type) => additionalTypes.includes(type))), ...mainStatLines, ...doubleDamageLines, ...weaponAdditional.filter((line) => !(handCrits && line.hand === "main"))];
    const combatAdditional = [...combatLines];
    const taken = takenLines.filter((line) => appliesAdditional(line));
    const maxOnly = maxLines.filter((line) => applies(line));
    const minOnly = minLines.filter((line) => applies(line));
    const penetration = penetrationLines.filter((line) => line.damageTypes.has(component.type));
    const increasedFactor = Math.max(0, 1 + sum(increased) / 100);
    const takenFactor = Math.max(0, 1 + sum(taken.filter((line) => line.layer === "increased")) / 100) * product(taken.filter((line) => line.layer === "additional"));
    const penetrationPercent = sum(penetration);
    const resistancePercent = resistanceOf(component.type);
    const resistanceFactor = Math.max(0, 1 - (resistancePercent - penetrationPercent) / 100);
    // "+X% Armor DMG Mitigation Penetration": points off the (capped) armour mitigation of every hit type (sourced trace;
    // no floor after the subtraction: provisional). src/target-hit-mitigation.js armourMitigationPercent.
    const armourPenetration = armourPenetrationLines;
    const armour = armourMitigationPercent({ physical: component.type === "Physical", armourPercent, nonPhysicalArmourPercent, penetrationPercent: sum(armourPenetration) });
    const armourFactor = armour.factor;
    const maxFactor = product(maxOnly);
    // Additional Min / Max Damage scale this component's own lower / upper roll (per damage type: a Physical-scoped line reaches
    // Physical components only) before the roll is averaged; a negative total floors at 0.
    const minFactor = Math.max(0, product(minOnly));
    const roll = { min: (component.min + component.added.min) * minFactor, max: (component.max + component.added.max) * maxFactor };
    // Attack panels (Hammer of Ash / Whirlwind / Split Shot Lv16 runs 2026-10-12): "Total Main-Hand Attack Damage" is the
    // weapon × % hit after the dummy's Physical armour (0.5) or non-Physical armour × resistance (0.49), without the
    // Demolisher expectation, and "Attack DPS" is that hit × attack speed × crit (observed on the three panels; see
    // research/attack-weapon-tests-2026-10-12.md). Spell panels show the unmitigated hit (Ring of Blades, Flame Jet).
    const townAdditionalFactor = product(attackProfile ? additional.filter((entry) => !/: Demolisher Charge$/.test(entry.source || "")) : additional);
    const additionalFactor = product(additional) * product(combatAdditional);
    // Lucky / Very Lucky Damage (manual "Lucky & Unlucky"): the best of N uniform rolls, min + (max − min) × N / (N + 1).
    const rollAverageOf = (range) => luckyDamageRolls > 1 ? range.min + (range.max - range.min) * luckyDamageRolls / (luckyDamageRolls + 1) : average(range);
    const rollAverage = rollAverageOf(roll);
    // Alternate dual wielding: ½ (main-hand roll + shared added flat) × main crit + ½ (off-hand roll + shared added flat) × off
    // crit; a component without per-hand ranges (added flat only) rolls the same in both hands.
    // "+X% additional damage for Main-Hand Weapons" (2026-10-14): in alternate dual wielding only the main-hand swings take it
    // (mainHandOnlyLines), as a factor on that hand's roll; the off-hand swings do not.
    const handRolls = handCrits ? (component.hands || handCrits.map(() => ({ min: component.min, max: component.max }))).map((hand, index) => {
      const range = { min: (hand.min + component.added.min) * minFactor, max: (hand.max + component.added.max) * maxFactor };
      const handFactor = handCrits[index].hand === "main" ? mainHandOnlyFactor : 1;
      return { hand: handCrits[index].hand, share: handCrits[index].share, roll: range, average: rollAverageOf(range) * handFactor, handAdditionalFactor: handFactor, critFactor: handCrits[index].factor, townCritFactor: handCrits[index].townFactor };
    }) : null;
    const critWeighted = handRolls ? handRolls.reduce((total, hand) => total + hand.share * hand.average * hand.critFactor, 0) : null;
    const townCritWeighted = handRolls ? handRolls.reduce((total, hand) => total + hand.share * hand.average * hand.townCritFactor, 0) : null;
    const townPerHit = handRolls ? townCritWeighted * increasedFactor * townAdditionalFactor * (attackProfile ? armourFactor * resistanceFactor : 1) : rollAverage * increasedFactor * townAdditionalFactor * townCritFactor * (attackProfile ? armourFactor * resistanceFactor : 1);
    const townPerHitNoCrit = (handRolls ? handRolls.reduce((total, hand) => total + hand.share * hand.average, 0) : rollAverage) * increasedFactor * townAdditionalFactor * (attackProfile ? armourFactor * resistanceFactor : 1);
    const perHitBeforeTarget = handRolls ? critWeighted * increasedFactor * additionalFactor : rollAverage * increasedFactor * additionalFactor * critFactor;
    const perHit = perHitBeforeTarget * takenFactor * armourFactor * resistanceFactor;
    return { key: component.componentKey, strikeKey: component.strikeKey ?? component.componentKey, label: component.label, ...(component.recalled ? { recalled: true } : {}), type: component.type, originalType: component.originalType, converted: component.converted, addedOnly: Boolean(component.addedOnly), splitPart: Boolean(component.splitPart), hitsPerUse: component.hitsPerUse, hitsDetail: component.hitsDetail, shotgun: component.shotgun || null, basis: component.basis, note: component.note, effectiveness: component.effectiveness, base: { min: component.min, max: component.max }, added: component.added, addedSources: component.addedSources, roll, increased, additional, combatAdditional, taken, maxOnly, minOnly, penetration, armourPenetration, armourPercent: armour.before, armourPenetrationPercent: armour.penetrationPercent, armourAfterPenetrationPercent: armour.after, increasedFactor, additionalFactor, townAdditionalFactor, takenFactor, penetrationPercent, resistancePercent, resistanceFactor, armourFactor, maxFactor, minFactor, handRolls, mainHandOnly: mainHandOnlyLines, townPerHit, townPerHitNoCrit, perHitBeforeTarget, perHit, perUse: perHit * component.hitsPerUse, townPerUse: townPerHit * component.hitsPerUse };
  });

  // Hit events per use: one per strike (strikeHitsPerUse); damage still sums every typed part below.
  const hitsPerUse = strikeHitsPerUse(perType);
  const hitPerUse = perType.reduce((total, component) => total + component.perHit * component.hitsPerUse, 0);
  // Deterioration (src/combat-states.js deteriorationFrom; manual rule 1002030520): each Erosion hit has the chance to add
  // a stack (plus expected extra stacks) that deals 60% of that hit's Erosion damage dealt as True Damage when it ends.
  const erosionPerUse = perType.filter((component) => component.type === "Erosion").reduce((total, component) => total + component.perHit * component.hitsPerUse, 0);
  const deteriorationFactor = deterioration && erosionPerUse > 0 ? deterioration.share * (deterioration.chancePercent / 100) * (1 + deterioration.extraStacks) * (1 + deterioration.increasedPercent / 100) * deterioration.additionalPercents.reduce((factor, value) => factor * (1 + value / 100), 1) : 0;
  const deteriorationPerUse = erosionPerUse * deteriorationFactor;
  const perUse = hitPerUse + deteriorationPerUse;
  // Town / panel figure. For a channel skill the character panel reads one hit of the primary component per channel use
  // (Ring of Blades Lv16 runs 2026-10-11: panel 537 = 178.9 per hit × 3.003 uses/s, and × 1.245 with Quick Decision),
  // not the blades' landed hit rate; other skills read every hit of every component per use.
  const primaryKey = perType.find((component) => !component.addedOnly)?.key ?? null;
  // Attack panels read one hit of the primary component per attack (Hammer of Ash 298 = the Pummel alone, no Explosion;
  // Whirlwind 358 = the Sweep Slash alone; Split Shot 472 = one arrow), the same shape as the channel rule.
  const townHits = (component) => (channel && !release) || attackProfile ? (component.key === primaryKey || component.addedOnly ? 1 : 0) : component.hitsPerUse;
  const townPerUse = perType.reduce((total, component) => total + component.townPerHit * townHits(component), 0);
  // Panel readout without the crit expectation: the Flame Jet Lv16 panel showed 170 against 175.0 with crit and 170.7
  // without (one observation; the DoT panel figures never carry crit either).
  const townPerUseNoCrit = handCrits ? perType.reduce((total, component) => total + component.townPerHitNoCrit * townHits(component), 0) : townCritFactor > 0 ? townPerUse / townCritFactor : townPerUse;
  const perUseBeforeTarget = perType.reduce((total, component) => total + component.perHitBeforeTarget * component.hitsPerUse, 0);
  const dps = perUse * usesPerSecond;
  // Windows: uses fall at u / rate (u ≥ 1) as in the dummy recount; a cooldown-bound skill gets floor(seconds × rate) uses.
  // A Terra skill's ground effect is continuous from its first cast, a channel is held at full stacks (own buffs
  // pre-built) and a rate-model trigger runs steadily, so their windows use the steady rate.
  // A Combo cycle with per-attack `steps` counts each attack as it lands (end of its own attack time) instead of whole
  // cycles: Crescent Slash Lv16 (2026-10-12) showed 49 Moon Halo stacks (1 per Starter hit, 7 per cycle) after 20 s, i.e.
  // the 7th cycle's Starters landed although only 6 whole cycles fit. Each step's share of a use is its components'
  // damage (keys match the base component, its conversion parts, and `share` for steps that split one component);
  // damage not tied to a step key (added flat damage) is spread in the same proportions.
  const cycleSteps = profile.cycle?.steps?.length && baseUseTime > 0 && intervalSeconds > 0 ? (() => {
    const baseKey = (key) => String(key).split(/[+>]/)[0];
    const stepDamage = profile.cycle.steps.map((step) => perType.filter((component) => step.keys.includes(baseKey(component.key))).reduce((total, component) => total + component.perHit * component.hitsPerUse, 0) * (step.share ?? 1));
    const mapped = stepDamage.reduce((total, value) => total + value, 0);
    if (!(mapped > 0)) return null;
    const scale = intervalSeconds / baseUseTime;
    return profile.cycle.steps.map((step, index) => ({ seconds: step.seconds * scale, damage: perUse * stepDamage[index] / mapped }));
  })() : null;
  const cycleWindowDamage = (seconds) => {
    let time = 0, total = 0;
    for (let guard = 0; guard < 100000; guard += 1) {
      const step = cycleSteps[guard % cycleSteps.length];
      time += step.seconds;
      if (time > seconds + 1e-9) break;
      total += step.damage;
    }
    return total;
  };
  const windowDps = (seconds) => !(usesPerSecond > 0) ? 0 : terra || channel || rateModel ? dps : cycleSteps ? cycleWindowDamage(seconds) / seconds : perUse * Math.floor(seconds * usesPerSecond + 1e-9) / seconds;
  const primary = perType.find((component) => !component.addedOnly) || perType[0] || null;
  const key = `hit:${setup?.setupKey || setup?.instanceId || profile.name}`;
  const builtInReaping = profile.builtInReaping && usesPerSecond > 0 ? { ...profile.builtInReaping, usesPerSecond, intervalSeconds, baseRecoverySeconds: intervalSeconds } : null;
  // What a per-skill ailment-application model needs from this hit (hit ailments are not applied here): hit damage
  // per use by type before target mitigation (expected, with crit; and the plain average), the use and hit rates,
  // crit, the skill's tags, and the ailment lines the build and the skill text carry.
  const ailmentPattern = /\b(?:Ignite|Ignited|Trauma|Wilt|Shock|Frostbite|Freeze|Frozen|Numbed|Ailments?)\b/i;
  const byType = (pick) => perType.reduce((totals, component) => ({ ...totals, [component.type]: (totals[component.type] || 0) + pick(component) * component.hitsPerUse }), {});
  const ailmentInputs = {
    name: profile.name, setupKey: setup?.setupKey, tags: [...skillTags], dealtTypes, level,
    usesPerSecond, hitsPerUse, hitsPerSecond: usesPerSecond * hitsPerUse, intervalSeconds,
    critChancePercent: critChance * 100, critDamagePercent: critDamage * 100, critFactor,
    perUseByTypeBeforeTarget: byType((component) => component.perHitBeforeTarget),
    perUseAverageByTypeNoCrit: byType((component) => average(component.roll) * component.increasedFactor * component.additionalFactor),
    baseRollByType: byType((component) => average(component.base)),
    ailmentLines: modifierTexts.filter((line) => ailmentPattern.test(line.text)).map((line) => ({ source: line.source, text: line.text, origin: line.origin, multiplier: line.multiplier ?? 1 })),
    skillAilmentTexts: (setup?.effects || []).join("\n").split(/\r?\n/).map((text) => text.trim()).filter((text) => text && ailmentPattern.test(text)),
    supportNames: (setup?.supports || []).filter((support) => support.enabled !== false).map((support) => support.name)
  };
  return {
    key, name: profile.name, setupKey: setup?.setupKey, profile, skillHit: true, damageType: profile.damageType, dealtTypes,
    level, baseLevel: base.level, effectiveness: primary?.effectiveness ?? base.effectiveness, components: perType, primary,
    rate: { useTimeSeconds: baseUseTime, speedType, speedFactor, supportSpeedFactor, castFrequency: sentry ? { factor: castFrequencyFactor, sources: castFrequencyLines, weaponAttacksPerSecond: sentry.weaponAttackSpeed ? weaponAttacksPerSecond || 0 : null } : null, conversions: supports.conversion, addedAs: supports.addedAs, castSpeedSources: speedType === "attack-speed" ? [...(attackSpeed?.sources || []), ...supports.castSpeed, ...multistrikeSpeedLines, ...(ownSpeedLine ? [ownSpeedLine] : [])] : [...(castSpeed.sources || []), ...supports.castSpeed], attackSpeed: speedType === "attack-speed" ? attackSpeed : null, effectiveUseTimeSeconds: useTime, cooldownSeconds: timing?.cooldownSeconds || 0, charges: timing?.charges || 0, cooldownFactor, cooldownSources: cooldownRecovery, effectiveCooldownSeconds: effectiveCooldown, useModel: triggered ? `triggered (every ${round(triggerInterval)} s; provisional)` : terra ? `${terra.label || "terra"} (${terra.durationSeconds} s ${terra.label === "sentry" ? "sentry" : "ground effect"})` : release ? `channel and release (${channelState.maxStacks} stacks × ${round(useTime || 0)} s, ${round(intervalSeconds || 0)} s per cycle)` : channel ? `channel (${round(baseUseTime)} s interval, ${channelState.maxStacks} stacks held)` : rateModel ? `trigger rate (${round(usesPerSecond)} per second)` : profile.cycle ? "combo cycle" : "cast", terraDurationSeconds: terra?.durationSeconds ?? null, intervalSeconds, usesPerSecond, firstUseSeconds, hitsPerUse, hitsPerUseBasis: provisionalComponents.length ? "provisional" : "text", hitsPerUseNote: perType.filter((component) => !component.addedOnly).map((component) => `${component.label}: ${component.hitsDetail} — ${component.note}`).join(" · "), hitsPerSecond: usesPerSecond * hitsPerUse, source: timing?.source || null, tlidbCastSeconds: timing?.tlidbCastSeconds ?? null, demolisherShare, multistrike, spellBurst, rateComponents, extraProjectiles: falloffFactor && projectileTargets.length ? { count: extraProjectiles, falloff: falloffFactor } : null, trigger: triggered ? { source: triggerLine.source, text: triggerLine.text, intervalSeconds: triggerInterval, kind: triggerLine.kind, provisional: true } : null },
    weapon: attackProfile ? { damageByType: weapon?.damageByType || {}, mainHand: weapon?.mainHand ? { name: weapon.mainHand.name, type: weapon.mainHand.type, hands: weapon.mainHand.hands } : null, dualWielding: Boolean(weapon?.dualWielding), dualWieldMode: weapon?.dualWieldMode || null, hands: weapon?.hands ? weapon.hands.map((hand) => ({ hand: hand.hand, name: hand.name, type: hand.type, share: hand.share, critRating: hand.critRating, attackSpeed: hand.attackSpeed })) : null, percents: base.weaponPercents } : null,
    crit: { ...crit, chancePercent: critChance * 100, townDamagePercent: townCritDamage * 100, combatDamagePercent: critDamage * 100, critOnlyFactor, critOnlySources, supportRating: supportCrit, factor: critFactor, townFactor: townCritFactor, hands: handCrits ?? crit.hands ?? null },
    town: { perUse: townPerUse, dps: townPerUse * usesPerSecond, perUseNoCrit: townPerUseNoCrit, dpsNoCrit: townPerUseNoCrit * usesPerSecond, hitsPerUse: strikeHitsPerUse(perType, townHits), formula: attackProfile ? "one hit of the primary component after the dummy's armour / resistance × attack speed × crit, without the Demolisher expectation (observed on the Hammer of Ash / Whirlwind / Split Shot Lv16 panels 2026-10-12: 298 / 358 / 472)" : channel ? "average hit × one hit per channel use × channel uses per second (cast-speed scaled); town layers only (Ring of Blades panel runs 2026-10-11: matched with the crit expectation, 537 = 178.9 × 3.003)" : "average hit (with crit) × hits per use × uses per second; town layers only (hypothesis for the character panel's skill DPS)" },
    combat: { perUse, perUseBeforeTarget, dps, dpsBeforeTarget: perUseBeforeTarget * usesPerSecond, fiveSecondAverageDps: windowDps(windows[0] ?? 5), twentySecondAverageDps: windowDps(windows[1] ?? 20) },
    steps: primary ? { increasedFactor: primary.increasedFactor, additionalFactor: primary.additionalFactor, critFactor, takenFactor: primary.takenFactor, armourFactor: primary.armourFactor, armourPercent: primary.armourPercent, armourPenetrationPercent: primary.armourPenetrationPercent, resistanceFactor: primary.resistanceFactor, resistancePercent: primary.resistancePercent, penetrationPercent: primary.penetrationPercent, maxFactor: primary.maxFactor, minFactor: primary.minFactor } : null,
    builtInReaping, ailmentInputs, channel: channelState,
    deterioration: deteriorationPerUse > 0 ? { source: deterioration.source, erosionPerUse, factor: deteriorationFactor, perUse: deteriorationPerUse, dps: deteriorationPerUse * usesPerSecond, rule: "60% of each Erosion hit dealt, as True Damage when the 1 s stack ends (manual); chance × (1 + extra stacks) × (1 + increased) × Π(1 + additional); the delay is not in the windows (provisional)" } : null,
    luckyDamageRolls,
    ledger: {
      base: perType.filter((component) => !component.addedOnly).map((component) => ({ source: `${profile.name} · ${component.label} Lv.${base.level}`, text: component.weaponPercent != null ? `${component.weaponPercent}% Weapon Attack Damage × ${round(component.weaponDamage.min)}–${round(component.weaponDamage.max)} ${component.converted ? `${component.originalType} → ${component.type}` : component.type} weapon damage = ${round(component.base.min)}–${round(component.base.max)} × ${round(component.hitsPerUse)} hits per use (${profile.sources.gameData}${level > 20 ? "; base frozen past Lv.20" : ""})` : `${component.base.min}–${component.base.max} ${component.converted ? `${component.originalType} → ${component.type}` : component.type} damage × ${round(component.hitsPerUse)} hits per use (${profile.sources.gameData}${level > 20 ? "; base frozen past Lv.20" : ""})`, min: component.base.min, max: component.base.max, value: average(component.base), category: `Base ${profile.name} damage`, origin: "base" })),
      added: perType.flatMap((component) => component.addedSources.map((line) => ({ ...line, text: `${line.text} × ${round(line.effectiveness ?? 100)}% effectiveness`, category: `Added ${component.type} damage` }))),
      increased: primary?.increased || [], additional: primary?.additional || [], combatAdditional: primary?.combatAdditional || [], taken: primary?.taken || [], penetration: primary?.penetration || [], armourPenetration: primary?.armourPenetration || [], maxOnly: primary?.maxOnly || [], minOnly: primary?.minOnly || []
    },
    scopeLabel,
    notes, warnings,
    inactiveReason,
    // Main-stat shares (chunk 4: the manual's rule also covers "Ailment Damage dealt directly by the skill").
    mainStatParts: statParts,
    // Steep Strike chance (Slash-Strike skills; steepStrikeState): total, sources, share or the Multistrike increment it feeds.
    steepStrike,
    // Gale-type Projectile Speed → Projectile Damage conversion (projectileSpeedState): the increased pool and the lines it gave.
    projectileSpeed: projectileSpeedState ? { increasedPercent: projectileSpeedState.increasedPercent, sources: projectileSpeedState.sources, converters: projectileSpeedState.converters.map(({ source, text, share, layer }) => ({ source, text, share, layer })), lines: galeLines } : null,
    modeled: perUse > 0 && usesPerSecond > 0
  };
}
