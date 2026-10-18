import { followers, followerRarities, followerSlotCountSource } from "./data/followers/followers.generated.js";
import { tartarusSkills, tartarusKeywords } from "./data/followers/tartarus-skills.generated.js";
import { DISTANT_STANDING_METERS } from "./dummy-target.js";

// Followers (2026-10-15). A build has one follower: `state.followers = { followerId, rarity, skills }` (src/planner-state.js).
// Data: src/data/followers/*.generated.js (scripts/import-tlidb-followers.mjs, TLIDB + patch notes).
//   - Rarities are the game's (2026-10-15 user answer): a species follower (Lion Queen, Lone Wolf, Mammoth, Witch Rat) comes
//     in Rare (1 skill slot), Epic (2) or Legendary (3); a named follower (TLIDB ULT) is Origin (3) and carries a trait.
//     TLIDB's Normal and Magic letters are Rare, its Rare letters Epic (followerRarities.tlidbTags). The rarity sets the skill
//     slots and the Tartarus Skill tier (I / II / III). TLIDB's tier pages (e.g. Tartarus_Star_Stalker_I and _III, cached in
//     research/tlidb-ss14/fetch-cache/) print the same text, level, cast time and cooldown: a tier only adds random support
//     affix slots (tiers.N.randomSupports), which are rolled and not modeled.
//   - Saved states from before the rename (no rarityScheme) carry TLIDB keys; LEGACY_RARITY maps them.
//   - A follower can equip the Tartarus and Origin Tartarus Skills tagged with its species, each skill once.
// Calculation:
//   - followerModifierTexts: the follower's plain player lines (origin "follower") join planner.modifierTexts before the line
//     resolver, so every generic reader takes them like the same gear line. A plain line names the player as a recipient and
//     carries no timing (PLAIN_REWRITES). The same list carries the follower's marks on the dummy (FOLLOWER_MARKERS: the
//     ailments its skills inflict, read by src/enemy-ailments.js; its Mark, read by src/mark-effect.js) and the penalties its
//     Sweep Slashes put on your Fervor / Frostbite Effect (src/combat-states.js).
//   - resolveFollowerEffects (src/line-effects.js): the modeled buffs and debuffs (FOLLOWER_BUFFS) as derived lines, each at
//     its best case (the follower casts each skill on cooldown: followerCadence) behind its own best-case switch
//     (combat.bestCaseOverrides; listed through the timed-effect list in src/planner.js bestCaseAssumptions), with timed parts
//     (src/timed-effects.js) where the uptime or the stacks change over the 5 s / 20 s windows, and one status per line.
//   - followerDamageSources (src/planner.js damagePaths and the dummy recount): the follower's own damage as its own source,
//     at TLIDB's Lv.20 numbers and its cadence (OWN_DAMAGE).
//   - followerReapSources (src/planner.js builtInReaps): Origin Tartarus: Scorching Pulse's Reap of every DoT on the dummy.
//   - followerBlurSources (src/planner.js blurSources): Tartarus: Thunder Spike's Blur for you.
//   - Everything else is Not modeled with the reason, or No DPS effect / Not on dummy.
// Every follower reading here is provisional (2026-10-17, research/followers/wilting-beam-follower-ranking.md): no in-game
// follower test calibrates it.

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

// ---- Cadence ---------------------------------------------------------------------------------------------------------
// When the follower casts each equipped skill (2026-10-17, provisional; best case: every skill is cast as soon as it can be).
// TLIDB gives each skill's cast time ("Cast Speed 1.54 s") and cooldown; the follower's own Cast / Attack Speed is not
// published, so the cast times are taken as printed.
//   - A skill with a cooldown is cast on cooldown: period = max(cast time, cooldown) (the cooldown starts at the cast).
//   - A skill whose area lasts (a Terra, Tidewell's Water Area, Lightning Storm) is recast when the area ends: period ≥ its
//     duration (a new cast would only replace it).
//   - The skills without a cooldown share the rest of the follower's time equally (period = cast time × count ÷ free share).
//     If the cooldown skills alone fill more than the follower's time, every period stretches by that factor.
//   - Skill rules from the text: Blink "+20% additional Cooldown Recovery Speed for each enemy within 10m" (the dummy: ×1.2);
//     Shadow Dash "+20% Cooldown Recovery Speed for each cast of a Mobility Skill other than this skill recently" (the
//     follower's other Mobility casts in the last 4 s, up to 10); Origin Focused Slash "-70% additional Attack Speed".
export const FOLLOWER_RECENT_SECONDS = 4;
const AREA_SECONDS = { "Tartarus: Nether Grasp": 6, "Tartarus: Frost Terra": 6, "Tartarus: Tidewell": 6, "Tartarus: Lightning Storm": 1.5 };

function cadencePass(skills, shadowDashStacks, castSpeedPercent = 0) {
  const fixed = [], free = [];
  for (const skill of skills) {
    const notes = [];
    let cast = Number(skill.castTime) || 1;
    if (castSpeedPercent && skill.tags.includes("Spell")) { cast /= 1 + castSpeedPercent / 100; notes.push(`cast time ${round(cast)} s with the follower's +${round(castSpeedPercent)}% Cast Speed`); }
    const slow = skill.lines.join("\n").match(/^-(\d+(?:\.\d+)?)% additional Attack Speed for this skill$/im);
    if (slow) { cast /= 1 - Number(slow[1]) / 100; notes.push(`cast time ${round(cast)} s after "${slow[0]}"`); }
    let cooldown = Number(skill.cooldown) || 0;
    if (/additional Cooldown Recovery Speed for this skill for each enemy within 10m/i.test(skill.lines.join("\n"))) { cooldown /= 1.2; notes.push("+20% additional Cooldown Recovery Speed: the dummy is within 10 m"); }
    if (/Cooldown Recovery Speed for this skill for each cast of a Mobility Skill other than this skill recently/i.test(skill.lines.join("\n")) && shadowDashStacks > 0) { cooldown /= 1 + 0.2 * shadowDashStacks; notes.push(`+${round(20 * shadowDashStacks)}% Cooldown Recovery Speed from ${round(shadowDashStacks)} other Mobility casts in the last ${FOLLOWER_RECENT_SECONDS} s`); }
    const area = AREA_SECONDS[skill.name] || 0;
    if (area) notes.push(`recast when its ${area} s area ends`);
    const gate = Math.max(cooldown, area);
    (gate > 0 ? fixed : free).push({ name: skill.name, skill, castSeconds: cast, cooldownSeconds: cooldown, areaSeconds: area, periodSeconds: gate > 0 ? Math.max(cast, gate) : null, notes });
  }
  const busy = fixed.reduce((sum, entry) => sum + entry.castSeconds / entry.periodSeconds, 0);
  if (busy > 1) for (const entry of fixed) { entry.periodSeconds *= busy; entry.notes.push(`stretched ×${round(busy)}: the cooldown skills alone fill the follower's time`); }
  const freeShare = Math.max(0, 1 - Math.min(1, busy));
  for (const entry of free) { entry.periodSeconds = freeShare > 0 ? entry.castSeconds * free.length / freeShare : Infinity; entry.notes.push(free.length > 1 || freeShare < 1 ? `no cooldown: shares ${round(freeShare * 100)}% of the follower's time with ${free.length - 1} other skill(s) without one` : "no cooldown: cast back to back"); }
  return [...fixed, ...free].map((entry) => ({ ...entry, castsPerSecond: Number.isFinite(entry.periodSeconds) && entry.periodSeconds > 0 ? 1 / entry.periodSeconds : 0 }));
}

/** Per equipped skill: { castSeconds, cooldownSeconds, periodSeconds, castsPerSecond, notes } (a Map by skill name). */
export function followerCadence(selection) {
  const skills = (selection?.skills || []).map((entry) => entry.skill).filter(Boolean);
  // A named follower's trait "+X% Cast Speed" (no recipient: the follower's own; Chant of Conquest) speeds its Spell casts.
  const castSpeed = (selection?.follower?.traitLines || []).reduce((sum, text) => sum + (Number(String(text).match(/^\+(\d+(?:\.\d+)?)% Cast Speed$/i)?.[1]) || 0), 0);
  let entries = cadencePass(skills, 0, castSpeed);
  const dash = skills.find((skill) => /Cooldown Recovery Speed for this skill for each cast of a Mobility Skill other than this skill recently/i.test(skill.lines.join("\n")));
  if (dash) {
    const others = entries.filter((entry) => entry.name !== dash.name && entry.skill.tags.includes("Mobility")).reduce((sum, entry) => sum + entry.castsPerSecond * FOLLOWER_RECENT_SECONDS, 0);
    if (others > 0) entries = cadencePass(skills, Math.min(10, others), castSpeed);
  }
  return new Map(entries.map((entry) => [entry.name, entry]));
}

const cadenceText = (entry) => entry ? `cast every ${round(entry.periodSeconds)} s (${entry.notes.join("; ") || "on cooldown"})` : "not cast";
const uptimeOf = (durationSeconds, entry) => entry && entry.castsPerSecond > 0 ? Math.min(1, durationSeconds * entry.castsPerSecond) : 0;
// Warcry Skill Effect on the follower's own Warcries: Howl of the Pack's "+20% Warcry Skill Effect for the Follower and you"
// (provisional: Warcry Skill Effect scales the Warcry's buff values).
const warcryEffectFactor = (selection) => 1 + (selection?.follower?.traitLines || []).reduce((sum, text) => { const match = String(text).match(/^\+(\d+(?:\.\d+)?)% Warcry Skill Effect for the Follower and you$/i); return sum + (match ? Number(match[1]) : 0); }, 0) / 100;
const durationLine = (skill) => Number(skill?.lines.join("\n").match(/^Lasts (\d+(?:\.\d+)?) ?s$/im)?.[1]) || null;

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

