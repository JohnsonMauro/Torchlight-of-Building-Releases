import { followers, followerRarities, followerSlotCountSource } from "./data/followers/followers.generated.js";
import { tartarusSkills, tartarusKeywords } from "./data/followers/tartarus-skills.generated.js";
import { DISTANT_STANDING_METERS } from "./dummy-target.js";

// Followers (2026-10-15). A build has one follower: `state.followers = { followerId, rarity, skills }` (src/planner-state.js).
// Data: src/data/followers/*.generated.js (scripts/import-tlidb-followers.mjs, TLIDB + patch notes).
//   - Rarities are the game's (2026-10-15 user answer): a species follower (Lion Queen, Lone Wolf, Mammoth, Witch Rat) comes
//     in Rare (1 skill slot), Epic (2) or Legendary (3); a named follower (TLIDB ULT) is Origin (3) and carries a trait.
//     TLIDB's Normal and Magic letters are Rare, its Rare letters Epic (followerRarities.tlidbTags). The rarity sets the skill
//     slots and the Tartarus Skill tier (I / II / III; the tiers share their text, a tier adds support slots).
//   - Saved states from before the rename (no rarityScheme) carry TLIDB keys; LEGACY_RARITY maps them.
//   - A follower can equip the Tartarus and Origin Tartarus Skills tagged with its species, each skill once.
// Calculation:
//   - followerModifierTexts: the follower's plain player lines (origin "follower") join planner.modifierTexts before the line
//     resolver, so every generic reader takes them like the same gear line. A plain line names the player as a recipient and
//     carries no timing (PLAIN_REWRITES); the other lines need the follower's own casts.
//   - resolveFollowerEffects (src/line-effects.js): the modeled damage buffs (FOLLOWER_BUFFS) as derived lines, each held at
//     its best case (stacks at max, Euphoria held) behind its own best-case switch (combat.bestCaseOverrides; listed through
//     the timed-effect list in src/planner.js bestCaseAssumptions), and one status per line for the badges.
//   - Everything else (the follower's own damage, buffs and debuffs that need its cast cadence or uptime) is Not modeled with
//     the reason, or No DPS effect / Not on dummy.

export { followers, followerRarities, followerSlotCountSource, tartarusSkills, tartarusKeywords };

const followerIndex = new Map(followers.map((follower) => [follower.id, follower]));
const skillIndex = new Map(tartarusSkills.map((skill) => [skill.name, skill]));
const rarityIndex = new Map(followerRarities.map((rarity) => [rarity.id, rarity]));
const keywordIndex = new Map(tartarusKeywords.map((keyword) => [keyword.name.toLowerCase(), keyword]));
const round = (value) => Math.round(value * 10000) / 10000;

export const FOLLOWER_MAX_SLOTS = Math.max(...followerRarities.map((rarity) => rarity.skillSlots));
export const followerById = (id) => followerIndex.get(id) || null;
export const tartarusSkillByName = (name) => skillIndex.get(name) || null;
export const followerRarityById = (id) => rarityIndex.get(id) || null;
export const tartarusKeyword = (name) => keywordIndex.get(String(name || "").toLowerCase()) || null;

export const FOLLOWER_RARITY_SCHEME = "game";
// TLIDB rarity keys stored before 2026-10-15 → the game's rarities.
const LEGACY_RARITY = { normal: "rare", magic: "rare", rare: "epic", legendary: "legendary", ultimate: "origin" };

export function defaultFollowerState() { return { followerId: null, rarity: null, skills: [], rarityScheme: FOLLOWER_RARITY_SCHEME }; }

/** The stored rarity key in the game's scheme (a pre-rename TLIDB key is mapped; "rare" then meant TLIDB Rare, now Epic). */
export function currentFollowerRarityKey(value) {
  const rarity = typeof value?.rarity === "string" ? value.rarity : null;
  if (!rarity || value?.rarityScheme === FOLLOWER_RARITY_SCHEME) return rarity;
  return LEGACY_RARITY[rarity] || rarity;
}

/** The rarity a follower instance has: the stored one when the follower comes in it, else its highest. */
export function followerRarityFor(follower, rarity) {
  if (!follower) return null;
  return follower.rarities.includes(rarity) ? rarity : follower.rarities[follower.rarities.length - 1];
}