// ---- Marks on the dummy and penalties (plain lines with a fixed reading) ---------------------------------------------
// The follower's skill text, read once into a line the generic readers take (origin "follower"), with its status. Each has a
// reason; the follower casts the skill at its cadence, so the mark is held on the dummy (best case, provisional).
//   - An ailment the follower inflicts: "The Follower inflicts <Ailment> on the dummy" (src/enemy-ailments.js), so the dummy
//     counts it as an Ailment (and Numbed / Frostbite take their effect in src/combat-states.js).
//   - Forking Thunder's Mark (guaranteed crits): "+100% chance to Mark the enemy on hit" (src/mark-effect.js: +10% additional
//     Critical Strike Damage taken on your hits' crit share while you hit the dummy).
//   - Focused Slash / Icy Blade "-5% <Effect> for nearby allies for each Sweep Slash launched by this skill recently": the
//     follower's Sweep Slashes in the last 4 s, up to the cap, as "-X% Fervor effect" / "-X% Frostbite Effect" on you.
export const FOLLOWER_MARKERS = [
  { skill: "Tartarus: Lightning Storm", pattern: /^Inflicts Numbed when this skill deals Hit Lightning Damage$/i, texts: () => ["The Follower inflicts Numbed on the dummy"], reason: "the dummy is Numbed by the follower's storm (every strike is a Lightning hit): an Ailment on the dummy, +5% additional Lightning Damage taken per stack, 10 stacks (src/combat-states.js)" },
  { skill: "Tartarus: Frost Terra", pattern: /^Inflicts Frostbite when this skill deals damage$/i, texts: () => ["The Follower inflicts Frostbite on the dummy"], reason: "the dummy is Frostbitten by the follower's Terra: an Ailment and a crowd control type on the dummy, with your Frostbite Rating's Cold Damage taken (src/combat-states.js; the follower's own rating is not published)" },
  { skill: "Tartarus: Frigid Transmission", pattern: /\binflicting Frostbite$/i, texts: () => ["The Follower inflicts Frostbite on the dummy"], reason: "the dummy is Frostbitten by the follower's ice (and its own Cold hit is counted): an Ailment and a crowd control type, with your Frostbite Rating's Cold Damage taken (src/combat-states.js)" },
  { skill: "Tartarus: Wilt Spike", pattern: /^Inflicts 1 stack\(s\) of Wilt when this skill hits$/i, texts: () => ["The Follower inflicts Wilt on the dummy"], reason: "the dummy carries the follower's Wilt: an Ailment on the dummy (its own Wilt damage, 1 base per stack, is not counted)" },
  { skill: "Tartarus: Double Thrusts", pattern: /^\+30% chance for this skill to inflict Trauma$/i, texts: () => ["The Follower inflicts Trauma on the dummy"], reason: "the follower's two thrusts each cast give a 30% chance (1 − 0.7² = 51% per cast) and Trauma lasts 4 s, so the dummy keeps Trauma (an Ailment on the dummy; its own Trauma damage, 1 base, is not counted)" },
  { skill: "Tartarus: Forking Thunder", pattern: /^This skill inflicts Mark on Critical Strike$/i, texts: () => ["+100% chance to Mark the enemy on hit"], reason: "the follower's spear always crits, so it Marks the dummy each cast: +10% additional Critical Strike Damage taken on your hits' crit share (src/mark-effect.js, the Marked dummy switch)" },
  { skill: "Tartarus: Focused Slash", pattern: /^-(\d+(?:\.\d+)?)% Fervor Effect for nearby allies for each Sweep Slash launched by this skill recently\. Stacks up to (\d+) time\(s\)$/i, texts: (match, entry) => { const stacks = Math.min(Number(match[2]), entry ? entry.castsPerSecond * FOLLOWER_RECENT_SECONDS : 0); return stacks > 0 ? [`-${round(Number(match[1]) * stacks)}% Fervor effect`] : []; }, reason: (match, entry) => `a penalty on your Fervor: the follower never launches a Steep Strike (no Steep Strike chance), so every cast is a Sweep Slash: ${round(Math.min(Number(match[2]), entry ? entry.castsPerSecond * FOLLOWER_RECENT_SECONDS : 0))} stacks in the last ${FOLLOWER_RECENT_SECONDS} s (${cadenceText(entry)}), -${round(Number(match[1]) * Math.min(Number(match[2]), entry ? entry.castsPerSecond * FOLLOWER_RECENT_SECONDS : 0))}% Fervor effect (src/combat-states.js)` },
  { skill: "Tartarus: Icy Blade", pattern: /^-(\d+(?:\.\d+)?)% Frostbite Effect for nearby allies for each Sweep Slash launched by this skill recently\. Stacks up to (\d+) time\(s\)$/i, texts: (match, entry) => { const stacks = Math.min(Number(match[2]), entry ? entry.castsPerSecond * FOLLOWER_RECENT_SECONDS : 0); return stacks > 0 ? [`-${round(Number(match[1]) * stacks)}% Frostbite Effect`] : []; }, reason: (match, entry) => `a penalty on your Frostbite Effect: the follower never launches a Steep Strike, so every cast is a Sweep Slash: ${round(Math.min(Number(match[2]), entry ? entry.castsPerSecond * FOLLOWER_RECENT_SECONDS : 0))} stacks in the last ${FOLLOWER_RECENT_SECONDS} s (${cadenceText(entry)}) (src/combat-states.js)` }
];

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

const clean = (text) => String(text || "").replace(/\s+/g, " ").trim();
const markerFor = (line) => line.skill ? FOLLOWER_MARKERS.find((item) => item.skill === line.skill.name && item.pattern.test(clean(line.text))) : null;

/** The follower's plain player lines and marks for planner.modifierTexts (origin "follower"). */
export function followerModifierTexts(state) {
  const selection = followerSelection(state);
  const cadence = followerCadence(selection);
  return followerLines(selection).flatMap((line) => {
    const marker = markerFor(line);
    if (marker) return marker.texts(clean(line.text).match(marker.pattern), cadence.get(line.skill.name)).map((text) => ({ text, source: line.source, origin: "follower", multiplier: 1, derivedFrom: line.text }));
    const body = plainFollowerLine(line.text);
    return body ? [{ text: body, source: line.source, origin: "follower", multiplier: 1, derivedFrom: line.text }] : [];
  });
}

// ---- Modeled buffs and debuffs ---------------------------------------------------------------------------------------
// Each buff reads its value from the skill text (patch-note values applied by the importer), is held at its best case on the
// dummy and has its own best-case switch (`id`, a combat condition). `engine` names what takes it (src/follower-panel.js badge):
// "dot" every damage over time, "spell" Spell hits and a Spell skill's own damage over time, "spellTaken" Spell hits only (an
// enemy "Spell Damage taken" debuff; 2026-10-18 user-supplied: Spell Damage taken is hit-only), "steep" Steep Strike hits,
// "affliction" damage over time with Affliction, "reaping" Reaps, "stat" a stat with no damage of its own. Stacks multiply
// ("(multiplies)"): n stacks of X% give (1 + X%)^n − 1 additional; stacks without "(multiplies)" add up.
// derive(match, ctx) → { text, origin, summary, texts?, parts?, inactive?, noDps? }: `ctx` has the selection, the cadence of
// the equipped skills (followerCadence), the line-condition state and the follower's skill. A buff whose duration covers its
// period is held from t = 0 in the windows (the follower casts at t = 0: user decision 2026-10-13 for cooldown buffs); a buff
// with a shorter uptime carries its time average in the ledgers and a periodic part for the windows when it is a damage
// multiplier; stacks on the dummy ramp up from one (the dummy starts clean).
const ctxEntry = (ctx) => ctx?.cadence?.get(ctx?.skill?.name) || followerCadence({ skills: ctx?.skill ? [{ skill: ctx.skill }] : [] }).get(ctx?.skill?.name) || null;
const warcry = (label, keyword) => ({ match, ctx, value, text }) => {
  const entry = ctxEntry(ctx);
  const duration = durationLine(ctx?.skill) || 3;
  const effect = warcryEffectFactor(ctx?.selection);
  const uptime = uptimeOf(duration, entry);
  const applied = round(value * effect * uptime);
  return { text: text(applied), origin: "buff", summary: `${label}: +${round(value * effect)}%${effect !== 1 ? ` (×${round(effect)} Warcry Skill Effect)` : ""} for ${duration} s, ${cadenceText(entry)}: ${round(uptime * 100)}% uptime, +${applied}% time-averaged (${keyword})` };
};

export const FOLLOWER_BUFFS = [
  {
    id: "followerStarStalker", skill: "Tartarus: Star Stalker", label: "Star Stalker: Euphoria", target: "self", needsNear: true, engine: "dot",
    pattern: /allies gain Euphoria: \+?(\d+(?:\.\d+)?)% additional Damage Over Time/i,
    derive: (match) => ({ text: `+${round(Number(match[1]))}% additional Damage Over Time`, origin: "buff", summary: `Euphoria held: +${round(Number(match[1]))}% additional Damage Over Time` }),
    reason: "best case: the star bolt tracks Elites and attaches to the dummy (an Elite), you stand close inside its area, and it lasts 4 s on a 4 s cooldown, so Euphoria is held, from t = 0 in the 5 s / 20 s windows"
  },
  {
    id: "followerLightningBeam", skill: "Tartarus: Lightning Beam", label: "Lightning Beam: Spell Damage taken", target: "enemy", needsNear: false, engine: "spellTaken",
    pattern: /^\+?(\d+(?:\.\d+)?)% additional Spell Damage taken by enemies \(multiplies\) for each time this skill hits recently\. Stacks up to (\d+) time\(s\)$/i,
    derive: (match) => { const value = round(((1 + Number(match[1]) / 100) ** Number(match[2]) - 1) * 100); return { text: `+${value}% additional Spell Damage taken`, origin: "derived", summary: `${match[2]} stacks × ${round(Number(match[1]))}% (multiplies): +${value}% additional Spell Damage taken` }; },
    reason: "best case: the follower casts Lightning Beam (3 beams, no cooldown) at the dummy, so the stacks stay at max, held from t = 0 in the 5 s / 20 s windows; Spell hits only, not DoT, ailments or Reaps (2026-10-18 user-supplied: Spell Damage taken is hit-only)"
  },
  {
    id: "followerThunderSlash", skill: "Origin Tartarus: Thunder Slash", label: "Thunder Slash: Steep Strike Damage", target: "self", needsNear: true, engine: "steep",
    pattern: /^\+?(\d+(?:\.\d+)?)% additional Steep Strike Damage \(multiplies\) for the Follower and nearby allies for each Steep Strike cast recently\. Stacks up to (\d+) time\(s\)$/i,
    derive: (match) => { const value = round(((1 + Number(match[1]) / 100) ** Number(match[2]) - 1) * 100); return { text: `+${value}% additional Steep Strike Damage`, origin: "buff", summary: `${match[2]} stacks × ${round(Number(match[1]))}% (multiplies): +${value}% additional Steep Strike Damage` }; },
    reason: "best case: the stacks stay at max while the follower keeps casting Steep Strikes next to you, from t = 0 in the 5 s / 20 s windows; only Steep Strike hits take it (patch notes: \"Slash Damage\")"
  },
  // ---- 2026-10-17 (research/followers/wilting-beam-follower-ranking.md): the rest of the Tartarus / Origin Tartarus Skills and
  // follower traits that change your damage on one dummy. All provisional.
  {
    // "+8% additional Affliction Effect for allies for 4 s when this skill deals damage": the hole deals damage for 4 s, so the
    // buff lasts until 4 s after it closes (8 s per cast) against a 6 s cooldown: held. It multiplies Affliction's effect
    // ("Additional Affliction effect", src/build-mechanics.js) on every DoT and Reap; the town panel has no follower casts.
    id: "followerBlackHole", skill: "Tartarus: Black Hole", label: "Black Hole: Affliction Effect", target: "self", needsNear: false, engine: "affliction",
    pattern: /^\+?(\d+(?:\.\d+)?)% additional Affliction Effect for allies for (\d+(?:\.\d+)?) ?s when this skill deals damage$/i,
    derive: (match, ctx) => {
      const entry = ctxEntry(ctx), covered = (durationLine(ctx?.skill) || 4) + Number(match[2]);
      const uptime = uptimeOf(covered, entry), value = round(Number(match[1]) * uptime);
      return { text: `+${value}% additional Affliction effect`, origin: "follower", summary: `+${round(Number(match[1]))}% additional Affliction Effect, refreshed by every tick of the ${durationLine(ctx?.skill) || 4} s hole and lasting ${match[2]} s after it (${covered} s per cast), ${cadenceText(entry)}: ${round(uptime * 100)}% uptime` };
    },
    reason: "best case: the follower casts Black Hole on cooldown at the dummy; the buff is refreshed while the hole deals damage, so it outlasts the cooldown and is held from t = 0 in the windows (it reaches every damage over time and Reap through Affliction)"
  },
  {
    // Ferocity (keyword 10000118): "+10% additional Physical Damage and -3% additional damage taken. Physical Damage cannot be
    // converted to other types." Only the damage part is read; the conversion lock is not modeled (a build that converts its
    // Physical Damage would lose the conversion).
    id: "followerFerocity", skill: "Tartarus: Double Thrusts", label: "Double Thrusts: Ferocity", target: "self", needsNear: true, engine: "physical",
    pattern: /^This unit and nearby allies gain Ferocity for (\d+(?:\.\d+)?) ?s when this skill deals damage$/i,
    derive: (match, ctx) => {
      const entry = ctxEntry(ctx), uptime = uptimeOf(Number(match[1]), entry), value = round(10 * uptime);
      return { text: `+${value}% additional Physical Damage`, origin: "buff", summary: `Ferocity (+10% additional Physical Damage) for ${match[1]} s per cast, ${cadenceText(entry)}: ${round(uptime * 100)}% uptime; its -3% damage taken is defence and "Physical Damage cannot be converted" is not modeled` };
    },
    reason: "best case: you stand next to the follower thrusting at the dummy, so Ferocity is refreshed each cast"
  },
  {
    // Fire Infiltration (keyword 10000103): "Additionally increases Fire Damage taken by 13%"; the skill's +100% Infiltration
    // Effect doubles it. Held while the follower keeps hitting (the keyword names no duration; provisional, as for your own
    // Infiltration on hit in src/combat-states.js).
    id: "followerBlazingMeteor", skill: "Tartarus: Blazing Meteor", label: "Blazing Meteor: Fire Infiltration", target: "enemy", needsNear: false, engine: "fire",
    pattern: /^Inflicts Fire Infiltration when this skill hits, and \+(\d+(?:\.\d+)?)% Fire Infiltration Effect$/i,
    derive: (match, ctx) => { const value = round(13 * (1 + Number(match[1]) / 100)); return { text: `+${value}% additional Fire Damage taken`, origin: "derived", summary: `Fire Infiltration 13% × (1 + ${match[1]}% effect) = +${value}% additional Fire Damage taken, ${cadenceText(ctxEntry(ctx))}` }; },
    reason: "best case: the follower keeps hitting the dummy, so Fire Infiltration is held (its keyword names no duration: provisional)"
  },
  {
    id: "followerBlink", skill: "Tartarus: Blink", label: "Blink: Skill Effect Duration and Cooldown Recovery Speed", target: "self", needsNear: false, engine: "stat",
    pattern: /^\+(\d+(?:\.\d+)?)% Skill Effect Duration and \+(\d+(?:\.\d+)?)% Cooldown Recovery Speed for allies for (\d+(?:\.\d+)?) ?s when casting this skill$/i,
    derive: (match, ctx) => {
      const entry = ctxEntry(ctx), uptime = uptimeOf(Number(match[3]), entry);
      return { text: `+${round(Number(match[1]) * uptime)}% Skill Effect Duration`, texts: [{ text: `+${round(Number(match[2]) * uptime)}% Cooldown Recovery Speed`, origin: "buff" }], origin: "buff", summary: `+${match[1]}% Skill Effect Duration and +${match[2]}% Cooldown Recovery Speed for ${match[3]} s, ${cadenceText(entry)}: ${round(uptime * 100)}% uptime` };
    },
    reason: "best case: the follower blinks on cooldown (shortened by the dummy within 10 m), so the buff is held; stats only, read wherever a skill's duration or cooldown is modeled"
  },
  {
    id: "followerLeapAttack", skill: "Tartarus: Leap Attack", label: "Leap Attack: Skill Area", target: "self", needsNear: true, engine: "stat", noDps: "Skill Area: counted in your stats; it has no damage effect on one dummy",
    pattern: /^\+(\d+(?:\.\d+)?)% Skill Area for this unit and allies for (\d+(?:\.\d+)?) ?s when this skill hits$/i,
    derive: (match, ctx) => { const entry = ctxEntry(ctx), uptime = uptimeOf(Number(match[2]), entry); return { text: `+${round(Number(match[1]) * uptime)}% Skill Area`, origin: "buff", summary: `+${match[1]}% Skill Area for ${match[2]} s, ${cadenceText(entry)}: ${round(uptime * 100)}% uptime` }; },
    reason: "the follower leaps at the dummy and hits it each cast"
  },
  {
    id: "followerSwiftShadowRaid", skill: "Tartarus: Swift Shadow Raid", label: "Swift Shadow Raid: Projectile Speed", target: "self", needsNear: false, engine: "stat", noDps: "Projectile Speed: counted in your stats; it has no damage effect on one dummy",
    pattern: /^\+(\d+(?:\.\d+)?)% Projectile Speed for this unit and allies for (\d+(?:\.\d+)?) ?s when casting this skill$/i,
    derive: (match, ctx) => { const entry = ctxEntry(ctx), uptime = uptimeOf(Number(match[2]), entry); return { text: `+${round(Number(match[1]) * uptime)}% Projectile Speed`, origin: "buff", summary: `+${match[1]}% Projectile Speed for ${match[2]} s, ${cadenceText(entry)}: ${round(uptime * 100)}% uptime` }; },
    reason: "the follower casts it back to back"
  },
  {
    id: "followerChargingWarcry", skill: "Tartarus: Charging Warcry", label: "Charging Warcry: Attack Speed", target: "self", needsNear: true, engine: "attack",
    pattern: /^\+(\d+(?:\.\d+)?)% Attack Speed for allies$/i,
    derive: (match, ctx) => warcry("Attack Speed", "time-averaged: Attack Speed scales hits per second linearly")({ match, ctx, value: Number(match[1]), text: (value) => `+${value}% Attack Speed` }),
    reason: "best case: the follower shouts on cooldown next to you; the 3 s Warcry on a 4 s cooldown is time-averaged (provisional)"
  },
  {
    id: "followerShockwaveWarcry", skill: "Tartarus: Shockwave Warcry", label: "Shockwave Warcry: Double Damage", target: "self", needsNear: true, engine: "attack",
    pattern: /^\+(\d+(?:\.\d+)?)% chance for allies' Attack Skills to deal Double Damage$/i,
    derive: (match, ctx) => warcry("Double Damage chance for Attack Skills", "time-averaged: the expected Double Damage is linear in the chance below 100%")({ match, ctx, value: Number(match[1]), text: (value) => `+${value}% chance for Attack Skills to deal Double Damage` }),
    reason: "best case: the follower shouts on cooldown next to you; time-averaged (provisional); Double Damage reaches hits only (src/double-damage.js)"
  },
  {
    id: "followerRagingWarcry", skill: "Tartarus: Raging Warcry", label: "Raging Warcry: Attack Skill Area", target: "self", needsNear: true, engine: "stat", noDps: "Attack Skill Area: no damage effect on one dummy",
    pattern: /^\+(\d+(?:\.\d+)?)% Attack Skill Area for allies$/i,
    derive: (match, ctx) => warcry("Attack Skill Area", "time-averaged")({ match, ctx, value: Number(match[1]), text: (value) => `+${value}% Attack Skill Area` }),
    reason: "the follower shouts on cooldown next to you"
  },
  {
    id: "followerFearlessWarcry", skill: "Tartarus: Fearless Warcry", label: "Fearless Warcry: Attack Critical Strike Rating", target: "self", needsNear: true, engine: "attack",
    pattern: /^\+(\d+(?:\.\d+)?)% Attack Critical Strike Rating for allies$/i,
    derive: (match, ctx) => warcry("Attack Critical Strike Rating", "time-averaged: crit chance is linear in the rating below its cap; provisional")({ match, ctx, value: Number(match[1]), text: (value) => `+${value}% Attack Critical Strike Rating` }),
    reason: "best case: the follower shouts on cooldown next to you; the 3 s Warcry on a 4 s cooldown is time-averaged (provisional)"
  },
  {
    // Tidewell's Water Area: "Spell Skills of the allies within the Water Area have a +20% chance to deal Double Damage" (6 s,
    // recast when it ends). Double Damage reaches hits only (src/double-damage.js), never damage over time.
    id: "followerTidewell", skill: "Tartarus: Tidewell", label: "Tidewell: Spell Double Damage", target: "self", needsNear: true, engine: "spellHit",
    pattern: /Spell Skills of the allies within the Water Area have a \+(\d+(?:\.\d+)?)% chance to deal Double Damage$/i,
    derive: (match, ctx) => { const entry = ctxEntry(ctx), uptime = uptimeOf(6, entry), value = round(Number(match[1]) * uptime); return { text: `+${value}% chance for Spells to deal Double Damage`, origin: "buff", summary: `+${match[1]}% chance for your Spells to deal Double Damage inside the 6 s Water Area, ${cadenceText(entry)}: ${round(uptime * 100)}% uptime` }; },
    reason: "best case: the follower drops the Water Area on the dummy and you stand in it"
  },
  {
    // Shadow Dash's debuff: "+10% additional damage taken. Lasts 4s. Stacks up to 5 times." Read: the stacks share one duration
    // that each cast refreshes (Mystic Spread's keyword says when stacks keep their own durations, so a stack without that note
    // shares one; provisional). Cast every period P ≤ 4 s: the stacks ramp to 5 (one per cast from t = 0 on the clean dummy)
    // and stay; P > 4 s: one stack for 4 s of every P.
    id: "followerShadowDash", skill: "Origin Tartarus: Shadow Dash", label: "Shadow Dash: damage taken", target: "enemy", needsNear: false, engine: "all",
    pattern: /: \+(\d+(?:\.\d+)?)% additional damage taken\. Lasts (\d+(?:\.\d+)?) ?s\. Stacks up to (\d+) times\.?$/i,
    derive: (match, ctx) => {
      const entry = ctxEntry(ctx), perStack = Number(match[1]), duration = Number(match[2]), max = Number(match[3]);
      const period = entry?.periodSeconds ?? Infinity;
      if (!(entry?.castsPerSecond > 0)) return { inactive: "the follower never casts it" };
      if (period <= duration) {
        return { text: `+${round(perStack * max)}% additional damage taken`, origin: "derived", parts: [{ type: null, reach: "all", percent: perStack, schedule: { kind: "ramp", maxStacks: max, intervalSeconds: period, startStacks: 1 } }], summary: `${max} stacks × ${perStack}% = +${round(perStack * max)}% additional damage taken: ${cadenceText(entry)} refreshes the ${duration} s debuff before it ends; one stack per cast from t = 0 on the clean dummy (${max} after ${round((max - 1) * period)} s)` };
      }
      const uptime = duration / period;
      return { text: `+${round(perStack * uptime)}% additional damage taken`, origin: "derived", parts: [{ type: null, reach: "all", percent: perStack, schedule: { kind: "periodic", durationSeconds: duration, periodSeconds: period } }], summary: `1 stack of +${perStack}% for ${duration} s per cast, ${cadenceText(entry)}: ${round(uptime * 100)}% uptime` };
    },
    reason: "best case: the follower dashes through the dummy on cooldown; every damage you deal takes it (provisional: shared, refreshed stack duration)"
  },
  {
    // Scorching Pulse: "+30% Reaping Duration for the Follower and allies for each Reaping dealt recently. Stacks up to 10".
    // Read: the Reapings the follower deals (its own Pulse, one per cast), counted over the last 4 s (provisional; if your
    // own Reaps counted, the stacks would sit at 10).
    id: "followerScorchingPulse", skill: "Origin Tartarus: Scorching Pulse", label: "Scorching Pulse: Reaping Duration", target: "self", needsNear: false, engine: "reaping",
    pattern: /^For every 1 time Reaped recently, (\d+(?:\.\d+)?)% Reaping Duration for you and allies\. Stacks up to (\d+) time\(s\)$/i,
    derive: (match, ctx) => {
      const entry = ctxEntry(ctx), stacks = Math.min(Number(match[2]), (entry?.castsPerSecond || 0) * FOLLOWER_RECENT_SECONDS);
      if (!(stacks > 0)) return { inactive: "the follower never casts it" };
      return { text: `+${round(Number(match[1]) * stacks)}% Reaping Duration`, origin: "buff", summary: `${round(stacks)} stack(s) × ${match[1]}% = +${round(Number(match[1]) * stacks)}% Reaping Duration: the follower's own Reaps in the last ${FOLLOWER_RECENT_SECONDS} s (${cadenceText(entry)})` };
    },
    reason: "the follower's own Reapings count (provisional reading of \"each Reaping dealt recently\")"
  },
  {
    // Arcane Circle: "Grants 1 stack of Mystic Spread to allies when casting this skill" (keyword: +14% additional Spell Damage for
    // 8 s, up to 4, each stack's duration independent). Average stacks = min(4, 8 s × casts per second). The 50% extra stack per
    // Spell Burst stack the follower consumes is not modeled (the follower's Spell Burst is not published).
    id: "followerArcaneCircle", skill: "Origin Tartarus: Arcane Circle", label: "Arcane Circle: Mystic Spread", target: "self", needsNear: false, engine: "spell",
    pattern: /^Grants 1 stack of Mystic Spread to allies when casting this skill\./i,
    derive: (match, ctx) => {
      const entry = ctxEntry(ctx), keyword = tartarusKeyword("Mystic Spread")?.text.join(" ") || "";
      const perStack = Number(keyword.match(/\+(\d+(?:\.\d+)?)% additional Spell Damage/i)?.[1]) || 14, seconds = Number(keyword.match(/for (\d+(?:\.\d+)?) ?s/i)?.[1]) || 8, max = Number(keyword.match(/stacks up to (\d+)/i)?.[1]) || 4;
      const stacks = Math.min(max, seconds * (entry?.castsPerSecond || 0));
      if (!(stacks > 0)) return { inactive: "the follower never casts it" };
      return { text: `+${round(perStack * stacks)}% additional Spell Damage`, origin: "buff", summary: `Mystic Spread: ${round(stacks)} stacks on average (${seconds} s each, independent; ${cadenceText(entry)}) × ${perStack}% = +${round(perStack * stacks)}% additional Spell Damage; the extra stacks from the follower's Spell Burst are not modeled` };
    },
    reason: "best case: cast on cooldown; Spell hits and a Spell skill's own damage over time take it (user-confirmed rule 2026-10-11), ailments do not"
  },
  {
    // Ice Shot: "This unit and nearby allies gain 1 stack of Projectile Amplification for each Projectile fired recently"
    // (keyword: +1.4% additional Projectile Damage per stack (multiplies) for 4 s, up to 40). Read: the projectiles the follower
    // fires (one per cast of each Projectile-tagged skill, plus its trait's "+N Projectile Quantity") over the last 4 s.
    id: "followerIceShot", skill: "Origin Tartarus: Ice Shot", label: "Ice Shot: Projectile Amplification", target: "self", needsNear: true, engine: "projectile",
    pattern: /^This unit and nearby allies gain 1 stack of Projectile Amplification for each Projectile fired recently$/i,
    derive: (match, ctx) => {
      const keyword = tartarusKeyword("Projectile Amplification")?.text.join(" ") || "";
      const perStack = Number(keyword.match(/\+(\d+(?:\.\d+)?)% additional Projectile Damage/i)?.[1]) || 1.4, seconds = Number(keyword.match(/for (\d+(?:\.\d+)?) ?s/i)?.[1]) || 4, max = Number(keyword.match(/Stacks up to (\d+)/i)?.[1]) || 40;
      const quantity = 1 + (ctx?.selection?.follower?.traitLines || []).reduce((sum, text) => sum + (Number(String(text).match(/^\+(\d+) Projectile Quantity$/i)?.[1]) || 0), 0);
      const perSecond = [...(ctx?.cadence?.values() || [])].filter((entry) => entry.skill.tags.includes("Projectile")).reduce((sum, entry) => sum + entry.castsPerSecond * quantity, 0) || (ctxEntry(ctx)?.castsPerSecond || 0) * quantity;
      const stacks = Math.min(max, perSecond * seconds);
      if (!(stacks > 0)) return { inactive: "the follower fires no Projectile" };
      const value = round(((1 + perStack / 100) ** stacks - 1) * 100);
      return { text: `+${value}% additional Projectile Damage`, origin: "buff", summary: `${round(stacks)} stacks (${round(perSecond)} follower projectiles per second × ${seconds} s) × ${perStack}% (multiplies) = +${value}% additional Projectile Damage` };
    },
    reason: "the follower's own projectiles count (provisional reading of \"each Projectile fired recently\"); you stand near it"
  },
  {
    // Origin Fearless Warcry: "+6% additional Attack Damage and Ailment Damage dealt by attacks for allies for each Warcry Skill
    // cast. Stacks up to 6 times. Lasts 5s." Read: each Warcry the follower casts adds a stack for 5 s; average stacks =
    // min(6, 5 s × its Warcry casts per second). The attack-Ailment half is not read.
    id: "followerFearlessWarcryOrigin", skill: "Origin Tartarus: Fearless Warcry", label: "Origin Fearless Warcry: Attack Damage", target: "self", needsNear: true, engine: "attack",
    pattern: /^Casts this skill to unleash a Warcry: \+(\d+(?:\.\d+)?)% additional Attack Damage and Ailment Damage dealt by attacks for allies for each Warcry Skill cast\. Stacks up to (\d+) times$/i,
    derive: (match, ctx) => {
      const seconds = durationLine(ctx?.skill) || 5, effect = warcryEffectFactor(ctx?.selection);
      const warcries = [...(ctx?.cadence?.values() || [])].filter((entry) => entry.skill.tags.includes("Warcry")).reduce((sum, entry) => sum + entry.castsPerSecond, 0) || (ctxEntry(ctx)?.castsPerSecond || 0);
      const stacks = Math.min(Number(match[2]), seconds * warcries);
      if (!(stacks > 0)) return { inactive: "the follower casts no Warcry" };
      const value = round(Number(match[1]) * effect * stacks);
      return { text: `+${value}% additional Attack Damage`, origin: "buff", summary: `${round(stacks)} stacks on average (${round(warcries)} follower Warcries per second × ${seconds} s) × ${round(Number(match[1]) * effect)}% = +${value}% additional Attack Damage; its attack Ailment Damage half is not read` };
    },
    reason: "best case: the follower shouts on cooldown next to you (provisional stack reading)"
  },
  {
    // Berserking Blade: "+30% additional Physical Damage taken by the target for 4s when this skill hits an enemy with Trauma":
    // held while the dummy carries Trauma (yours or another source's) and the follower keeps hitting it.
    id: "followerBerserkingBlade", skill: "Origin Tartarus: Berserking Blade", label: "Berserking Blade: Physical Damage taken", target: "enemy", needsNear: false, engine: "physical",
    pattern: /^\+(\d+(?:\.\d+)?)% additional Physical Damage taken by the target for (\d+(?:\.\d+)?) ?s when this skill hits an enemy with Trauma$/i,
    derive: (match, ctx) => {
      if (!(ctx?.state?.enemyAilments || []).includes("Trauma")) return { inactive: "the dummy carries no Trauma" };
      const entry = ctxEntry(ctx), uptime = uptimeOf(Number(match[2]), entry), value = round(Number(match[1]) * uptime);
      return { text: `+${value}% additional Physical Damage taken`, origin: "derived", summary: `+${match[1]}% additional Physical Damage taken for ${match[2]} s per hit on the Traumatized dummy, ${cadenceText(entry)}: ${round(uptime * 100)}% uptime` };
    },
    reason: "best case: the follower keeps slashing the Traumatized dummy"
  },
  // Follower traits (named followers).
  {
    // Relentless Claws: "Every 10s, …, inflicts Claw Mark on enemies within 6m, causing them to take +25% additional Physical
    // Damage for 5s": 5 s of every 10 s (periodic from t = 0), time-averaged in the ledgers.
    id: "followerRelentlessClaws", trait: "relentless-claws", label: "Relentless Claws: Claw Mark", target: "enemy", needsNear: false, engine: "physical",
    pattern: /^Every (\d+(?:\.\d+)?) ?s, if there are enemies within \d+ ?m of you, inflicts Claw Mark on enemies within \d+ ?m, causing them to take \+(\d+(?:\.\d+)?)% additional Physical Damage for (\d+(?:\.\d+)?) ?s$/i,
    derive: (match) => {
      const period = Number(match[1]), duration = Number(match[3]), percent = Number(match[2]), uptime = Math.min(1, duration / period);
      return { text: `+${round(percent * uptime)}% additional Physical Damage taken`, origin: "derived", parts: uptime < 1 ? [{ type: "Physical", reach: "all", percent, schedule: { kind: "periodic", durationSeconds: duration, periodSeconds: period } }] : [], summary: `Claw Mark +${percent}% additional Physical Damage taken for ${duration} s every ${period} s: ${round(uptime * 100)}% uptime, time-averaged (windows: on from t = 0)` };
    },
    reason: "best case: the follower stands within 6 m of the dummy"
  },
  {
    // Curl-Tailed Sentinel: "Every 10s, … places a Rat Guard at a random location Nearby for 5s" and "+25% additional Spell
    // Damage for allies within a certain area of the Rat Guard": 5 s of every 10 s, you inside its area (best case).
    id: "followerCurlTailedSentinel", trait: "curl-tailed-sentinel", label: "Curl-Tailed Sentinel: Rat Guard", target: "self", needsNear: true, engine: "spell",
    pattern: /^\+(\d+(?:\.\d+)?)% additional Spell Damage for allies within a certain area of the Rat Guard$/i,
    derive: (match, ctx) => {
      const timing = (ctx?.selection?.follower?.traitLines || []).map((text) => String(text).match(/^Every (\d+(?:\.\d+)?) ?s, .*Rat Guard .*for (\d+(?:\.\d+)?) ?s$/i)).find(Boolean);
      const period = Number(timing?.[1]) || 10, duration = Number(timing?.[2]) || 5, uptime = Math.min(1, duration / period), value = round(Number(match[1]) * uptime);
      return { text: `+${value}% additional Spell Damage`, origin: "buff", summary: `Rat Guard: +${match[1]}% additional Spell Damage for ${duration} s every ${period} s: ${round(uptime * 100)}% uptime, time-averaged` };
    },
    reason: "best case: you stand inside the Rat Guard's area (it lands at a random spot nearby); Spell hits and a Spell skill's own damage over time take it"
  },
  {
    // Rampaging Rat: "+12% additional damage taken by enemies for 1s when a Projectile Skill lands a Critical Strike". Read: the
    // follower's own Projectile Skills that always crit (Forking Thunder), one crit per cast (its other skills' crit chance
    // is not published).
    id: "followerRampagingRat", trait: "rampaging-rat", label: "Rampaging Rat: damage taken on Projectile crits", target: "enemy", needsNear: false, engine: "all",
    pattern: /^\+(\d+(?:\.\d+)?)% additional damage taken by enemies for (\d+(?:\.\d+)?) ?s when a Projectile Skill lands a Critical Strike$/i,
    derive: (match, ctx) => {
      const crits = [...(ctx?.cadence?.values() || [])].filter((entry) => entry.skill.tags.includes("Projectile") && entry.skill.lines.some((text) => /guaranteed to land Critical Strikes/i.test(text)));
      const rate = crits.reduce((sum, entry) => sum + entry.castsPerSecond, 0);
      if (!(rate > 0)) return { inactive: "no equipped follower Projectile Skill always crits (the others' crit chance is not published)" };
      const duration = Number(match[2]), percent = Number(match[1]), uptime = Math.min(1, duration * rate), period = 1 / rate;
      return { text: `+${round(percent * uptime)}% additional damage taken`, origin: "derived", parts: uptime < 1 ? [{ type: null, reach: "all", percent, schedule: { kind: "periodic", durationSeconds: duration, periodSeconds: period } }] : [], summary: `+${percent}% additional damage taken for ${duration} s after each crit of ${crits.map((entry) => entry.name).join(", ")} (every ${round(period)} s): ${round(uptime * 100)}% uptime` };
    },
    reason: "the follower's own always-critting Projectile Skill (provisional)"
  }
];