/** Skill slots of a follower at a rarity (0 without a follower). */
export function followerSkillSlots(follower, rarity) {
  return follower ? followerRarityById(followerRarityFor(follower, rarity))?.skillSlots ?? 0 : 0;
}

/** The rarity that opens slot `index` (0-based), e.g. "Epic" for the second slot. */
export function followerSlotUnlockRarity(index) {
  return followerRarities.find((rarity) => rarity.skillSlots > index) || null;
}

/** Tartarus and Origin Tartarus Skills a follower can equip (tagged with its species). */
export function eligibleTartarusSkills(follower) {
  return follower ? tartarusSkills.filter((skill) => skill.species.includes(follower.species)) : [];
}

/** "Tartarus: Star Stalker III": a skill at the tier the follower's rarity rolls. */
export function tartarusSkillDisplayName(skill, rarity) {
  const tier = followerRarityById(rarity)?.skillTier;
  return skill ? `${skill.name}${tier ? ` ${tier}` : ""}` : "";
}

/**
 * The stored follower state, cleaned: an unknown follower clears the state; the rarity is one the follower comes in; `skills`
 * has one entry per unlocked slot, each an eligible skill name (once) or null.
 */
export function normalizeFollowerState(value) {
  const follower = followerById(value?.followerId);
  if (!follower) return defaultFollowerState();
  const rarity = followerRarityFor(follower, currentFollowerRarityKey(value));
  const slots = followerSkillSlots(follower, rarity);
  const eligible = new Set(eligibleTartarusSkills(follower).map((skill) => skill.name));
  const seen = new Set();
  const stored = Array.isArray(value.skills) ? value.skills : [];
  const skills = Array.from({ length: slots }, (_, index) => {
    const name = stored[index];
    if (typeof name !== "string" || !eligible.has(name) || seen.has(name)) return null;
    seen.add(name);
    return name;
  });
  return { followerId: follower.id, rarity, skills, rarityScheme: FOLLOWER_RARITY_SCHEME };
}

/** The build's follower: { follower, rarity, slots, tier, skills: [{ slot, skill }] } or null without one. */
export function followerSelection(state) {
  const normalized = normalizeFollowerState(state?.followers);
  const follower = followerById(normalized.followerId);
  if (!follower) return null;
  const rarity = followerRarityById(normalized.rarity);
  return {
    follower, rarity, slots: normalized.skills.length, tier: rarity?.skillTier || "",
    skills: normalized.skills.map((name, slot) => ({ slot, skill: tartarusSkillByName(name) })).filter((entry) => entry.skill)
  };
}