// ---- Skill-specific readings (no switch) -----------------------------------------------------------------------------
// Lines the generic rules below would misread, with the reading for one dummy.
const NO_STEEP = "the follower's skill has no Steep Strike chance (its text names none; only a Slash-Strike skill's own chance, its supports and your lines give one), so it never launches a Steep Strike (a rolled support could add one)";
export const FOLLOWER_LINE_RULES = [
  { skill: "Tartarus: Wilt Spike", pattern: /^Adds \d+ ?-? ?\d+ Base Wilt Damage to this skill$/i, status: "In calc", reason: "the base of the follower's Wilt on the dummy (an Ailment there); its own Wilt damage (1 base per stack) is not counted" },
  { skill: "Tartarus: Double Thrusts", pattern: /^Adds \d+ ?-? ?\d+ Base Trauma Damage to this skill$/i, status: "In calc", reason: "the base of the follower's Trauma on the dummy (an Ailment there); its own Trauma damage (1 base) is not counted" },
  { skill: "Tartarus: Thunder Spike", pattern: /^Grants you Blur when the Shadows of this skill hit$/i, status: "In calc", reason: "a Blur source for you (src/blur-sources.js), like your own: Blur is assumed up while the Blur condition is on" },
  { skill: "Tartarus: Focused Slash", pattern: /gain Fervor for \d+ ?s when this skill launches a Steep Strike$/i, status: "Inactive", reason: NO_STEEP },
  { skill: "Tartarus: Icy Blade", pattern: /Frostbite Effect for nearby allies for \d+ ?s when this skill launches a Steep Strike$/i, status: "Inactive", reason: NO_STEEP },
  { skill: "Tartarus: Speed Phantom", pattern: /^Enemies take \+\d+(?:\.\d+)?% additional Spell Damage when this skill hits$/i, status: "Not modeled", reason: "the debuff's duration is not in the text (nor on the player's Speed Phantom), so its uptime at the follower's 3 s cooldown is unknown" },
  { skill: "Tartarus: Frost Spike", pattern: /additional Shadow Damage for nearby allies/i, status: "Not modeled", reason: "your Shadow damage is not modeled (your Shadow Strike skills' Shadows are not modeled)" },
  { skill: "Origin Tartarus: Frost Spike", pattern: /additional Shadow Damage \(multiplies\)/i, status: "Not modeled", reason: "your Shadow damage is not modeled (your Shadow Strike skills' Shadows are not modeled); at 60 stacks it would be +71.2% additional Shadow Damage" },
  { skill: "Origin Tartarus: Black Hole", pattern: /gains Synergy Shift$/i, status: "Not modeled", reason: "Synergy Shift (-2% resistance to the type the holder inflicts per stack, +1% to the others, up to 30) needs the follower's own Fire / Cold / Lightning / Erosion damage events per second (its damage-over-time tick rate is not published) and whether the shift reaches your damage" },
  { skill: "Origin Tartarus: Shackles of Malice", pattern: /stack of Ill Will for each Crowd Control Effect/i, status: "Not modeled", reason: "Ill Will (-6% Erosion and +10% Elemental Resistance per stack, up to 8) needs Crowd Control Effects on the dummy; whether it takes the follower's Reverse Knockback or random Crowd Control is not sourced" },
  { skill: "Origin Tartarus: Split Firebolt", pattern: /Elemental Resonance/i, status: "Not modeled", reason: "Elemental Infiltration needs 3 types of Elemental Resonance (Ignite, a Lightning crit and Cold Infiltration by the follower); the follower's Ignite chance is not published" },
  { skill: "Origin Tartarus: Raging Warcry", pattern: /\+\d+% additional Attack Hit Damage taken/i, status: "Partly modeled", reason: "its 50 Physical hit is counted with the follower's own damage; the 5-stack debuff (+50% additional Attack Hit Damage taken, one stack lost per attack hit) needs your attack-hit rate per 4 s and is not modeled" },
  { skill: "Origin Tartarus: Safeguard Ring", pattern: /Curses?|Tenacity Blessing|Removes Ignite/i, status: "Not modeled", reason: "the follower's curse sources are not published, and the Sentry removes your Ignite / Wilt from the dummy; not modeled" },
  { skill: "Origin Tartarus: Safeguard Ring", pattern: /periodically dealing/i, status: "Not modeled", reason: "the Sentry's hit interval is not published (the follower's own damage)" },
  { skill: "Origin Tartarus: Bond of Archery", pattern: /Max Sentry Quantity/i, status: "Not modeled", reason: "+1 Max Sentry Quantity for 4 s of each 6 s cooldown: Sentry quantity is not modeled for your skills" },
  { skill: "Origin Tartarus: Bond of Archery", pattern: /cast by your Spell Burst/i, status: "Not modeled", reason: "needs your Sentry count and Spell Burst casts per Sentry; not modeled" },
  { skill: "Origin Tartarus: Frost Shield", pattern: /Generates three Frost Shields/i, status: "Not modeled", reason: "the shields' hit interval is not published (the follower's own damage)" },
  { trait: "plague", pattern: /^Inflicted Wilt gains an additional effect/i, status: "Not modeled", reason: "the follower's equipped Witch Rat skills inflict no Wilt (a rolled support could add one), and whether your Wilt takes it is not stated; it raises Non-Erosion Damage taken only" },
  { trait: "plague", pattern: /additional Wilt Duration$/i, status: "Not modeled", reason: "the follower's own Wilt (its skills inflict none)" },
  { trait: "wild-barbarian-king", pattern: /Barbarian Intimidation/i, status: "Not modeled", reason: "the Barbarian Intimidation keyword's effect is not published" },
  { trait: "chant-of-conquest", pattern: /^\+\d+(?:\.\d+)?% Cast Speed$/i, status: "In calc", reason: "the follower's own Cast Speed: its Spell skills' cast times are divided by it in its cadence (provisional)" },
  { trait: "chant-of-conquest", pattern: /^\+\d+(?:\.\d+)?% Spell Skill Area$/i, status: "No DPS effect", reason: "the follower's own Skill Area" },
  { trait: "curl-tailed-sentinel", pattern: /places a Rat Guard/i, status: "In calc", reason: "the Rat Guard's timing (5 s of every 10 s) for its Spell Damage line" }
];

// ---- The follower's own damage ---------------------------------------------------------------------------------------
// One entry per damaging skill: damage per cast at TLIDB's Lv.20 numbers (no follower stat scaling is published, so none is
// applied), its type, and the lines it reads. Hit count per cast on one dummy (provisional): a Shadow Strike skill's Shadows
// are not counted (as for your own Shadow Strike skills); jumps, forks and chains need another enemy. Forking Thunder always
// crits: ×1.5 (a base +50% Critical Strike Damage is assumed for the follower). A follower DoT counts as its total per cast.
// The dummy's resistance applies (30% Elemental / Erosion; Physical 0, as for your Physical damage over time). Flame Core's
// Sentry releases a shockwave every 1 s plus one per Spell Skill the follower casts (read as the follower's casts).
const OWN_DAMAGE = {
  "Tartarus: Black Hole": { type: "Erosion", perCast: 400, text: "100 per second for its 4 s" },
  "Tartarus: Thunder Spike": { type: "Lightning", perCast: 50, text: "one thrust (its Shadow is not counted)" },
  "Tartarus: Lightning Storm": { type: "Lightning", perCast: 300, text: "6 strikes (every 0.25 s for 1.5 s)" },
  "Tartarus: Double Thrusts": { type: "Physical", perCast: 100, text: "two thrusts (its Shadow is not counted)" },
  "Tartarus: Ice Lances": { type: "Cold", perCast: 50, text: "one lance (its jumps need other enemies)" },
  "Tartarus: Forking Thunder": { type: "Lightning", perCast: 75, text: "one spear, always a crit (×1.5 assumed; its forks need other enemies)" },
  "Tartarus: Blazing Meteor": { type: "Fire", perCast: 100, text: "the projectile and one Ash explosion" },
  "Tartarus: Focused Slash": { type: "Physical", perCast: 50, text: "one Sweep Slash" },
  "Tartarus: Icy Blade": { type: "Cold", perCast: 50, text: "one Sweep Slash" },
  "Tartarus: Frigid Transmission": { type: "Cold", perCast: 50, text: "the landing point's ice" },
  "Tartarus: Speed Phantom": { type: "Physical", perCast: 100, text: "two Remnant explosions" },
  "Tartarus: Leap Attack": { type: "Physical", perCast: 50, text: "one slam" },
  "Tartarus: Swift Shadow Raid": { type: "Physical", perCast: 50, text: "one dash hit" },
  "Tartarus: Nether Grasp": { type: "Erosion", perCast: 800, text: "12 grasps (every 0.5 s for 6 s) and 100 per second for 2 s" },
  "Tartarus: Frost Terra": { type: "Cold", perCast: 200, text: "100 per second for 2 s" },
  "Tartarus: Wilt Spike": { type: "Erosion", perCast: 50, text: "one thrust (its Shadow is not counted)" },
  "Tartarus: Frost Spike": { type: "Cold", perCast: 150, text: "one thrust and two Icy Blades (its Shadow is not counted)" },
  "Tartarus: Tidewell": { type: "Cold", perCast: 400, text: "8 Torrents (every 0.7 s for 6 s)" },
  "Tartarus: Lightning Beam": { type: "Lightning", perCast: 150, text: "three beams" },
  "Origin Tartarus: Black Hole": { type: "Physical", perCast: 400, text: "100 per second for its 4 s" },
  "Origin Tartarus: Scorching Pulse": { type: "Fire", perCast: 50, text: "one pulse" },
  "Origin Tartarus: Focused Slash": { type: "Physical", perCast: 50, text: "one slash" },
  "Origin Tartarus: Split Firebolt": { type: "Fire", perCast: 50, text: "one firebolt (its split fireballs are not counted)" },
  "Origin Tartarus: Berserking Blade": { type: "Physical", perCast: 50, text: "one Sweep Slash" },
  "Origin Tartarus: Shackles of Malice": { type: "Erosion", perCast: 50, text: "one chain hit" },
  "Origin Tartarus: Thunder Slash": { type: "Lightning", perCast: 50, text: "one Sweep Slash" },
  "Origin Tartarus: Frost Spike": { type: "Cold", perCast: 50, text: "one thrust (its Shadow is not counted)" },
  "Origin Tartarus: Ice Shot": { type: "Cold", perCast: 50, text: "one shot" },
  "Origin Tartarus: Raging Warcry": { type: "Physical", perCast: 50, text: "one Warcry hit" },
  "Origin Tartarus: Spiral Strike": { type: "Erosion", perCast: 50, text: "one damage instance" },
  "Origin Tartarus: Flame Core": { type: "Fire", perShockwave: (498 + 925) / 2, text: "shockwaves of 498–925 (average 711.5) every 1 s, plus one per Spell Skill the follower casts" }
};
const OWN_DAMAGE_LINE = /\b(?:Deals?|dealing)\b[^.]*?\d+(?:\.\d+)? ?- ?\d+(?:\.\d+)?|^\d+(?:\.\d+)? ?- ?\d+(?:\.\d+)? (?:Attack|Spell|Hit|Persistent)|Shockwaves deal \d|reaps? \d|Strikes once every|Creates a Nether Grasp/i;