// ---- Plain player lines ----------------------------------------------------------------------------------------------
// A follower line the player gets as written, with the recipient taken off: no timing, no follower-own reference. Each rule
// names the wording it reads (named follower traits; no Tartarus Skill line is plain: every buff there has a duration).
const PLAIN_REWRITES = [
  // Chant of Conquest: "The Follower and allies have Spell Aggression": the player is an ally, so the player has it (read by
  // src/combat-states.js like any "Has Spell Aggression").
  { pattern: /^The Follower and allies have (Spell Aggression|Attack Aggression|Hasten)$/i, to: (match) => `Has ${match[1]}` },
  // "+50% effect for Spell Aggression applied by the Follower": the Spell Aggression the line above grants.
  { pattern: /^\+(\d+(?:\.\d+)?)% effect for (Spell|Attack) Aggression applied by the Follower$/i, to: (match) => `+${match[1]}% ${match[2]} Aggression Effect` },
  // "<stat> for the Follower and you" (Howl of the Pack): the player's too.
  { pattern: /^([+-]\d+(?:\.\d+)?% [A-Za-z' ]+?) for the Follower and you$/i, to: (match) => match[1] }
];
const TIMING = /\b(?:for \d+(?:\.\d+)? ?s|Lasts|Interval|recently|Stacks up to|every|when|while|on hit|upon)\b/i;

/** The player-side text of a plain follower line, or null. */
export function plainFollowerLine(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  for (const rule of PLAIN_REWRITES) {
    const match = clean.match(rule.pattern);
    if (match) { const body = rule.to(match); return TIMING.test(body) ? null : body; }
  }
  return null;
}

// Every line the follower carries: its trait (named followers) and its equipped skills.
function followerLines(selection) {
  if (!selection) return [];
  const { follower, rarity } = selection;
  const traitSource = `Follower: ${follower.displayName} (${follower.traitName || "trait"})`;
  return [
    ...follower.traitLines.map((text) => ({ text, source: traitSource, kind: "trait", skill: null })),
    ...selection.skills.flatMap(({ skill, slot }) => skill.lines.map((text) => ({ text, source: `Follower: ${tartarusSkillDisplayName(skill, rarity?.id)} (${follower.displayName}, slot ${slot + 1})`, kind: "skill", skill })))
  ];
}

/** The follower's plain player lines for planner.modifierTexts (origin "follower"). */
export function followerModifierTexts(state) {
  return followerLines(followerSelection(state)).flatMap((line) => {
    const body = plainFollowerLine(line.text);
    return body ? [{ text: body, source: line.source, origin: "follower", multiplier: 1, derivedFrom: line.text }] : [];
  });
}

// ---- Modeled damage buffs --------------------------------------------------------------------------------------------
// Each buff reads its value from the skill text (patch-note values applied by the importer), is held at its best case on the
// dummy and has its own best-case switch (`id`, a combat condition). `engine` names what takes it (src/follower-panel.js badge):
// "dot" every damage over time, "spell" Spell hits and a Spell skill's own damage over time, "steep" Steep Strike hits. Stacks multiply ("(multiplies)"): n stacks of X% give
// (1 + X%)^n − 1 additional.
export const FOLLOWER_BUFFS = [
  {
    id: "followerStarStalker", skill: "Tartarus: Star Stalker", label: "Star Stalker: Euphoria", target: "self", needsNear: true, engine: "dot",
    pattern: /allies gain Euphoria: \+?(\d+(?:\.\d+)?)% additional Damage Over Time/i,
    derive: (match) => ({ text: `+${round(Number(match[1]))}% additional Damage Over Time`, origin: "buff", summary: `Euphoria held: +${round(Number(match[1]))}% additional Damage Over Time` }),
    reason: "best case: the star bolt tracks Elites and attaches to the dummy (an Elite), you stand close inside its area, and it lasts 4 s on a 4 s cooldown, so Euphoria is held, from t = 0 in the 5 s / 20 s windows"
  },
  {
    id: "followerLightningBeam", skill: "Tartarus: Lightning Beam", label: "Lightning Beam: Spell Damage taken", target: "enemy", needsNear: false, engine: "spell",
    pattern: /^\+?(\d+(?:\.\d+)?)% additional Spell Damage taken by enemies \(multiplies\) for each time this skill hits recently\. Stacks up to (\d+) time\(s\)$/i,
    derive: (match) => { const value = round(((1 + Number(match[1]) / 100) ** Number(match[2]) - 1) * 100); return { text: `+${value}% additional Spell Damage taken`, origin: "derived", summary: `${match[2]} stacks × ${round(Number(match[1]))}% (multiplies): +${value}% additional Spell Damage taken` }; },
    reason: "best case: the follower casts Lightning Beam (3 beams, no cooldown) at the dummy, so the stacks stay at max, held from t = 0 in the 5 s / 20 s windows; Spell hits and a Spell skill's own damage over time take it, ailments do not (the Frail rule)"
  },
  {
    id: "followerThunderSlash", skill: "Origin Tartarus: Thunder Slash", label: "Thunder Slash: Steep Strike Damage", target: "self", needsNear: true, engine: "steep",
    pattern: /^\+?(\d+(?:\.\d+)?)% additional Steep Strike Damage \(multiplies\) for the Follower and nearby allies for each Steep Strike cast recently\. Stacks up to (\d+) time\(s\)$/i,
    derive: (match) => { const value = round(((1 + Number(match[1]) / 100) ** Number(match[2]) - 1) * 100); return { text: `+${value}% additional Steep Strike Damage`, origin: "buff", summary: `${match[2]} stacks × ${round(Number(match[1]))}% (multiplies): +${value}% additional Steep Strike Damage` }; },
    reason: "best case: the stacks stay at max while the follower keeps casting Steep Strikes next to you, from t = 0 in the 5 s / 20 s windows; only Steep Strike hits take it (patch notes: \"Slash Damage\")"
  }
];

// ---- Line statuses ---------------------------------------------------------------------------------------------------
const NEEDS_CADENCE = "needs the follower's cast cadence and uptime, which no source gives";
const RULES = [
  [/:$/, "No DPS effect", "a heading of the skill text"],
  [/^(?:Lasts \d|Cooldown: ?\d|Interval: ?\d|Strikes once every|[A-Za-z ]+ lasts \d+(?:\.\d+)? ?s$)/i, "No DPS effect", "the follower skill's own timing"],
  [/Eliminates enemies with Life below/i, "Not on dummy", "the training dummy is never eliminated"],
  [/-50% additional Non-Sentry Skill Damage for you/i, "No DPS effect", "the follower's own penalty (patch notes: \"makes you deal -50% less damage with non-Sentry skills\", where \"you\" is the follower)"],
  [/\breaps?\b/i, "Not modeled", `the follower's Reap of your damage over time ${NEEDS_CADENCE}`],
  [/Reaping Duration/i, "Not modeled", `an ally buff that ${NEEDS_CADENCE}`],
  [/\bYou take -\d|\bWhen taking damage\b|Max Elemental and Erosion Resistance|\b(?:Elemental Shield|Temporary Life|Fatal Damage|defensive effect|restores?|Max Life|Energy Shield|Life Regain|Fortify|Synergy Shift|Movement Speed|Projectile Speed|Stealth|Ashen Shroud|Blinks? to)\b/i, "No DPS effect", "defence, recovery or movement"],
  [/^Every \d+(?:\.\d+)? ?s,/i, "Not modeled", "a periodic effect on the follower's own clock that is not modeled yet"],
  [/\b(?:damage taken|takes? \+?\d+|Infiltration|Ill Will|Numbed|Frostbite|Mark|Claw Mark|Barbarian Intimidation|Crowd Control|Curses?)\b/i, "Not modeled", `an enemy debuff that ${NEEDS_CADENCE}`],
  [/\b(?:Deals?|dealing)\b[^.]*?\d+(?:\.\d+)? ?- ?\d+(?:\.\d+)?|^\d+(?:\.\d+)? ?- ?\d+(?:\.\d+)? (?:Attack|Spell|Hit|Persistent)|\bInflicts? \d+ stack\(s\) of Wilt|Base (?:Wilt|Trauma) Damage to this skill|chance for this skill to inflict Trauma/i, "Not modeled", "the follower's own damage (hits, damage over time and the ailments it inflicts) is not counted on the dummy"],
  [/\b(?:allies|you\b|the caster and you|Follower and you|Rat Guard|Water Area|Euphoria|Ferocity|Fervor|Mystic Spread|Projectile Amplification|Spell Aggression|Blur)\b/i, "Not modeled", `an ally buff that ${NEEDS_CADENCE}`],
  [/\b(?:this skill|this unit|the Follower|Sentr(?:y|ies)|Shadows?|Projectiles?|Shotgun|Jumps?|Penetration|Steep Strike|Sweep Slash|Ash\b|Icy Blade|Elemental Resonance|Warcry|Knock)/i, "No DPS effect", "the follower's own skill mechanics"]
];

/** Status of one follower line that no modeled buff reads: { status, reason }. A trait line that matches no rule names no
 * recipient, so it reads as the follower's own stat. */
export function followerLineStatus(text, kind = "skill") {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  for (const [pattern, status, reason] of RULES) if (pattern.test(clean)) return { status, reason };
  return kind === "trait" ? { status: "Not modeled", reason: "the trait names no recipient: read as the follower's own stat" } : { status: "Not modeled", reason: "no reader for this follower line" };
}

/**
 * The follower's modeled buffs and the reading of every line (src/line-effects.js).
 * @param {object|null} selection followerSelection(state)
 * @param {object} state the line-condition state (requestedConditions, nearTarget)
 * @returns {{ selection, lines, derived, timedEffects, buffs }}
 */
export function resolveFollowerEffects(selection, state = {}) {
  const result = { selection, lines: [], derived: [], timedEffects: [], buffs: [] };
  if (!selection) return result;
  const conditionOn = (id) => state[id] !== false && state.requestedConditions?.[id] !== false;
  const near = state.nearTarget !== false;
  for (const line of followerLines(selection)) {
    const plain = plainFollowerLine(line.text);
    const buff = line.skill ? FOLLOWER_BUFFS.find((item) => item.skill === line.skill.name && item.pattern.test(line.text)) : null;
    if (buff) {
      const derived = buff.derive(line.text.match(buff.pattern));
      const on = conditionOn(buff.id);
      const active = on && (!buff.needsNear || near);
      const reason = !on ? `the "${buff.label}" best-case switch is off: left out` : !active ? `the Distant alternative stands ${DISTANT_STANDING_METERS} m away, outside the follower's area` : buff.reason;
      result.lines.push({ text: line.text, source: line.source, skill: line.skill.name, status: active ? "In calc" : "Inactive", reason, toggle: buff.id, derivedText: derived.text, active });
      result.buffs.push({ id: buff.id, label: buff.label, source: line.source, active, on, text: derived.text, summary: derived.summary, reason });
      // Listed in the Config tab's best-case assumptions as "<label> (<follower> follower)" (src/planner.js bestCaseAssumptions).
      result.timedEffects.push({ id: buff.id, label: buff.label, source: `${selection.follower.displayName} follower`, target: buff.target, toggle: true, enabled: on, active, reason, summary: derived.summary, parts: [] });
      if (active) result.derived.push({ text: derived.text, source: `${line.source}: ${buff.label}`, origin: derived.origin, multiplier: 1, derivedFrom: line.text, lineEffect: { conditional: true, key: "follower", conditionText: reason, provisional: false } });
      continue;
    }
    if (plain) { result.lines.push({ text: line.text, source: line.source, skill: line.skill?.name || null, status: null, reason: `read as "${plain}" for you`, plainText: plain }); continue; }
    const { status, reason } = followerLineStatus(line.text, line.kind);
    result.lines.push({ text: line.text, source: line.source, skill: line.skill?.name || null, status, reason });
  }
  return result;
}

/** What a modeled buff needs that the build lacks ("" when the build has it): `engines` is src/line-coverage.js plannerEngines. */
export function missingFollowerEngine(engine, planner, engines) {
  if (!engines) return "";
  const spellDot = (engines.dots || []).some((dot) => (planner?.activation?.setups?.find((setup) => setup.setupKey === dot.setupKey)?.tags || []).includes("Spell"));
  if (engine === "dot" && !engines.anyDot) return "no damage over time on the dummy in this build";
  if (engine === "spell" && !engines.spellHit && !spellDot) return "no Spell hit or Spell skill damage over time in this build";
  if (engine === "steep" && !(engines.hits || []).some((hit) => (hit.components || []).some((component) => /^Steep Strike/.test(component.label || "") && component.hitsPerUse > 0))) return "no modeled hit lands Steep Strikes in this build";
  return "";
}

/**
 * After the planner's pass (src/planner.js calculatePlanner): a modeled buff whose damage the build does not deal changes no
 * figure, so it is listed as not applied (Config tab, recount assumptions) and its line reads Inactive with the reason.
 */
export function settleFollowerBuffs(planner, engines) {
  const follower = planner?.follower;
  if (!follower || !engines) return;
  for (const buff of FOLLOWER_BUFFS) {
    const missing = missingFollowerEngine(buff.engine, planner, engines);
    if (!missing) continue;
    for (const effect of (planner.lineEffects?.combat?.timedEffects || []).filter((item) => item.id === buff.id && item.active)) { effect.active = false; effect.reason = missing; }
    for (const line of follower.lines.filter((item) => item.toggle === buff.id && item.active)) { line.active = false; line.status = "Inactive"; line.reason = missing; }
    for (const item of follower.buffs.filter((entry) => entry.id === buff.id && entry.active)) { item.active = false; item.reason = missing; }
  }
}