/**
 * The follower's own damage on the dummy, one source per damaging skill: { key, name, skill, type, perUse, usesPerSecond,
 * firstUseSeconds, dps, text }. `resistanceFor(type)` gives the dummy's resistance (percent).
 */
export function followerDamageSources(selection, { resistanceFor = (type) => (type === "Physical" ? 0 : 30) } = {}) {
  if (!selection) return [];
  const cadence = followerCadence(selection);
  const spellCasts = [...cadence.values()].filter((entry) => entry.skill.tags.includes("Spell") && entry.name !== "Origin Tartarus: Flame Core").reduce((sum, entry) => sum + entry.castsPerSecond, 0);
  return selection.skills.flatMap(({ skill }) => {
    const model = OWN_DAMAGE[skill.name], entry = cadence.get(skill.name);
    if (!model || !(entry?.castsPerSecond > 0)) return [];
    const factor = Math.max(0, 1 - (Number(resistanceFor(model.type)) || 0) / 100);
    const sentry = Number.isFinite(model.perShockwave);
    const perUse = (sentry ? model.perShockwave : model.perCast) * factor;
    const usesPerSecond = sentry ? 1 + spellCasts : entry.castsPerSecond;
    return [{ key: `follower:${skill.id}`, name: `${selection.follower.displayName}: ${skill.shortName} (follower)`, skill: skill.name, type: model.type, perUse, usesPerSecond, firstUseSeconds: entry.castSeconds, dps: perUse * usesPerSecond, resistanceFactor: factor,
      text: `${skill.shortName}: ${model.text} = ${round(sentry ? model.perShockwave : model.perCast)} ${model.type} ${sentry ? "per shockwave" : "per cast"} × ${round(factor)} resistance × ${round(usesPerSecond)} per second (${sentry ? `1 + ${round(spellCasts)} follower Spell casts` : cadenceText(entry)}) = ${round(perUse * usesPerSecond)} DPS (TLIDB Lv.20 numbers, no follower scaling: provisional)` }];
  });
}

/** A damage source's average DPS over the first `seconds` (0: sustained): uses from its first one on. */
export function followerWindowDps(source, seconds) {
  if (!(seconds > 0)) return source.dps;
  return source.perUse * source.usesPerSecond * Math.max(0, seconds - (source.firstUseSeconds || 0)) / seconds;
}

// ---- Reaps -----------------------------------------------------------------------------------------------------------
// Origin Tartarus: Scorching Pulse "Reaps 1 s of all Damage Over Time when this skill hits": one Reap per cast of every DoT on
// the dummy (read like your own Reaping sources, which settle every DoT; provisional), lasting 1 s × (1 + the follower's own
// Reaping Duration: its "+30% … for the Follower and allies for each Reaping dealt recently" stacks). Your Reaping Duration
// and Recovery Speed do not apply (the follower deals the Reap). Switch: followerScorchingPulseReap.
export function followerReapSources(selection, requested = {}) {
  if (!selection || requested.followerScorchingPulseReap === false) return [];
  const cadence = followerCadence(selection);
  return selection.skills.flatMap(({ skill }) => {
    const reap = skill.lines.join("\n").match(/\breaps (\d+(?:\.\d+)?) ?s of Damage Over Time/i);
    const entry = cadence.get(skill.name);
    if (!reap || !(entry?.castsPerSecond > 0)) return [];
    const stacksLine = skill.lines.map((text) => String(text).match(/^For every 1 time Reaped recently, (\d+(?:\.\d+)?)% Reaping Duration for you and allies\. Stacks up to (\d+) time\(s\)$/i)).find(Boolean);
    const ownDurationPercent = stacksLine ? Number(stacksLine[1]) * Math.min(Number(stacksLine[2]), entry.castsPerSecond * FOLLOWER_RECENT_SECONDS) : 0;
    return [{ source: `${selection.follower.displayName}: ${skill.shortName} (follower)`, trigger: "skill use", baseDurationSeconds: Number(reap[1]), baseRecoverySeconds: entry.periodSeconds, usesPerSecond: entry.castsPerSecond, ownDurationPercent, follower: true,
      note: `${skill.shortName}: Reaps ${reap[1]} s × (1 + ${round(ownDurationPercent)}% follower Reaping Duration) of every DoT on the dummy per cast, ${cadenceText(entry)} (provisional)` }];
  });
}

// ---- Blur ------------------------------------------------------------------------------------------------------------
/** Blur sources for you from the follower's skills (src/blur-sources.js entry shape). */
export function followerBlurSources(selection) {
  if (!selection) return [];
  return selection.skills.flatMap(({ skill }) => skill.lines.filter((text) => /^Grants you Blur when the Shadows of this skill hit$/i.test(clean(text))).map((text) => ({ source: `${selection.follower.displayName}: ${skill.shortName} (follower)`, text, trigger: "Follower skill hit", available: true, reason: "the follower's Thunder Spike Shadows hit the dummy: Blur assumed up while the Blur condition is on" })));
}

// ---- Line statuses ---------------------------------------------------------------------------------------------------
const RULES = [
  [/:$/, "No DPS effect", "a heading of the skill text"],
  [/^(?:Lasts \d|Cooldown: ?\d|Interval: ?\d|Strikes once every|[A-Za-z ]+ lasts \d+(?:\.\d+)? ?s$)/i, "No DPS effect", "the follower skill's own timing (its cadence)"],
  [/Eliminates enemies with Life below/i, "Not on dummy", "the training dummy is never eliminated"],
  [/-50% additional Non-Sentry Skill Damage for you/i, "No DPS effect", "the follower's own penalty (patch notes: \"makes you deal -50% less damage with non-Sentry skills\", where \"you\" is the follower)"],
  [/\breaps?\b/i, "Not modeled", "the follower's Reap of your damage over time (modeled for Origin Tartarus: Scorching Pulse when equipped)"],
  [/Reaping Duration/i, "Not modeled", "an ally Reaping Duration buff (modeled for Origin Tartarus: Scorching Pulse when equipped)"],
  [/\bYou take -\d|\bWhen taking damage\b|Max Elemental and Erosion Resistance|\b(?:Elemental Shield|Temporary Life|Fatal Damage|defensive effect|restores?|Max Life|Energy Shield|Life Regain|Fortify|Synergy Shift|Movement Speed|Projectile Speed|Stealth|Ashen Shroud|Blinks? to)\b/i, "No DPS effect", "defence, recovery or movement"],
  [/^Every \d+(?:\.\d+)? ?s,/i, "Not modeled", "a periodic effect on the follower's own clock that is not modeled yet"],
  [/\b(?:damage taken|takes? \+?\d+|Infiltration|Ill Will|Numbed|Frostbite|Mark|Claw Mark|Barbarian Intimidation|Crowd Control|Curses?)\b/i, "Not modeled", "an enemy debuff that is not modeled"],
  [/\b(?:Deals?|dealing)\b[^.]*?\d+(?:\.\d+)? ?- ?\d+(?:\.\d+)?|^\d+(?:\.\d+)? ?- ?\d+(?:\.\d+)? (?:Attack|Spell|Hit|Persistent)|\bInflicts? \d+ stack\(s\) of Wilt|Base (?:Wilt|Trauma) Damage to this skill|chance for this skill to inflict Trauma/i, "In calc", "the follower's own damage: a separate damage source on the dummy when equipped (TLIDB Lv.20 numbers at the follower's cadence; provisional)"],
  [/\b(?:allies|you\b|the caster and you|Follower and you|Rat Guard|Water Area|Euphoria|Ferocity|Fervor|Mystic Spread|Projectile Amplification|Spell Aggression|Blur)\b/i, "Not modeled", "an ally buff that is not modeled"],
  [/\b(?:this skill|this unit|the Follower|Sentr(?:y|ies)|Shadows?|Projectiles?|Shotgun|Jumps?|Penetration|Steep Strike|Sweep Slash|Ash\b|Icy Blade|Elemental Resonance|Warcry|Knock)/i, "No DPS effect", "the follower's own skill mechanics"]
];

/** Status of one follower line that no modeled buff reads: { status, reason }. A trait line that matches no rule names no
 * recipient, so it reads as the follower's own stat. */
export function followerLineStatus(text, kind = "skill") {
  const line = clean(text);
  for (const [pattern, status, reason] of RULES) if (pattern.test(line)) return { status, reason };
  return kind === "trait" ? { status: "Not modeled", reason: "the trait names no recipient: read as the follower's own stat" } : { status: "Not modeled", reason: "no reader for this follower line" };
}

const buffFor = (line, follower) => FOLLOWER_BUFFS.find((item) => (line.skill ? item.skill === line.skill.name : item.trait && item.trait === follower?.id) && item.pattern.test(clean(line.text)));
const ruleFor = (line, follower) => FOLLOWER_LINE_RULES.find((item) => item.reason && (line.skill ? item.skill === line.skill.name : item.trait && item.trait === follower?.id) && item.pattern.test(clean(line.text)));

/**
 * The follower's modeled buffs and the reading of every line (src/line-effects.js).
 * @param {object|null} selection followerSelection(state)
 * @param {object} state the line-condition state (requestedConditions, nearTarget, enemyAilments)
 * @returns {{ selection, lines, derived, timedEffects, buffs, cadence }}
 */
export function resolveFollowerEffects(selection, state = {}) {
  const result = { selection, lines: [], derived: [], timedEffects: [], buffs: [], cadence: [] };
  if (!selection) return result;
  const conditionOn = (id) => state[id] !== false && state.requestedConditions?.[id] !== false;
  const near = state.nearTarget !== false;
  const cadence = followerCadence(selection);
  result.cadence = [...cadence.values()].map((entry) => ({ skill: entry.name, castSeconds: round(entry.castSeconds), cooldownSeconds: round(entry.cooldownSeconds), periodSeconds: round(entry.periodSeconds), castsPerSecond: round(entry.castsPerSecond), notes: entry.notes }));
  const damage = new Map(followerDamageSources(selection).map((source) => [source.skill, source]));
  const reaps = new Map(followerReapSources(selection, state.requestedConditions || {}).map((source) => [source.source, source]));
  for (const line of followerLines(selection)) {
    const text = clean(line.text);
    const plain = plainFollowerLine(line.text);
    const buff = buffFor(line, selection.follower);
    if (buff) {
      const ctx = { selection, cadence, state, skill: line.skill };
      const derived = buff.derive(text.match(buff.pattern), ctx) || {};
      const on = conditionOn(buff.id);
      if (derived.inactive) {
        const reason = !on ? `the "${buff.label}" best-case switch is off: left out` : derived.inactive;
        result.lines.push({ text: line.text, source: line.source, skill: line.skill?.name || null, status: "Inactive", reason, toggle: buff.id, derivedText: null, active: false });
        result.buffs.push({ id: buff.id, label: buff.label, source: line.source, active: false, on, text: null, summary: derived.inactive, reason });
        result.timedEffects.push({ id: buff.id, label: buff.label, source: `${selection.follower.displayName} follower`, target: buff.target, toggle: true, enabled: on, active: false, reason, summary: derived.inactive, parts: [] });
        continue;
      }
      const active = on && (!buff.needsNear || near);
      const reason = !on ? `the "${buff.label}" best-case switch is off: left out` : !active ? `the Distant alternative stands ${DISTANT_STANDING_METERS} m away, outside the follower's area` : buff.reason;
      const texts = [{ text: derived.text, origin: derived.origin }, ...(derived.texts || [])].filter((item) => item.text);
      const status = active ? (buff.noDps ? "No DPS effect" : "In calc") : "Inactive";
      result.lines.push({ text: line.text, source: line.source, skill: line.skill?.name || null, status, reason: buff.noDps && active ? `${buff.noDps}; ${derived.summary}` : reason, toggle: buff.id, derivedText: texts.map((item) => item.text).join("; "), active, summary: derived.summary });
      result.buffs.push({ id: buff.id, label: buff.label, source: line.source, active, on, text: texts.map((item) => item.text).join("; "), summary: derived.summary, reason });
      // Listed in the Config tab's best-case assumptions as "<label> (<follower> follower)" (src/planner.js bestCaseAssumptions).
      result.timedEffects.push({ id: buff.id, label: buff.label, source: `${selection.follower.displayName} follower`, target: buff.target, toggle: true, enabled: on, active, reason, summary: derived.summary, parts: active ? derived.parts || [] : [] });
      if (active) for (const item of texts) result.derived.push({ text: item.text, source: `${line.source}: ${buff.label}`, origin: item.origin, multiplier: 1, derivedFrom: line.text, lineEffect: { conditional: true, key: "follower", conditionText: reason, provisional: true } });
      continue;
    }
    const marker = markerFor(line);
    if (marker) {
      const match = text.match(marker.pattern), entry = cadence.get(line.skill.name);
      const own = OWN_DAMAGE_LINE.test(text) && damage.get(line.skill.name);
      const reason = typeof marker.reason === "function" ? marker.reason(match, entry) : marker.reason;
      result.lines.push({ text: line.text, source: line.source, skill: line.skill.name, status: "In calc", reason: `${own ? `${own.text}; ` : ""}${reason}`, markerTexts: marker.texts(match, entry) });
      continue;
    }
    if (plain) { result.lines.push({ text: line.text, source: line.source, skill: line.skill?.name || null, status: null, reason: `read as "${plain}" for you`, plainText: plain }); continue; }
    const rule = ruleFor(line, selection.follower);
    if (rule) { result.lines.push({ text: line.text, source: line.source, skill: line.skill?.name || null, status: rule.status, reason: rule.reason }); continue; }
    // The follower's own damage (and Scorching Pulse's Reap) on a damage line of a modeled skill.
    if (line.skill && OWN_DAMAGE_LINE.test(text)) {
      const own = damage.get(line.skill.name);
      const reap = /\breaps? \d/i.test(text) ? [...reaps.values()].find((source) => source.source.endsWith(`${line.skill.shortName} (follower)`)) : null;
      if (own || reap) {
        const reapText = /\breaps? \d/i.test(text) ? reap ? `; ${reap.note}` : `; its Reap is switched off ("Scorching Pulse: Reap" best-case switch)` : "";
        result.lines.push({ text: line.text, source: line.source, skill: line.skill.name, status: "In calc", reason: `${own ? own.text : "its own damage is not counted"}${reapText}`, ...(reap || /\breaps? \d/i.test(text) ? { toggle: "followerScorchingPulseReap", active: Boolean(reap), derivedText: reap?.note || null } : {}) });
        if (/\breaps? \d/i.test(text)) result.timedEffects.push({ id: "followerScorchingPulseReap", label: "Scorching Pulse: Reap", source: `${selection.follower.displayName} follower`, target: "enemy", toggle: true, enabled: Boolean(reap), active: Boolean(reap), reason: reap ? "best case: cast on cooldown; the Reap settles every DoT on the dummy (provisional reading of \"all Damage Over Time\")" : `the "Scorching Pulse: Reap" best-case switch is off: left out`, summary: reap?.note || "", parts: [] });
        continue;
      }
      if (OWN_DAMAGE[line.skill.name] === undefined) { result.lines.push({ text: line.text, source: line.source, skill: line.skill.name, status: "Not modeled", reason: "the follower's own damage: no hit count or interval is published for it" }); continue; }
    }
    const { status, reason } = followerLineStatus(line.text, line.kind);
    result.lines.push({ text: line.text, source: line.source, skill: line.skill?.name || null, status, reason });
  }
  return result;
}

/**
 * The reading of one skill line as it would be when equipped alone (the follower panel's picker and unequipped tooltips): the
 * same resolver on a one-skill selection. { status, reason } or null.
 */
export function staticFollowerLineReading(text, skill, follower = null) {
  if (!skill) return null;
  const owner = follower || followers.find((item) => item.kind === "species" && skill.species.includes(item.species)) || null;
  if (!owner) return null;
  const selection = { follower: owner, rarity: null, slots: 1, tier: "", skills: [{ slot: 0, skill }] };
  const line = resolveFollowerEffects(selection, {}).lines.find((item) => item.text === text && item.skill === skill.name);
  if (!line) return null;
  if (line.status === null) return null;
  return { status: line.status, reason: line.toggle ? `${line.reason}${line.summary ? `; ${line.summary}` : ""} (best case when equipped; switch: Config tab, best-case assumptions)` : line.reason };
}

/** What a modeled buff needs that the build lacks ("" when the build has it): `engines` is src/line-coverage.js plannerEngines. */
export function missingFollowerEngine(engine, planner, engines) {
  if (!engines) return "";
  const spellDot = (engines.dots || []).some((dot) => (planner?.activation?.setups?.find((setup) => setup.setupKey === dot.setupKey)?.tags || []).includes("Spell"));
  if (engine === "dot" && !engines.anyDot) return "no damage over time on the dummy in this build";
  if (engine === "affliction" && !engines.anyDot) return "no damage over time (so no Affliction damage) on the dummy in this build";
  if (engine === "reaping" && !engines.anyDot) return "no damage over time to Reap on the dummy in this build";
  if (engine === "spell" && !engines.spellHit && !spellDot) return "no Spell hit or Spell skill damage over time in this build";
  if (engine === "spellTaken" && !engines.spellHit) return "no Spell hit in this build (Spell Damage taken reaches Spell hits only; not DoT, ailments or Reaps)";
  if (engine === "spellHit" && !engines.spellHit) return "no Spell hit in this build (Double Damage reaches hits only)";
  if (engine === "attack" && !engines.attackRate) return "no modeled attack hit in this build";
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
