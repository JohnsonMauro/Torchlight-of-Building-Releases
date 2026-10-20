import { dummyTarget, explicitRadiusHolds, KEYWORD_RADII_METERS, DISTANT_STANDING_METERS } from "./dummy-target.js";
import { ailmentStateNames } from "./enemy-ailments.js";
import { CONSUMED_COMBO_POINTS, COMBO_POINTS_PER_STARTER } from "./combo-points.js";
import { regainsIn } from "./regain-model.js";
import { WORLD_WITHIN_LINE, worldWithinChances } from "./world-within.js";

// One condition resolver for every line source (research/talent-batch-2026-10-12.md §7.1, chunk 2): support clauses
// (src/support-effects.js delegates here), talent nodes, cores, gear, slates, pacts and kismets (src/line-effects.js).
//
//   splitCondition(text)               → { body, condition: { key, params, wording } } | null
//   resolveLineCondition(cond, state)  → { active, appliedValue?, factor?, uptime?, conditionText, provisional, group,
//                                          notOnDummy?, unmodeled? }
//
// `state` is built once per planner pass (src/planner.js lineConditionState) from models that already exist: the dummy
// profile (a Boss, so also an Elite, within 10 m; user-confirmed; Nearby / Proximity / Distant radii from TLIDB), curses and the enemy-ailment model, the held weapons,
// the movement / distance / Life / Mana groups, the active setups, aura count, attribute totals and block chance.
// Conditions that cannot both hold register an exclusive group (movement, distance, life, mana); src/planner.js compares
// the alternatives on the 20 s dummy figure (best case, user rule 2026-10-09) and lists the choice.
//
// Readings marked `provisional` are not checked in game; each one names the open question it depends on.

const round = (value) => Math.round(value * 10000) / 10000;
// Sourced thresholds (TLIDB keyword tooltips "Low Life" / "Full Life"; game manual 1000010125): Low Life is current Life
// under 35%. Low Life itself is set by src/low-resource-model.js (sealed Life below 35%).
// Full Life (user-confirmed 2026-10-12): current unsealed, filled Life is at least 95% of Max Life. Sealed Life counts
// against it, so a build whose sealing leaves under 95% of Max Life unsealed is never at Full Life.
// Full Mana with Sealed Mana follows the same rule by analogy (provisional: no source states it for Mana).
export const LOW_LIFE_BELOW_PERCENT = 35;
export const FULL_LIFE_AT_LEAST_PERCENT = 95;
export const FULL_MANA_AT_LEAST_PERCENT = 95;
export const atFullLife = (state) => state.life !== "low" && (state.lifeRemainingPercent ?? 100) >= FULL_LIFE_AT_LEAST_PERCENT;
export const atFullMana = (state) => state.mana !== "low" && (state.manaRemainingPercent ?? 100) >= FULL_MANA_AT_LEAST_PERCENT;
const notFullLifeReason = (state) => state.life === "low" ? `not at Full Life (${state.lifeReason})` : `Life sealed to ${state.lifeRemainingPercent}%: not at Full Life (Full Life needs at least ${FULL_LIFE_AT_LEAST_PERCENT}% unsealed, user-confirmed 2026-10-12)`;
const notFullManaReason = (state) => state.mana === "low" ? `not at Full Mana (${state.manaReason})` : `Mana sealed to ${state.manaRemainingPercent}%: not at Full Mana (at least ${FULL_MANA_AT_LEAST_PERCENT}% unsealed, by analogy with Full Life; provisional)`;
const N = "([+-]?\\d+(?:\\.\\d+)?)";
const num = (value) => Number(String(value).replace("−", "-"));

// Support clause words (src/support-effects.js WEAPON_WORDS).
export const WEAPON_WORDS = { gun: ["Pistol", "Musket"], cannon: ["Fire Cannon"], bow: ["Bow"], crossbow: ["Crossbow"] };
// Numbed: up to 10 stacks (TLIDB Ailment page). The dummy's stack count is not modeled; best case (user rule
// 2026-10-09) is the cap while the build keeps Numbed applied (provisional).
export const NUMBED_MAX_STACKS = 10;

const STATE_WORDS = "Frozen|Frostbitten|Ignited|Numbed|Traumatized|Wilted|Withered|Shocked|Paralyzed|Blinded";
const STAT_WORDS = "Strength|Dexterity|Intelligence";
// Elemental Ailments (game keyword hyperlink 101: "Ignite, Frostbite, Freeze, and Numbed"); the enemy-ailment model names Freeze "Frozen".
export const ELEMENTAL_AILMENTS = ["Ignite", "Frostbite", "Frozen", "Freeze", "Numbed"];

// Condition templates for passive lines (talents, cores, gear, slates, pacts). Each returns the body (the
// unconditional template, sometimes rewritten to the wording the engines read) and the condition. Order matters: the
// specific wordings come before the generic suffixes.
// "+12% additional Fire Damage and +20% Fire Penetration" → two bodies.
const splitAnd = (text) => String(text).split(/ and (?=[+-]\d)/).map((part) => part.trim()).filter(Boolean);
// "-10% additional Attack Speed, -30% Attack Block Chance, and +55% additional Melee Damage" → three bodies.
const splitList = (text) => String(text).split(/,\s*(?:and\s+)?(?=[+-]\d)|\s+and\s+(?=[+-]\d)/).map((part) => part.trim()).filter(Boolean);
const LINE_RULES = [
  // ---- target ----
  [new RegExp(`^Projectile Damage increases with the distance traveled, dealing up to \\+${N}% (additional )?damage to [Dd]istant enemies$`), (m) => ({ body: `+${m[1]}% ${m[2] || ""}Projectile Damage`, key: "distant", params: { upTo: true } })],
  [new RegExp(`^Projectiles deal up to \\+${N}% additional damage to enemies in [Pp]roximity, and this damage reduces with the distance traveled by the Projectiles$`), (m) => ({ body: `+${m[1]}% additional Projectile Damage`, key: "nearTarget", params: { upTo: true } })],
  [new RegExp(`^Deals up to \\+${N}% additional Attack Damage to enemies in proximity, and this damage reduces as the distance from the enemy grows$`), (m) => ({ body: `+${m[1]}% additional Attack Damage`, key: "nearTarget", params: { upTo: true } })],
  [new RegExp(`^Area Skills deal up to \\+${N}% additional damage to enemies at the center$`), (m) => ({ body: `+${m[1]}% additional Area Damage`, key: "center" })],
  // Minion copies of player lines (core audit B7; src/minion-damage-model.js reads the bodies on the Minion skills):
  // - Focused Strike: game affix 108494 writes the player version's field 2007120 on the Minions (Area Skills, same best case).
  // - Dirty Tricks: game affix 9173989 gives the Minions the player version's seven "+12% additional Hit Damage" rows, one per
  //   ailment type on the enemy (multiplies), so the count is the enemy-ailment model's, like the player's.
  // - Reflection: game affix 79805904 gives the Minions the player version's per-Aura count (node 346 on Aura-tagged buffs): the
  //   Minions are counted inside the player's Auras (best case: within the Aura radius; provisional).
  [new RegExp(`^Minions' Area Skills deal up to \\+?${N}% additional damage to enemies at the center$`), (m) => ({ body: `+${m[1]}% additional Area Damage for Minions`, key: "center" })],
  [new RegExp(`^When Minions deal damage, \\+${N}% additional Hit Damage \\(multiplies\\) for every type of Ailment the enemy has$`), (m) => ({ body: `+${m[1]}% additional Hit Damage for Minions`, key: "ailmentTypes", params: { multiplies: true } })],
  [new RegExp(`^Minions \\+${N}% additional damage for each type of Aura they are affected by$`), (m) => ({ body: `+${m[1]}% additional damage for Minions`, key: "minionAuraCount", params: { per: num(m[1]) } })],
  [new RegExp(`^Upon inflicting damage, \\+${N}% (additional )?Hit Damage( \\(multiplies\\))? for every type of Ailment the enemy has$`), (m) => ({ body: `+${m[1]}% ${m[2] || ""}Hit Damage`, key: "ailmentTypes", params: { multiplies: Boolean(m[3]) } })],
  [new RegExp(`^Deals more Wilt Damage to enemies with more Life, up to \\+${N}% additional Wilt Damage$`), (m) => ({ body: `+${m[1]}% additional Wilt Damage`, key: "enemyLifeHigh" })],
  // Gear uniques round 2: the same count with "(multiplies)" at the end (Elemental Whirl), and the Elemental Ailment count
  // (game keyword 101: "Ignite, Frostbite, Freeze, and Numbed").
  [new RegExp(`^Upon inflicting damage, \\+${N}% (additional )?(damage|[\\w ]+? Damage) for every type of Ailment the enemy has \\(multiplies\\)$`), (m) => ({ body: `+${m[1]}% ${m[2] || ""}${m[3]}`, key: "ailmentTypes", params: { multiplies: true } })],
  [new RegExp(`^Upon inflicting damage, \\+${N}% (damage|[\\w ]+? Damage) for each type of Elemental Ailment the enemy has$`), (m) => ({ body: `+${m[1]}% ${m[2]}`, key: "elementalAilmentTypes" })],
  [/^(.+?) (?:to|against) enemies with Elemental Ailments$/, (m) => ({ body: m[1], key: "enemyElementalAilment" })],
  [/^(.+?) against Low Life enemies$/, (m) => ({ body: m[1], key: "enemyLowLife" })],
  // "Damage penetrates 40% Elemental Resistance of Frostbitten enemies" (gear-pact batch chunk 3): penetration while the
  // dummy carries that state (enemy-ailment model).
  // Stacking penetration from hits (Dreamweaver / Cloudgatherer pact cores; frost-terra audit 2026-10-13): "X% Elemental
  // Resistance Penetration when hitting an enemy with Elemental Damage, stacking up to N times" and "… every time you hit an
  // enemy with Elemental Damage recently. Stacks up to N times": held at N stacks while the build's modeled skill hits deal that
  // damage type (best case, as the other stacking buffs; provisional).
  [new RegExp(`^\\+?${N}% ((?:Elemental|Fire|Cold|Lightning|Erosion)(?: and Erosion)?) Resistance Penetration (?:when hitting an enemy|every time you hit an enemy) with (Elemental|Fire|Cold|Lightning|Erosion|Physical) Damage(?: recently)?[,.] (?:stacking|Stacks) up to (\\d+) times?$`, "i"), (m) => ({ body: `+${round(num(m[1]) * num(m[4]))}% ${m[2]} Resistance Penetration`, key: "hitsWithType", params: { type: m[3], stacks: num(m[4]) } })],
  // On the Sublime (2026-10-18): "+X% additional Spell Projectile Damage for each Spell Projectile generated recently. Stacks up
  // to N times": held at N stacks while a modeled skill hit generates (Spell) Projectiles (best case, as the other stacking
  // buffs; the "recently" window is not sourced, provisional). It read Not modeled before.
  [new RegExp(`^\\+?${N}% (.+?) for each (Spell )?Projectile generated recently\\. Stacks up to (\\d+) times?$`, "i"), (m) => ({ body: `+${round(num(m[1]) * num(m[4]))}% ${m[2]}`, key: "projectilesGenerated", params: { spell: Boolean(m[3]), stacks: num(m[4]) } })],
  [new RegExp(`^Damage penetrates ${N}% (Elemental|Fire|Cold|Lightning|Erosion) Resistance of (${STATE_WORDS}) enemies$`, "i"), (m) => ({ body: `+${m[1].replace(/^\+/, "")}% ${m[2]} Resistance Penetration`, key: "enemyState", params: { word: m[3] } })],
  [new RegExp(`^(.+?) (?:against|to) (${STATE_WORDS}) enemies$`), (m) => ({ body: m[1], key: "enemyState", params: { word: m[2] } })],
  [/^(.+?) (?:dealt )?to Nearby enemies$/, (m) => ({ body: m[1], key: "nearTarget" })],
  [/^(.+?) (?:against|to) enemies in [Pp]roximity$/, (m) => ({ body: m[1], key: "nearTarget" })],
  [/^(.+?) (?:dealt )?to Distant enemies$/, (m) => ({ body: m[1], key: "distant" })],
  // Residual batch A-2 (TLIDB radii: Nearby 6 m, Proximity 4 m, Distant 6 m away; src/dummy-target.js).
  [/^(?!Enemies with Notoriety)(.+?) against Distant enemies$/, (m) => ({ body: m[1], key: "distant" })],
  // "when no enemies are Nearby / in proximity": the dummy is the only enemy, so only the Distant alternative (6 m away).
  [/^(.+?) when no enemies are (?:Nearby|in [Pp]roximity)$/, (m) => ({ body: m[1], key: "noneNear" })],
  // "when only 1 enemies are Nearby": the dummy is the one Nearby enemy while the player stands close.
  [/^(.+?) when only 1 enem(?:y|ies) (?:is|are) Nearby$/, (m) => ({ body: m[1], key: "nearTarget" })],
  // "+6% additional Cast Speed per second when an Elite is Nearby, up to +18%": the dummy is a Boss (so an Elite) Nearby; the
  // stacking buff is held at its cap (own buffs pre-built, user rule 2026-10-09).
  [new RegExp(`^\\+${N}% (additional )?(.+?) per second when an Elite is (?:Nearby|in [Pp]roximity), up to \\+${N}%$`), (m) => ({ body: `+${m[4]}% ${m[2] || ""}${m[3]}`, key: "nearTarget" })],
  [/^(.+?) when an Elite is (?:Nearby|in [Pp]roximity)$/, (m) => ({ body: m[1], key: "nearTarget" })],
  // "+35% Aura Effect when there are at least 1 enemies Nearby" (Hanging Two-Tone Mask; gear uniques round 2): the dummy is one
  // enemy, Nearby while the player stands close; a count above 1 never holds on the dummy.
  [/^(.+?) when there (?:are|is) at least (\d+) enem(?:y|ies) Nearby$/, (m) => ({ body: m[1], key: "nearbyEnemiesAtLeast", params: { count: Number(m[2]) } })],
  // "+X% Combo Damage Enhancement if the Combo Finisher cast recently consumes at least N Combo Point(s)" (residual batch A-2):
  // the combo profiles' Finisher consumes the points of its two Starters (src/combo-points.js, provisional).
  [/^(.+?) if the Combo Finisher cast recently consumes at least (\d+) Combo Point\(s\)$/, (m) => ({ body: m[1], key: "comboPointsAtLeast", params: { points: Number(m[2]) } })],
  // "+16% additional damage when channeling" (residual batch A-2): a channeled main skill holds its channel on the dummy.
  [/^(.+?) (?:when|while) channeling$/, (m) => ({ body: m[1], key: "channeling" })],
  // ---- weapon / stance ----
  [new RegExp(`^\\+${N}% additional Attack Damage for each unique type of weapon equipped while Dual Wielding$`), (m) => ({ body: `+${m[1]}% additional Attack Damage`, key: "dualWieldTypes" })],
  [/^(.+?) (?:dealt )?when holding a Shield$/, (m) => ({ body: m[1], key: "shield" })],
  // Ronin Tradeoff (TLIDB core text): "While Dual Wielding, -10% additional Attack Speed, -30% Attack Block Chance, and +55%
  // additional Melee Damage" / "While holding a Shield, -15% Defense, +5% additional Movement Speed, and +50% Attack and Spell
  // Block Chance": one body per listed modifier.
  [/^While Dual Wielding, ([+-]\d.*)$/i, (m) => ({ bodies: splitList(m[1]), key: "dualWielding" })],
  [/^While holding a Shield, ([+-]\d.*)$/i, (m) => ({ bodies: splitList(m[1]), key: "shield" })],
  // Gear-pact batch chunk 2 (backlog row 8): stance and held-weapon wordings.
  [/^(.+?) when Unarmed$/, (m) => ({ body: m[1], key: "unarmed" })],
  [/^(.+?) when your off-hand weapon slot is empty$/, (m) => ({ body: m[1], key: "offHandEmpty" })],
  [/^(.+?) when wielding a Wand or Tin Staff$/, (m) => ({ body: m[1], key: "wieldingWandOrStaff" })],
  // Mind Blade (core audit batch B5): "Adds 30% Physical Damage as Cold Damage when not wielding a Wand or Tin Staff". User-supplied
  // 2026-10-19 (not in-game tested): the 30% applies with any weapon, as the game record (affix 146061584) has no weapon condition
  // node; only the other clause, "+25% additional Cold Damage when wielding a Wand or Tin Staff" (affix 518814688, which does check
  // the weapon), needs a Wand or Tin Staff (wieldingWandOrStaff above). The text's weapon wording is not a condition.
  [/^(.+?) when not wielding a Wand or Tin Staff$/, (m) => ({ body: m[1], key: "notWieldingWandOrStaff" })],
  // Full Life (the dummy never attacks; own Life is full unless sealed or the Life group picks Low Life). The pact
  // "Affliction … at Full Life" lines keep the planner's Full Life model (src/planner.js fullLife), so they are not read here.
  // "… when not at Full Life / Mana" (residual batch P1): before the Full rules, which would read the body as "… when not".
  [/^(?!.*Affliction)(.+?) (?:when|while) not at Full Life$/, (m) => ({ body: m[1], key: "notFullLife" })],
  [/^(.+?) (?:when|while) not at Full Mana$/, (m) => ({ body: m[1], key: "notFullMana" })],
  [/^(?!.*Affliction)(.+?) (?:when )?at Full Life$/, (m) => ({ body: m[1], key: "fullLife" })],
  // Blessings at max / at least N stacks (stacks from the Blessing model; own buffs pre-built, so a held Blessing is at max).
  [/^(.+?) when (Tenacity|Focus|Agility) Blessing reaches max stacks$/, (m) => ({ bodies: splitAnd(m[1]), key: "blessingAtMax", params: { name: m[2] } })],
  [/^(.+?) at Max (Tenacity|Focus|Agility) Blessings?$/, (m) => ({ bodies: splitAnd(m[1]), key: "blessingAtMax", params: { name: m[2] } })],
  // Chunk 4 (legendary wordings): "… when at max Tenacity Blessing" (Fiery Oath), "… for every stack of Tenacity Blessing" /
  // "… per stack of Tenacity Blessing" (Magnus' / Ralph's Laws), "Damage Penetrates 1% Elemental Resistance for every stack
  // of Agility Blessing", "… when any Blessing is at least at 6 stack(s)" (Will), "… if you have used a Fire Skill recently"
  // (Ice and Fire: an active damage skill with the tag is used on the dummy).
  [/^(.+?) when at max (Tenacity|Focus|Agility) Blessing$/, (m) => ({ bodies: splitAnd(m[1]), key: "blessingAtMax", params: { name: m[2] } })],
  [/^Damage Penetrates (\d+(?:\.\d+)?) ?% (Elemental|Fire|Cold|Lightning|Erosion) Resistance for every stack of (Tenacity|Focus|Agility) Blessing$/i, (m) => ({ body: `+${m[1]}% ${m[2]} Resistance Penetration`, key: "blessingPerStack", params: { name: m[3] } })],
  [/^(.+?) (?:for every|per) stack of (Tenacity|Focus|Agility) Blessing$/, (m) => ({ body: m[1], key: "blessingPerStack", params: { name: m[2] } })],
  // Gear uniques round 2 (src/gear-unique-modules.js): capped per-stack wordings ("+20% Fire Damage per stack of Tenacity Blessing
  // owned. Stacks up to 6 time(s)", Heart of Rock; "-24% Critical Strike Rating per stack of Agility Blessing . Stacks up to 4
  // time(s)", Fury Heart) count min(stacks, N); "When Tenacity Blessing is at least at 7 stack(s), …" (Varagon Shroud) leads with
  // its condition; "… if the max stacks of Focus Blessing is not lower than the stacks of other Blessings" (Providential Grace).
  [/^([+-]\d(?:(?!\. [A-Z]|: ).)*?) (?:for every|per) stack of (Tenacity|Focus|Agility) Blessing(?: owned)? ?\. Stacks up to (\d+) time\(s\)$/, (m) => ({ body: m[1], key: "blessingPerStack", params: { name: m[2], cap: Number(m[3]) } })],
  // (One sentence only: hero-trait ladders "…, +X%. When … at least at N stack(s), this effect becomes: …" stay unread.)
  [/^When (Tenacity|Focus|Agility) Blessing is at least at (\d+) stack\(s\), ([+-]\d(?:(?!\. [A-Z]|: ).)*)$/, (m) => ({ bodies: splitAnd(m[3]), key: "blessingAtLeast", params: { name: m[1], stacks: Number(m[2]) } })],
  [/^(.+?) if the max stacks of (Tenacity|Focus|Agility) Blessing is not lower than the stacks of other Blessings$/, (m) => ({ body: m[1], key: "blessingMaxNotLower", params: { name: m[2] } })],
  [/^(.+?) when any Blessing is at least at (\d+) stack\(s\)$/, (m) => ({ body: m[1], key: "anyBlessingAtLeast", params: { stacks: Number(m[2]) } })],
  [/^(.+?) if you have used an? (Fire|Cold|Lightning|Erosion|Physical|Spell|Attack|Melee|Projectile) Skill recently$/, (m) => ({ body: m[1], key: "usedSkillTag", params: { tag: m[2] } })],
  [/^(.+?) when you have at least (\d+) stack\(s\) of (Tenacity|Focus|Agility) Blessing$/, (m) => ({ bodies: splitAnd(m[1]), key: "blessingAtLeast", params: { name: m[3], stacks: Number(m[2]) } })],
  // ---- Blessings and buffs (talent batch chunk 3) ----
  [/^(.+?) (?:while|when) (Tenacity|Focus|Agility) Blessing is active$/, (m) => ({ body: m[1], key: "blessingActive", params: { name: m[2] } })],
  [/^(.+?) when having (Tenacity|Focus|Agility) Blessing$/, (m) => ({ body: m[1], key: "blessingActive", params: { name: m[2] } })],
  [/^(.+?) per stack of (Tenacity|Focus|Agility) Blessing owned$/, (m) => ({ body: m[1], key: "blessingPerStack", params: { name: m[2] } })],
  // (Two-part bodies such as Hidden Mastery's "+15% Attack Speed and +15% additional Attack Damage" have their own rule below.)
  [/^(?!.* and +)(.+?) (?:while|when) having (Fervor|Attack Aggression|Spell Aggression|Hasten)$/, (m) => ({ body: m[1], key: "buffActive", params: { buff: m[2] } })],
  // ---- self state, events, timed ----
  [new RegExp(`^\\+${N}% additional damage every [\\d.]+ ?s while standing still, up to \\+${N}% additional damage$`), (m) => ({ body: `+${m[2]}% additional damage`, key: "standingStill", params: { rampCap: true } })],
  [/^(.+?) while standing still$/, (m) => ({ body: m[1], key: "standingStill" })],
  // Hare's Agility (Ethereal Prism core; game affix 1525925, core audit batch B2): on leaving Stand Still (trigger 1000100) one stack
  // of buff 20480 for 2 s, up to 5; on hit within 4 m (node 189 range 400) GetBuffStack(20480) × P1 additional damage (attr 5719
  // mod 4, one additional term). Stand Still and leaving it are the Movement group's two alternatives (core audit Q10,
  // user-confirmed 2026-10-18: best case by damage, listed in the assumptions): the moving alternative holds the stacks at the cap (user rule: movement buffs fully
  // stacked), standing still holds none. The "+P2% Attack Speed" part (an empty effect row in the game record) is one flat bonus
  // while the buff is up, not per stack (user-supplied 2026-10-19, Google AI Mode answer, not tested in game).
  [new RegExp(`^When exiting Stand Still, gains 1 stack of buff that lasts for ${N} ?s, up to (\\d+) times$`), (m) => ({ bodies: [], key: "exitStandStillGain", params: { seconds: num(m[1]), stacks: num(m[2]) } })],
  [new RegExp(`^\\+${N}% additional damage dealt to enemies in proximity for each stack of buff\\. \\+${N}% Attack Speed$`), (m) => ({ bodies: [`+${m[1]}% additional damage`, `+${m[2]}% Attack Speed`], key: "exitStandStillStacks", params: { attackSpeed: num(m[2]) } })],
  // "Recently moved" lines (Rushed): held in both movement choices (user rule 2026-10-14: "in the real game you are always
  // moving"), so they take their own best-case key instead of the Movement group.
  [/^(.+?) if you have recently moved more than (\d+) m$/, (m) => ({ body: m[1], key: "movedRecently", params: { meters: num(m[2]) } })],
  // "+20% Sentry Damage when moving" (Artisan [3,4]; chunk 4): the movement group.
  [/^(.+?) when moving$/, (m) => ({ body: m[1], key: "moving" })],
  [new RegExp(`^When you have Hasten, \\+${N}% Attack Speed and Cast Speed for every (\\d+) ?m of movement made recently\\. Stacks up to (\\d+) time\\(s\\)$`), (m) => ({ bodies: [`+${round(num(m[1]) * num(m[3]))}% Attack Speed`, `+${round(num(m[1]) * num(m[3]))}% Cast Speed`], key: "hastenMoving", params: { stacks: num(m[3]) } })],
  [/^(.+?) when not at Low Life$/, (m) => ({ body: m[1], key: "notLowLife" })],
  [/^(.+?) at Low Life$/, (m) => ({ body: m[1], key: "lowLife" })],
  [/^(.+?) (?:when )?at Full Mana$/, (m) => ({ body: m[1], key: "fullMana" })],
  [/^(.+?) (?:when )?at Low Mana$/, (m) => ({ body: m[1], key: "lowMana" })],
  [/^(.+?) when the Energy Shield is not low$/, (m) => ({ body: m[1], key: "energyShieldNotLow" })],
  [/^(.+?) if you have dealt a Critical Strike recently$/, (m) => ({ body: m[1], key: "critRecently" })],
  [new RegExp(`^When triggering a Critical Strike, gains the following buff for the next (\\d+) ?s: \\+${N}% additional damage and (.+)$`), (m) => ({ body: `+${m[2]}% additional damage`, key: "critRecently", params: { seconds: num(m[1]), unread: m[3] } })],
  [/^(.+?) if you have (?:lost Life|taken damage) recently$/, (m) => ({ body: m[1], key: "hitByEnemy" })],
  [/^(\+\d+ to Max \w+ Blessing Stacks) if you have taken damage in the last \d+ ?s$/, (m) => ({ body: m[1], key: "hitByEnemy" })],
  // "Damaged in the last N s" (Vigilant Guard: "+100% Vigilance effect if you have taken damage within the last 8 seconds";
  // user decision 2026-10-15): the same "Hit or blocked recently" best case.
  [/^(.+?) if you have (?:taken damage|been damaged) (?:in|within) the last \d+ ?(?:s|seconds?)$/, (m) => ({ body: m[1], key: "hitByEnemy" })],
  [/^(\+\d+ to Max \w+ Blessing Stacks) if you have used a Mobility Skill in the last \d+ ?s$/, (m) => ({ body: m[1], key: "mobility" })],
  [/^(\+\d+ to Max \w+ Blessing Stacks) if you have landed a Critical Strike or Reaped in the last \d+ ?s$/, (m) => ({ body: m[1], key: "critOrReapRecently" })],
  // Regain events (src/regain-model.js, 2026-10-14): on while the build Regains; the per-Regain stacks count min(M, Regains in N s).
  [/^(.+?) if you have Regained in the last (\d+(?:\.\d+)?) ?s$/, (m) => ({ body: m[1], key: "regained", params: { seconds: num(m[2]) } })],
  [/^(.+?) for each time you have Regained in the last (\d+(?:\.\d+)?) ?s\. Stacks up to (\d+) time\(s\)$/, (m) => ({ body: m[1], key: "regained", params: { seconds: num(m[2]), stacks: num(m[3]) } })],
  [/^(.+?) for \d+ ?s after using Mobility Skills$/, (m) => ({ body: m[1], key: "mobility" })],
  // Dark Advance (Ethereal Prism core; game affix 44099244, core audit B7): a 4 s buff on casting Dark Gate (src/minion-cores.js).
  [/^(.+?) if a Dark Gate has been cast recently$/, (m) => ({ body: m[1], key: "darkGateRecently" })],
  // Heat Up (Artisan core; game affix 178625: casting a Sentry skill starts a 4 s buff, "+30% additional Sentry Damage"; core audit B7).
  [/^(.+?) if Sentry Skill has been cast recently$/, (m) => ({ body: m[1], key: "sentryCastRecently" })],
  [/^At max channeled stacks, (.+?) for (\d+(?:\.\d+)?) s$/, (m) => ({ body: m[1].replace(/ damage for Channeled Skills$/i, " Channeled Skill Damage"), key: "channelMax", params: { seconds: num(m[2]) } })],
  [/^Every ([\d.]+) s, (.+?) for the next Main Skill used$/, (m) => ({ body: m[2], key: "nextMainSkill", params: { interval: num(m[1]) } })],
  [/^(.+?) for the next Main Skill(?: used)? every ([\d.]+) s(?:\. .*)?$/, (m) => ({ body: m[1], key: "nextMainSkill", params: { interval: num(m[2]) } })],
  [new RegExp(`^When casting a skill, there is a ${N}% chance for that cast to deal \\+${N}% additional damage$`), (m) => ({ body: `+${round(num(m[1]) * num(m[2]) / 100)}% additional damage`, key: "castChance", params: { chance: num(m[1]), value: num(m[2]) } })],
  [new RegExp(`^\\+${N}% Attack Speed and \\+${N}% additional Attack Damage when having Attack Aggression$`), (m) => ({ bodies: [`+${m[1]}% Attack Speed`, `+${m[2]}% additional Attack Damage`], key: "attackAggression" })],
  [/^(.+?) if you have dealt (Physical|Fire|Cold|Lightning|Erosion) Damage recently$/, (m) => ({ body: m[1], key: "dealtType", params: { type: m[2] } })],
  [new RegExp(`^(.+?) when (${STAT_WORDS}) is no less than (${STAT_WORDS})$`), (m) => ({ body: m[1], key: "statCompare", params: { stat: m[2].toLowerCase(), other: m[3].toLowerCase() } })],
  // Aura counts (gear uniques round 2: Lone Walker's Boots, Vow's Grasp): the active Aura types (as auraCount; Auras from other
  // players or Minions are not counted: provisional).
  [/^(.+?) when affected by (\d+) or more Auras$/, (m) => ({ body: m[1], key: "auraCountAtLeast", params: { count: Number(m[2]) } })],
  [/^(.+?) when (?:the character is )?only affected by (\d+) Auras?$/, (m) => ({ body: m[1], key: "auraCountExactly", params: { count: Number(m[2]) } })],
  // "+80% damage per stack of Max Spell Burst , up to +320%" (Law of Greed): the Max Spell Burst total the Spell Burst model reads.
  [new RegExp(`^\\+${N}% (.+?) per stack of Max Spell Burst ?, up to \\+?${N}%$`), (m) => ({ body: `+${m[1]}% ${m[2]}`, key: "maxSpellBurstPerStack", params: { per: num(m[1]), cap: num(m[3]) } })],
  [new RegExp(`^\\+${N}% additional damage for each type of Aura you are affected by$`), (m) => ({ body: `+${m[1]}% additional damage`, key: "auraCount", params: { per: num(m[1]) } })],
  // Keen Intellect (Ethereal Prism core; game affixes 921811584 / 733359744 / 818140224, core audit batch B2): node 208 counts the
  // equipped active skills with the tag (Empower 6001230, Curse 6000150, Mobility 6000010); "(multiplies)" lines are one
  // additional factor per skill ((1 + X)^n), the penetration lines add per skill. The Defensive clause (+13% additional Max Mana)
  // is left to the stat sheet.
  [/^For every Active (Empower|Curse|Mobility) Skill equipped, (.+?)\.?$/, (m) => ({ bodies: splitAnd(m[2].replace(/\s*\(multiplies\)$/i, "")), key: "perEquippedSkill", params: { type: m[1], multiplies: /\(multiplies\)$/i.test(m[2]) } })],
  // ---- per-stat ----
  [new RegExp(`^\\+${N}% (.+?) per (\\d+) (${STAT_WORDS})$`), (m) => ({ body: `+${m[1]}% ${m[2]}`, key: "perStat", params: { per: num(m[1]), every: num(m[3]), stat: m[4].toLowerCase(), template: m[2] } })],
  // Residual batch A-2: added flat per stat on a named skill type ("Adds 2 - 2 Fire Damage to Attacks per 10 Strength"; both
  // ends scale), "for every N <Stat>", the highest of the three stats, and stat thresholds. Rounded down per step (provisional,
  // as perStat). "Adds X - Y Fire Damage per 10 Strength" with no skill type stays unread (src/gear-unique-modules.js).
  [new RegExp(`^(Adds \\d+(?:\\.\\d+)? - \\d+(?:\\.\\d+)? (?:Physical|Fire|Cold|Lightning|Erosion) Damage to (?:Attacks and Spells|Attacks|Spells)) (?:per|for every) (\\d+) (${STAT_WORDS})$`), (m) => ({ body: m[1], key: "perStat", params: { every: num(m[2]), stat: m[3].toLowerCase() } })],
  [new RegExp(`^\\+${N}% (.+?) for every (\\d+) (${STAT_WORDS})$`), (m) => ({ body: `+${m[1]}% ${m[2]}`, key: "perStat", params: { per: num(m[1]), every: num(m[3]), stat: m[4].toLowerCase(), template: m[2] } })],
  [new RegExp(`^\\+${N}% (.+?) for every (\\d+) of the highest stat among Strength, Dexterity, and Intelligence$`), (m) => ({ body: `+${m[1]}% ${m[2]}`, key: "highestStat", params: { every: num(m[3]) } })],
  // False God's Skin's stat buff rolls ("+1% damage per 16 of the lowest stat", TLIDB pool card): the lowest of the stat-sheet
  // Strength / Dexterity / Intelligence totals, rounded down per step (as highestStat).
  [new RegExp(`^\\+${N}% (.+?) per (\\d+) of the lowest stat$`), (m) => ({ body: `+${m[1]}% ${m[2]}`, key: "lowestStat", params: { every: num(m[3]) } })],
  // "+1% damage per 27 stats" (Destroyer's Amulet base affix; craft affixes per 6 / 8 / 12 / 16 / 24 stats; 2026-10-14):
  // "stats" read as Strength + Dexterity + Intelligence (the three main attributes "All Stats" raises; provisional), the
  // stat-sheet totals after % and additional multipliers, rounded down per step (provisional, as perStat).
  [new RegExp(`^\\+${N}% (.+?) per (\\d+) stats$`), (m) => ({ body: `+${m[1]}% ${m[2]}`, key: "perAllStats", params: { per: num(m[1]), every: num(m[3]), template: m[2] } })],
  [new RegExp(`^(.+?) when having at least (\\d+) (${STAT_WORDS})$`), (m) => ({ body: m[1], key: "statAtLeast", params: { stat: m[3].toLowerCase(), value: num(m[2]) } })],
  // Wield My Sword (Silent Avowal / Vorax Hands named affix, TLIDB tooltip; frost-terra audit 2026-10-13): "+1% additional damage
  // for you and your Minions for every +4% Attack or Spell Block Chance" (no cap stated). Same reading as the line below.
  [new RegExp(`^\\+?${N}% additional damage for you and your Minions for every \\+?${N}% Attack or Spell Block Chance$`), (m) => ({ body: `+${num(m[1])}% additional damage`, key: "perBlockChance", params: { every: num(m[2]), per: num(m[1]), cap: Infinity } })],
  [new RegExp(`^For every \\+${N}% Attack or Spell Block Chance, \\+${N}% additional damage, up to \\+${N}%$`), (m) => ({ body: `+${m[2]}% additional damage`, key: "perBlockChance", params: { every: num(m[1]), per: num(m[2]), cap: num(m[3]) } })],
  [new RegExp(`^${N}% (.+?) for every 1% of Life lost$`), (m) => ({ body: `+${m[1]}% ${m[2]}`, key: "perLifeLost", params: { per: num(m[1]), template: m[2] } })],
  // Selena traits batch (2026-10-13): "+X% additional damage for every 3% Life sealed" (Drenched Hem) and "+X% additional Spell
  // Damage for every N% Life sealed" (game affix 696614016): the build's sealed Life (aura reservations; planner lifeSealedPercent),
  // rounded down per step (provisional, as the other per-N lines).
  // Psychic's Dirge (Pantheon's Elegy): "+1% Reaping Duration for every +1% Affliction effect, up to 300%": the character's
  // increased Affliction Effect lines (planner afflictionEffectPercent), capped (Selena Dance traits task 2026-10-13; it only
  // matters with a Reaping source).
  [new RegExp(`^\\+?${N}% (Reaping Duration) for every \\+?${N}% Affliction effect, up to ${N}%$`, "i"), (m) => ({ body: `+${num(m[1])}% ${m[2]}`, key: "perAfflictionEffect", params: { per: num(m[1]), every: num(m[3]), cap: num(m[4]) } })],
  // "+2% Aura Effect per +3% Sealed Mana Compensation" (Lone Walker's Boots; frost-terra audit 2026-10-13): the character's global
  // Sealed Mana Compensation (talents, slates, gear, hero traits; planner globalSealedManaCompensationPercent), proportional, not
  // rounded down per step: game affix 898342 is a linear attribute conversion (node 114: Sealed Mana Compensation → Aura Effect,
  // no step or limit), and the in-game panel (research/frost-terra-panel-compare-2026-10-13.md) reads Aura Effect 130.98333 =
  // 95.65 + 30 + 2 × 8 / 3 with 8% Sealed Mana Compensation (Frost Terra v2 reference, UE_game.log 2026-10-13).
  [new RegExp(`^(.+?) per \\+?(\\d+(?:\\.\\d+)?) ?% Sealed Mana Compensation$`), (m) => ({ body: m[1], key: "perSealedManaCompensation", params: { every: num(m[2]) } })],
  // The leading "+" is optional: the leveled Drenched Hem text reads "1.8% additional damage for every 3 % Life sealed" (before
  // the frost-terra audit 2026-10-13 that wording matched no rule, so the trait never applied).
  [new RegExp(`^\\+?${N}% (.+?) for every (\\d+(?:\\.\\d+)?) ?% Life [Ss]ealed$`), (m) => ({ body: `${num(m[1]) >= 0 ? "+" : ""}${num(m[1])}% ${m[2]}`, key: "perLifeSealed", params: { per: num(m[1]), every: num(m[3]) } })],
  // Gear-pact batch chunk 3 (resource pools): "+1% additional Spell Damage for every 100 Max Mana owned, up to 70%" reads the
  // stat-sheet pool (src/character-stats.js), rounded down per step (provisional, as perStat).
  [new RegExp(`^\\+${N}% (.+?) for every (\\d+) Max (Mana|Life) owned, up to \\+?${N}%$`), (m) => ({ body: `+${m[1]}% ${m[2]}`, key: "perResource", params: { per: num(m[1]), every: num(m[3]), stat: m[4] === "Mana" ? "maxMana" : "maxLife", cap: num(m[5]) } })],
  // ---- hero trait audit batch B2 (2026-10-19, research/hero-traits-audit-2026-10-19.md §5 B2, F7): plain trait wordings ----
  // Cleanse Filth (game affix 470412320 [1000, 4, 80]: node "per" on attr 93 Max Mana → 57271, rounded down per step): the
  // leading "For every N Max Mana you have" wording of the per-resource rule above.
  // (Damage bodies only: Boundless Sanctuary's "+10% Area for Realm of Mercury" per Max Mana keeps its No DPS effect badge.)
  [new RegExp(`^For every (\\d+) Max (Mana|Life) you have, \\+?${N}% (.+? Damage), up to \\+?${N}%$`), (m) => ({ body: `+${num(m[3])}% ${m[4]}`, key: "perResource", params: { per: num(m[3]), every: num(m[1]), stat: m[2] === "Mana" ? "maxMana" : "maxLife", cap: num(m[5]) } })],
  // Missing Life (Hysteria: game affix 49439984 [1, 0.7] "per 11 → 57191"; Divine Spirit: 9813309 [3, 2.3] "per 11 → 57191"):
  // the Life-lost state the "for every 1% of Life lost" lines read (missing unsealed Life; 0 on the dummy unless the Life group
  // assumes Low Life). Steps of N% are rounded down (provisional, as the other per-N lines). "when outside the Divine Realm"
  // (Thea – Incarnation of the Gods) is held: the Realm is cast on the dummy and you stand outside it (best case; the Divine
  // Realm engine is batch B7; provisional, open question thea-divine-spirit-outside-realm).
  [new RegExp(`^\\+?${N}% (.+?) for every (\\d+(?:\\.\\d+)?) ?% (?:of )?Missing Life( when outside the Divine Realm)?$`), (m) => ({ body: `${num(m[1]) >= 0 ? "+" : ""}${num(m[1])}% ${m[2]}`, key: "perLifeLost", params: { per: num(m[1]), every: num(m[3]), template: m[2], outsideDivineRealm: Boolean(m[4]) } })],
  // Endless Frenzy (game affix 914731264 [1, 0.6, -0.1, 100]: attr 34301 Knockback distance converted to 57191 additional damage
  // and to the deviation angle, up to 100 stacks): the build's "+X% Knockback distance" total (planner knockbackDistancePercent).
  // The Projectile Max Deviation Angle part changes nothing on one dummy.
  [new RegExp(`^For every \\+?(\\d+(?:\\.\\d+)?) ?% Knockback distance, \\+?${N}% (additional damage) and .+?\\. Stacks up to (\\d+) time\\(s\\)$`, "i"), (m) => ({ body: `+${num(m[2])}% ${m[3]}`, key: "perKnockbackDistance", params: { every: num(m[1]), per: num(m[2]), stacks: num(m[4]) } })],
  // Prophecy of Truth (game affix 15579581 [3, 20]): the allocated Legendary Medium Talents on the talent panels (planner
  // legendaryMediumTalentsAllocated), up to the cap (the text prints the cap without "%").
  [new RegExp(`^\\+?${N}% (.+?) for each Legendary Medium Talent allocated, up to \\+?${N}%?$`), (m) => ({ body: `+${num(m[1])}% ${m[2]}`, key: "perLegendaryMediumTalent", params: { per: num(m[1]), cap: num(m[3]) } })],
  // Radiation Field (game affixes 8377909 [10]: attr 6001 / 6002 additional with the Aura-affected tag 4015000, copied to the
  // Minions by node 111; 14298797 [8]: node 111): the active Aura types (own Auras; the Minions stand inside them: best case).
  [new RegExp(`^\\+?${N}% (additional )?Attack and Cast Speed when you or your Minions are affected by an Aura$`), (m) => ({ bodies: [`+${num(m[1])}% ${m[2] || ""}Attack and Cast Speed`, `+${num(m[1])}% ${m[2] || ""}Attack and Cast Speed for Minions`], key: "auraCountAtLeast", params: { count: 1 } })],
  [new RegExp(`^\\+?${N}% additional damage for every Aura affecting you and your Minions$`), (m) => ({ bodies: [`+${num(m[1])}% additional damage`, `+${num(m[1])}% additional damage for Minions`], key: "auraCount", params: { per: num(m[1]) } })],
  // Feline Fury (game affixes 22949920 [150] / 12176885 [20], both on the Dual Wielding buff 352): the held weapons' types.
  [/^(.+?) when Dual Wielding the same type of weapons$/, (m) => ({ body: m[1], key: "dualWieldSameType" })],
  [/^(.+?) when Dual Wielding different types of weapons$/, (m) => ({ body: m[1], key: "dualWieldDifferentTypes" })],
  // Twinblade Onslaught (game affix 15625477 [30]: attr 5719 additional with the Attack tag 6001090 on the Dual Wielding state):
  // the +X% additional Attack Damage while Dual Wielding; the Dual Wielding status's +10% additional Attack Speed is dropped by
  // src/weapon-damage-model.js (NO_DUAL_WIELD_SPEED).
  [new RegExp(`^No additional Attack Speed bonus is granted while Dual Wielding ?\\. Instead, \\+?${N}% additional Attack Damage$`), (m) => ({ body: `+${num(m[1])}% additional Attack Damage`, key: "dualWielding", params: { replacesDualWieldSpeed: true } })],
  // Ice to Blaze (game affix 514114784 [-5]: node 111 on the enemy, label 3001462 Frostbitten): the dummy's Fire Resistance is
  // fixed while it is Frostbitten (src/planner.js reads the active entry; no body of its own).
  [new RegExp(`^The Fire Resistance of Frostbitten enemies is fixed at ${N}%$`), (m) => ({ bodies: [], key: "fixedFireResistanceFrostbitten", params: { value: num(m[1]) } })],
  // "… for you and your Minions" (Deepfreeze: game affix 152531504 [10] writes attr 5109 twice, with and without the Minion tag
  // 5002060): the player's copy; the Minion model reads the Minion share from the same line (src/minion-damage-model.js).
  [/^(\+?-?\d.*? Damage) for you and your Minions$/, (m) => ({ body: m[1], key: "youAndMinions" })],
  // World Within (src/world-within.js): each Spirit Magus's Enhanced-skill chance from its element's resistance (Rock Magus: Armor);
  // src/planner.js gives each Magus its share (no body of its own).
  [WORLD_WITHIN_LINE, (m) => ({ bodies: [], key: "worldWithin", params: { every: num(m[1]), armorEvery: num(m[2]), per: num(m[3]), cap: num(m[4]) } })],
  // ---- conditions the dummy or this planner cannot satisfy yet (kept so the badge can say why) ----
  // Resource consumed recently: needs each skill's cost per use and the "recently" window; neither is in the planner's data.
  [/^(.+?) for every (\d+) (Mana|Life) consumed recently(?:, up to .+)?$/, (m) => ({ body: m[1], key: "unmodeled", params: { reason: `needs ${m[3]} consumed per second (skill costs are not in the planner's data) and the length of "recently" (not sourced)` } })],
  [/^Every [\d.]+ s, (.+?) for enemies within (\d+) m\. Stacks up to (\d+) times$/, (m) => ({ body: m[1], key: "unmodeled", params: { reason: "a stacking enemy debuff (damage taken): debuffs are talent batch chunk 3" } })],
  // Consumption cores (core audit batch B3; src/consumption-procs.js, settled in src/planner.js as state.consumption): the share of
  // Main Skill casts that find a stack = min(1, gain rate ÷ cast rate) (Q5, user-confirmed 2026-10-18); Waiting Attack holds the
  // stacks it consumed for 8 s and the consumed Agility's own effect is lost (Q14, user-confirmed 2026-10-18).
  [/^Consumes all Agility Blessing every (\d+(?:\.\d+)?) ?s\. For each stack consumed, (.+?) in the next (\d+(?:\.\d+)?) ?s$/, (m) => ({ body: m[2], key: "consumeAllAgility", params: { every: num(m[1]), seconds: num(m[3]) } })],
  [/^If you have Agility Blessing stacks when casting the Main Skill, consumes (\d+) stack\(s\) of Agility Blessing to make that cast deal (.+)$/, (m) => ({ body: m[2], key: "consumeAgilityPerCast", params: { stacks: num(m[1]) } })],
  [/^While Blur is active, loses Blur after casting a Main Skill, and (.+?)(?: for that cast)?$/, (m) => ({ body: m[1], key: "consumeBlurPerCast" })],
  [/^(.+?) for (?:the )?Triggered Skills$/, (m) => ({ body: m[1], key: "unmodeled", params: { reason: "scoped to triggered skills (no per-skill trigger scope yet)" } })],
  [/^(.+?) for skills cast by Spell Burst$/, (m) => ({ body: m[1], key: "unmodeled", params: { reason: "scoped to Spell Burst casts (read by the skill-hit Spell Burst model where it applies)" } })],
  // "+X% [additional] Attack Speed when performing Multistrikes" is read per skill by src/skill-hit-model.js (skills that can
  // Multistrike; 2026-10-14), so it is left out here (a resolved body would reach every attack).
  [/^(?!.*Attack Speed when performing Multistrikes$)(.+?) when performing Multistrikes$/, (m) => ({ body: m[1], key: "unmodeled", params: { reason: "Multistrike events (read from support effects only)" } })],
  [/^(.+?) per Fervor Rating$/, (m) => ({ body: m[1], key: "unmodeled", params: { reason: "Fervor is not modeled (talent batch chunk 3)" } })]
];

/** The body and condition of a conditional passive line, or null when it carries no condition this resolver knows. */
export function splitCondition(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  for (const [pattern, build] of LINE_RULES) {
    const match = clean.match(pattern);
    if (!match) continue;
    const { body, bodies, key, params = {} } = build(match);
    return { bodies: bodies || [body], condition: { key, params, wording: clean } };
  }
  return null;
}

// Exclusive groups a condition key belongs to (src/planner.js compares their alternatives).
export const CONDITION_GROUPS = {
  standingStill: "movement", moving: "movement", hastenMoving: "movement", exitStandStillGain: "movement", exitStandStillStacks: "movement",
  nearTarget: "distance", distant: "distance", noneNear: "distance", nearbyEnemiesAtLeast: "distance",
  lowLife: "life", notLowLife: "life", perLifeLost: "life", lifeLost: "life", fullLife: "life", notFullLife: "life",
  fullMana: "mana", lowMana: "mana", notFullMana: "mana"
};

const on = (conditionText, extra = {}) => ({ active: true, conditionText, ...extra });
const off = (conditionText, extra = {}) => ({ active: false, conditionText, ...extra });

/**
 * Resolve one condition against the planner's state. Support clauses carry their own value fields (value, perStack,
 * multiplies, cap, weapon, meters, triggeredOnly, stackCap) and get `appliedValue` exactly as src/support-effects.js
 * computed it before chunk 2. Passive lines get `active` and, for scaled conditions, a `factor` (per-stack count,
 * expected share or uptime) the body is multiplied by.
 */
export function resolveLineCondition(condition, state) {
  const key = condition.key;
  const group = CONDITION_GROUPS[key] || null;
  const result = resolveKey(condition, state);
  return { group, provisional: false, ...result };
}

function resolveKey(condition, state) {
  if (!state) return { active: null, appliedValue: 0, conditionText: "condition not resolved (no planner state)" };
  const { key, params = {} } = condition;
  const value = condition.value;
  const ailments = new Set(state.enemyAilments || []);
  switch (key) {
    // ---- support keys (unchanged readings; src/support-effects.js) ----
    case "cursed": return state.cursed ? on("the dummy carries a Curse", { appliedValue: value }) : off("the dummy carries no Curse", { appliedValue: 0 });
    case "numbed": return ailments.has("Numbed") ? on(`the build inflicts Numbed; ${NUMBED_MAX_STACKS} stacks assumed (best case, stack count not modeled: provisional)`, { appliedValue: value + (condition.perStack || 0) * NUMBED_MAX_STACKS, provisional: true }) : off("the build inflicts no Numbed", { appliedValue: 0 });
    case "frozen": return ailments.has("Freeze") || ailments.has("Frozen") ? on("the dummy is Frozen", { appliedValue: value }) : off("the build does not Freeze the dummy (Freeze is not modeled)", { appliedValue: 0 });
    case "ailmentTypes": {
      const count = state.enemyAilmentTypeCount || 0;
      if (value === undefined) return count > 0 ? on(`${count} ailment type${count === 1 ? "" : "s"} on the dummy (enemy-ailment model)${params.multiplies ? ", multiplied" : ""}`, { factor: params.multiplies ? null : count, power: params.multiplies ? count : null }) : off("no ailment on the dummy");
      return count > 0 ? on(`${count} ailment type${count === 1 ? "" : "s"} on the dummy (enemy-ailment model), multiplied`, { appliedValue: round(((1 + value / 100) ** count - 1) * 100) }) : off("no ailment on the dummy", { appliedValue: 0 });
    }
    case "singleEnemy": return on("the dummy is the only enemy nearby", { appliedValue: value });
    // Recklessness: "X% additional damage for the supported skill for every 1% Life lost, up to C%" (the Life lost the perLifeLost
    // lines read). Life lost is missing unsealed Life; sealed Life is not Life lost (user-confirmed 2026-10-15; src/planner.js).
    case "lifeLost": {
      const lost = state.life === "low" ? Math.max(0, state.lifeLostPercent ?? 0) : 0;
      const applied = Math.min(condition.cap ?? Infinity, (condition.perPercent ?? 0) * lost);
      const why = state.lifeLostReason || state.lifeReason;
      return lost > 0 ? on(`${round(lost)}% Life lost (${why}) × ${condition.perPercent}% = +${round(applied)}% (up to +${condition.cap}%)`, { appliedValue: round(applied) }) : off(`no Life lost (${why || "Full Life"})`, { appliedValue: 0 });
    }
    case "weapon": {
      const held = state.weaponTypes || [];
      const allowed = WEAPON_WORDS[condition.weapon] || [];
      return held.some((type) => allowed.includes(type)) ? on(`holding a ${condition.weapon} (${held.join(", ")})`, { appliedValue: value }) : off(`no ${condition.weapon} equipped (${allowed.join(" / ")}; provisional mapping)`, { appliedValue: 0 });
    }
    case "standingStill": {
      if (value === undefined) return state.moving === false ? on(`standing still (movement group)${params.rampCap ? ": the ramp is held at its cap (own buffs pre-built; provisional)" : ""}`, { provisional: Boolean(params.rampCap) }) : off("moving (movement group); flip to standing still in the condition settings");
      if (!condition.multiplies) return state.moving === false ? on("standing still (movement group): the skill is auto-used", { appliedValue: value }) : off("moving (movement group): no auto-use; flip to standing still in the condition settings", { appliedValue: 0 });
      const cap = condition.stackCap || 1;
      return state.moving === false ? on(`standing still (movement group), ${cap} stacks, multiplied`, { appliedValue: round(((1 + value / 100) ** cap - 1) * 100) }) : off("moving (movement group); flip to standing still in the condition settings", { appliedValue: 0 });
    }
    case "moving": {
      if (value === undefined) return state.moving !== false ? on("moving (movement group; user rule: movement is constant, movement buffs fully stacked)") : off("standing still (movement group)");
      // Rhythm: "+3% for every 1m of movement made during the trigger interval, up to +X%": at its cap while moving
      // (user rule: movement buffs fully stacked; provisional for the per-interval distance).
      if (condition.triggeredOnly) return state.moving !== false ? on(`moving (movement group): at its +${value}% cap on triggered uses (provisional)`, { appliedValue: value, provisional: true }) : off("standing still (movement group): no movement during the trigger interval", { appliedValue: 0 });
      const cap = condition.cap || 1;
      return state.moving !== false ? on(`moving (movement group): ${cap} stacks, fully stacked (user rule), multiplied`, { appliedValue: round(((1 + value / 100) ** cap - 1) * 100) }) : off("standing still (movement group)", { appliedValue: 0 });
    }
    case "nearTarget": {
      // Explicit radius (support clauses: "within 3 m"): holds by its number at the chosen distance (src/dummy-target.js).
      if (value !== undefined) {
        const meters = condition.meters ?? 3;
        return explicitRadiusHolds(meters, state.nearTarget) ? on(`within ${meters} m of the dummy (${state.nearTarget === false ? `the Distant alternative stands ${DISTANT_STANDING_METERS} m away` : "distance group: close to the dummy, best case"})`, { appliedValue: value }) : off(`${DISTANT_STANDING_METERS} m from the dummy (distance group: the Distant alternative), outside ${meters} m`, { appliedValue: 0 });
      }
      // Nearby (within 6 m) / Proximity (within 4 m), TLIDB keyword tooltips: the player stands close (best case).
      return state.nearTarget !== false ? on(`close to the dummy (distance group, best case): inside Proximity (${KEYWORD_RADII_METERS.proximity} m) and Nearby (${KEYWORD_RADII_METERS.nearby} m), TLIDB keyword radii${params.upTo ? "; the full 'up to' value at point blank (provisional)" : ""}`, { provisional: Boolean(params.upTo) }) : off(`${DISTANT_STANDING_METERS} m from the dummy (distance group: the Distant alternative): outside Proximity / Nearby (the ${KEYWORD_RADII_METERS.nearby} m boundary read as exclusive: provisional)`);
    }
    // ---- passive-line keys ----
    case "noneNear": return state.nearTarget === false ? on(`${DISTANT_STANDING_METERS} m from the dummy (distance group: the Distant alternative): no enemy Nearby (${KEYWORD_RADII_METERS.nearby} m) or in Proximity (${KEYWORD_RADII_METERS.proximity} m); the dummy is the only enemy`) : off("the dummy is Nearby (the player stands close); the Distant alternative is compared automatically");
    // Distant ("6m away", TLIDB keyword tooltip): the other alternative of the Distance group.
    case "distant": return state.nearTarget === false ? on(`${DISTANT_STANDING_METERS} m from the dummy (distance group: Distant, TLIDB "6m away")${params.upTo ? "; the full 'up to' value assumed (provisional)" : ""}`, { provisional: Boolean(params.upTo) }) : off(`close to the dummy (distance group): not Distant (${DISTANT_STANDING_METERS} m away); the Distant alternative is compared automatically`);
    case "channeling": return state.channeledMain ? on("channeling the main skill on the dummy (a channeled main skill is held)") : off("no channeled main skill");
    case "comboPointsAtLeast": return CONSUMED_COMBO_POINTS >= params.points ? on(`the Finisher consumes ${CONSUMED_COMBO_POINTS} Combo Points ≥ ${params.points} (${COMBO_POINTS_PER_STARTER} per Starter read: provisional, run S-COMBO)`, { provisional: true }) : off(`the Finisher consumes ${CONSUMED_COMBO_POINTS} Combo Points (two Starters, ${COMBO_POINTS_PER_STARTER} each read: provisional, run S-COMBO), fewer than ${params.points}`, { provisional: true });
    case "center": return on("one dummy, hit at the center of the area (best case; provisional)", { provisional: true });
    case "enemyLifeHigh": return on("the training dummy never loses its Life share (it never dies): full value (best case; provisional)", { provisional: true });
    // Q-H9 (hero trait audit B7, recommended reading): the dummy never loses Life, except where a line deems it at Low Life: Thea –
    // Incarnation of the Gods' Incarnation deems it for 6.5 s of every 10 s from the first hit (src/thea-traits.js), the share the
    // "against Low Life enemies" bodies take (provisional).
    case "enemyLowLife": {
      const deem = state.thea?.incarnation?.deem;
      if (deem?.share > 0) return on(`the dummy is deemed at Low Life ${deem.seconds} s of every ${deem.cooldownSeconds} s (Incarnation; Q-H9): ${Math.round(deem.share * 10000) / 100}% of the time (provisional)`, { factor: deem.share, provisional: true });
      return off("the training dummy never loses Life (Q-H9: 0% lost; only a line that deems it at Low Life applies these)", { provisional: true });
    }
    case "enemyState": {
      const name = ailmentStateNames[params.word] || (params.word === "Shocked" ? "Shock" : params.word);
      const present = name === "Frozen" ? ailments.has("Frozen") || ailments.has("Freeze") : ailments.has(name);
      return present ? on(`the dummy is ${params.word} (enemy-ailment model)`) : off(`the build does not make the dummy ${params.word}`);
    }
    case "dualWieldTypes": {
      const types = state.weapon?.dualWielding ? state.weapon.uniqueTypes : 0;
      return types > 0 ? on(`dual wielding ${types} unique weapon type${types === 1 ? "" : "s"}`, { factor: types }) : off("not dual wielding");
    }
    case "shield": return state.weapon?.shield ? on("holding a Shield") : off("no Shield equipped");
    case "dualWielding": return state.weapon?.dualWielding ? on("dual wielding") : off("not dual wielding");
    case "hastenMoving": {
      if (!(state.hasHasten || state.buffs?.hasHasten)) return off("no Hasten source");
      return state.moving !== false ? on(`Hasten and moving (movement group): ${params.stacks} stacks, fully stacked (user rule)`) : off("standing still (movement group)");
    }
    case "lowLife": return state.life === "low" ? on(`at Low Life (${state.lifeReason})`) : off(`not at Low Life (${state.lifeReason})`);
    case "notLowLife": return state.life !== "low" ? on(`not at Low Life (${state.lifeReason})`) : off(`at Low Life (${state.lifeReason})`);
    case "fullMana": return atFullMana(state) ? on(`at Full Mana (${state.manaReason})`) : off(notFullManaReason(state));
    case "lowMana": return state.mana === "low" ? on(`at Low Mana (${state.manaReason})`) : off(`not at Low Mana (${state.manaReason})`);
    case "energyShieldNotLow": return on("Energy Shield not low: the dummy does not attack (best case; provisional)", { provisional: true });
    case "critRecently": {
      if (!state.canCrit) return off("no modeled hit can crit");
      return on(`a Critical Strike within the window: the build crits (${params.seconds ? `${params.seconds} s buff` : "\"recently\""} assumed held; the window length is not sourced: provisional, Q6)${params.unread ? `; not read: "${params.unread}"` : ""}`, { provisional: true });
    }
    case "critOrReapRecently": return state.canCrit || state.hasReaping ? on(`a Critical Strike${state.hasReaping ? " or a Reap" : ""} within the last 8 s (best case; provisional)`, { provisional: true }) : off("no crit or Reap source");
    // Hit / took damage recently: the training dummy never attacks, but the user decided (2026-10-12) that being hit and
    // blocking recently are best-case assumptions (common while mapping and against bosses). They follow the Blocked
    // recently condition and are listed in the recount assumptions.
    case "hitByEnemy": return state.hitRecently !== false ? on("hit by an enemy recently: best-case assumption (user decision 2026-10-12; the training dummy itself never attacks; condition 'Hit or blocked recently')", { provisional: true }) : off("hit recently is off (condition 'Hit or blocked recently')");
    // Recently moved (user rule 2026-10-14): you reposition between attacks, so it holds even when the Movement group chose
    // standing still; a best-case assumption switched by the movedRecently condition (src/planner.js bestCaseAssumptions).
    case "movedRecently": return state.movedRecently !== false ? on(`moved recently${params.meters ? ` (more than ${params.meters} m)` : ""}: best case, you reposition between attacks (user rule 2026-10-14); held even while standing still`) : off("moved recently is off (condition 'Moved recently')");
    // After using a Mobility Skill (user rule 2026-10-14: mobility skill use is constant when the build has one): active when a
    // Mobility skill is installed and enabled on the skill board, switched by the mobilitySkillUsed condition.
    case "mobility": return !state.hasMobilitySkill ? off("no Mobility Skill on the skill board") : state.mobilitySkillUsed !== false ? on(`a Mobility Skill used recently: best case, ${state.mobilitySkillNames?.length ? state.mobilitySkillNames.join(", ") : "the build's Mobility Skill"} is used constantly (user rule 2026-10-14)`) : off("Mobility Skill used recently is off (condition 'Mobility Skill used recently')");
    case "regained": {
      const regain = state.regain;
      if (!regain) return off("Regain events not resolved (no combat state)");
      if (!regain.active) return off(regain.reason);
      if (!params.stacks) return on(`Regained in the last ${params.seconds} s: ${regain.reason} (best-case assumption 'Regain events')`, { provisional: true });
      const count = regainsIn(regain, params.seconds);
      const stacks = Math.min(params.stacks, count);
      return stacks > 0 ? on(`${count} Regains in ${params.seconds} s (${regain.ratePerSecond}/s), up to ${params.stacks}: ${stacks} stacks; ${regain.reason} (best-case assumption 'Regain events')`, { factor: stacks, provisional: true }) : off(`no Regain within ${params.seconds} s`);
    }
    case "channelMax": return state.channeledMain && state.prebuiltSelfBuffs !== false ? on(`at max channeled stacks: the channel is held full (own buffs pre-built), ${params.seconds} s buff refreshed (uptime 1; provisional)`, { provisional: true }) : off(state.channeledMain ? "channel starts cold (own buffs not pre-built)" : "no channeled main skill");
    case "nextMainSkill": {
      const uses = state.mainUsesPerSecond;
      if (!(uses > 0)) return off("no active main skill");
      const share = Math.min(1, 1 / (uses * params.interval));
      return on(`the next Main Skill every ${params.interval} s: ${round(share * 100)}% of uses at ${round(uses)} uses/s (estimate from the early cast/attack rate; share = min(1, use interval ÷ ${params.interval} s): provisional, Q11)`, { factor: share, provisional: true });
    }
    case "consumeAgilityPerCast":
    case "consumeBlurPerCast": {
      const item = key === "consumeBlurPerCast" ? state.consumption?.blur : state.consumption?.agility;
      if (!item) return off("consumption not resolved (no planner state)");
      const pending = state.consumption.measured ? "" : "; the cast rate is the early estimate until the hit pass measures it";
      if (item.active === null) return { active: false, unmodeled: true, conditionText: `Not modeled: ${item.reason}` };
      if (!item.active) return off(item.reason);
      return on(`${item.reason}; the cast that consumes it deals the bonus, so ×${round(item.share)} of the value (share = min(1, gain rate ÷ cast rate): Q5, user-confirmed 2026-10-18)${pending}`, { factor: item.share });
    }
    case "consumeAllAgility": {
      const item = state.consumption?.waitingAttack;
      if (!item) return off("consumption not resolved (no planner state)");
      if (item.active === null) return { active: false, unmodeled: true, conditionText: `Not modeled: ${item.reason}` };
      if (!item.active) return off(item.reason);
      return on(item.reason, { factor: item.stacksConsumed });
    }
    case "castChance": return on(`expected value: ${params.chance}% × +${params.value}% per cast, each line its own additional layer (independent rolls: provisional, Q12)`, { provisional: true });
    // Hidden Mastery: its "Gains Attack Aggression when casting an Attack Skill" clause sets the buff (src/combat-states.js).
    case "attackAggression": return (state.buffs ? state.buffs.hasAttackAggression : state.castsAttack) ? on("Attack Aggression held (gained by casting an Attack Skill)") : off("no Attack Aggression (no active Attack skill)");
    case "hitsWithType": {
      const want = /^Elemental$/i.test(params.type) ? ["Fire", "Cold", "Lightning"] : [params.type];
      const hit = want.filter((type) => state.hitTypes?.has(type));
      return hit.length ? on(`the build's modeled skill hits deal ${hit.join("/")} Damage: ${params.stacks} stacks held (best case; provisional)`, { provisional: true }) : off(`no modeled skill hit deals ${params.type} Damage`);
    }
    case "projectilesGenerated": {
      const kind = params.spell ? "Spell Projectile" : "Projectile";
      const skills = (state.projectileSkills || []).filter((skill) => !params.spell || skill.spell);
      return skills.length ? on(`${skills.map((skill) => skill.name).join(", ")} generate${skills.length === 1 ? "s" : ""} ${kind}s on every use: ${params.stacks} stacks held (best case; the "recently" window is not sourced; provisional)`, { provisional: true }) : off(`no modeled skill hit generates ${kind}s`);
    }
    case "dealtType": return (state.dealtDamageTypes || state.dealtTypes)?.has(params.type) ? on(`the build deals ${params.type} Damage`) : off(`the build deals no ${params.type} Damage`);
    case "statCompare": {
      const a = state.stats?.[params.stat] ?? 0, b = state.stats?.[params.other] ?? 0;
      return a >= b ? on(`${params.stat} ${round(a)} ≥ ${params.other} ${round(b)} (stat sheet totals)`) : off(`${params.stat} ${round(a)} < ${params.other} ${round(b)} (stat sheet totals)`);
    }
    case "perEquippedSkill": {
      const names = state.equippedSkillsByTag?.[params.type] || [];
      const count = names.length;
      return count > 0 ? on(`${count} active ${params.type} Skill${count === 1 ? "" : "s"} equipped (${names.join(", ")}; game node 208 counts equipped skills with the tag)${params.multiplies ? ", one factor per skill" : ""}`, { factor: params.multiplies ? null : count, power: params.multiplies ? count : null }) : off(`no active ${params.type} Skill equipped`);
    }
    case "exitStandStillGain":
      return state.moving !== false ? on(`moving (movement group): leaving Stand Still keeps the buff at ${params.stacks} stacks (${params.seconds} s each; user rule: movement buffs fully stacked; standing still / moving exclusive group, user-confirmed 2026-10-18)`) : off("standing still (movement group): Stand Still is never left, so no stacks");
    case "exitStandStillStacks": {
      const stacks = state.exitStandStillMaxStacks ?? 0;
      if (state.moving === false) return off("standing still (movement group): no stacks from leaving Stand Still");
      if (!(stacks > 0)) return off("no line grants the stacks gained when exiting Stand Still");
      const speedText = `+${params.attackSpeed}% Attack Speed once while the buff is up, not per stack (user-supplied 2026-10-19, Google AI Mode answer, not tested in game)`;
      if (state.nearTarget === false) return on(`moving (movement group): the buff is up, so ${speedText}; the Distant alternative stands ${DISTANT_STANDING_METERS} m away, so the damage part (range 4 m in the game record) is off`, { factor: 0, bodyFactors: [0, 1], provisional: true });
      return on(`moving (movement group) and within 4 m of the dummy: ${stacks} stacks held (best case; Movement group, user-confirmed 2026-10-18), one additional term; ${speedText}`, { factor: stacks, bodyFactors: [stacks, 1], provisional: true });
    }
    // Heat Up's 4 s buff: the Sentry skill recast within every 4 s (best case: the player has the time; the model's own recast on
    // expiry every 8 s would hold it half the time; "recently" = 4 s, a recast every 4 s: user-supplied 2026-10-19, Google AI Mode answer, not tested in game).
    case "sentryCastRecently": return (state.sentrySkills || []).length ? on(`a Sentry Skill (${state.sentrySkills.join(", ")}) recast within every 4 s (best case; provisional)`, { provisional: true }) : off("no modeled Sentry Skill on the skill board");
    case "darkGateRecently": {
      const gate = state.darkGate;
      if (!gate?.active) return off("no Dark Gate on the skill board");
      const why = `Dark Gate cast whenever ready (best case): a 4 s buff per ${round(gate.cooldownSeconds)} s cooldown (${gate.baseCooldownSeconds} s${gate.sources.length ? ` ÷ ${round(gate.baseCooldownSeconds / gate.cooldownSeconds)} from ${gate.sources.map((item) => item.source).join(", ")}` : ""}) → uptime ${round(gate.uptime * 100)}% (provisional)`;
      return on(why, { factor: gate.uptime < 1 ? gate.uptime : null, provisional: true });
    }
    case "minionAuraCount": return state.auraCount > 0 ? on(`${state.auraCount} active Aura type${state.auraCount === 1 ? "" : "s"} affecting the Minions (they stand inside the player's Auras: best case, provisional)`, { factor: state.auraCount, provisional: true }) : off("no active Aura");
    case "auraCount": return state.auraCount > 0 ? on(`${state.auraCount} active Aura type${state.auraCount === 1 ? "" : "s"}${condition.wording && /your Minions/i.test(condition.wording) ? " (own Auras; your Minions stand inside them: best case, provisional)" : ""}`, { factor: state.auraCount, provisional: Boolean(condition.wording && /your Minions/i.test(condition.wording)) }) : off("no active Aura");
    case "perStat": {
      const total = state.stats?.[params.stat] ?? 0;
      const steps = Math.floor(Math.max(0, total) / params.every);
      return steps > 0 ? on(`${round(total)} ${params.stat} ÷ ${params.every} = ${steps} (rounded down: provisional)`, { factor: steps, provisional: true }) : off(`${round(total)} ${params.stat}: below ${params.every}`);
    }
    case "perAllStats": {
      const [str, dex, int] = ["strength", "dexterity", "intelligence"].map((stat) => Math.max(0, state.stats?.[stat] ?? 0));
      const total = str + dex + int;
      const steps = Math.floor(total / params.every + 1e-9);
      const working = `${round(total)} stats (Str ${round(str)} + Dex ${round(dex)} + Int ${round(int)}) ÷ ${params.every} = ${steps}`;
      return steps > 0 ? on(`${working} → +${round(steps * params.per)}% ${params.template} (stats = Strength + Dexterity + Intelligence, rounded down: provisional)`, { factor: steps, provisional: true }) : off(`${working}: below ${params.every}`);
    }
    case "highestStat": {
      const best = Math.max(0, ...["strength", "dexterity", "intelligence"].map((stat) => state.stats?.[stat] ?? 0));
      const steps = Math.floor(best / params.every);
      return steps > 0 ? on(`highest of Strength / Dexterity / Intelligence ${round(best)} ÷ ${params.every} = ${steps} (rounded down: provisional)`, { factor: steps, provisional: true }) : off(`highest stat ${round(best)}: below ${params.every}`);
    }
    case "lowestStat": {
      const low = Math.max(0, Math.min(...["strength", "dexterity", "intelligence"].map((stat) => state.stats?.[stat] ?? 0)));
      const steps = Math.floor(low / params.every + 1e-9);
      return steps > 0 ? on(`lowest of Strength / Dexterity / Intelligence ${round(low)} ÷ ${params.every} = ${steps} (rounded down)`, { factor: steps }) : off(`lowest stat ${round(low)}: below ${params.every}`);
    }
    case "statAtLeast": {
      const total = state.stats?.[params.stat] ?? 0;
      return total >= params.value ? on(`${round(total)} ${params.stat} ≥ ${params.value} (stat sheet total)`) : off(`${round(total)} ${params.stat} < ${params.value} (stat sheet total)`);
    }
    case "perResource": {
      const total = state.stats?.[params.stat] ?? 0;
      const steps = Math.min(Math.floor(Math.max(0, total) / params.every), params.cap / params.per);
      return steps > 0 ? on(`${round(total)} ${params.stat === "maxMana" ? "Max Mana" : "Max Life"} ÷ ${params.every} = ${round(steps)} steps (cap +${params.cap}%; rounded down: provisional)`, { factor: steps, provisional: true }) : off(`${round(total)} ${params.stat === "maxMana" ? "Max Mana" : "Max Life"}: below ${params.every}`);
    }
    case "perBlockChance": {
      const chance = Math.max(state.blockChance?.attack || 0, state.blockChance?.spell || 0);
      const steps = Math.floor(chance / params.every);
      const appliedTotal = Math.min(params.cap, steps * params.per);
      return appliedTotal > 0 ? on(`${round(chance)}% block chance (the higher of Attack and Spell: provisional) → +${appliedTotal}% (${Number.isFinite(params.cap) ? `cap +${params.cap}%` : "no cap stated"})`, { factor: appliedTotal / params.per, provisional: true }) : off(`${round(chance)}% block chance: below ${params.every}%`);
    }
    case "perAfflictionEffect": {
      const total = Math.max(0, state.afflictionEffectPercent ?? 0);
      const steps = Math.min(params.cap / params.per, Math.floor(total / params.every + 1e-9));
      return steps > 0 ? on(`${round(total)}% Affliction Effect ÷ ${params.every} = ${Math.floor(total / params.every + 1e-9)} → +${round(steps * params.per)}% (cap +${params.cap}%)`, { factor: steps }) : off(`${round(total)}% Affliction Effect: below ${params.every}%`);
    }
    case "perSealedManaCompensation": {
      const total = state.sealedManaCompensationPercent ?? 0;
      const steps = total / params.every;
      return steps !== 0 ? on(`${round(total)}% Sealed Mana Compensation ÷ ${params.every} = ${round(steps)} (proportional: game affix 898342, panel-confirmed 2026-10-13)`, { factor: steps }) : off(`no Sealed Mana Compensation`);
    }
    case "perLifeSealed": {
      const sealed = Math.max(0, state.lifeSealedPercent ?? 0);
      const steps = Math.floor(sealed / params.every + 1e-9);
      return steps > 0 ? on(`${round(sealed)}% Life sealed ÷ ${params.every} = ${steps} (rounded down: provisional; sealing by a source the planner does not read is not counted)`, { factor: steps, provisional: true }) : off(`${round(sealed)}% Life sealed: below ${params.every}%`);
    }
    case "perLifeLost": {
      const lost = state.life === "low" ? state.lifeLostPercent ?? 0 : 0;
      const why = state.lifeLostReason || state.lifeReason;
      // "for every N% Missing Life" (hero trait audit B2): whole steps of N%, rounded down (provisional); N = 1 keeps the
      // "for every 1% of Life lost" reading (the lost share itself).
      const every = params.every > 1 ? params.every : 1;
      const steps = every > 1 ? Math.floor(lost / every + 1e-9) : lost;
      const realm = params.outsideDivineRealm ? "; outside the Divine Realm (the \"Divine Realm position\" choice; provisional)" : "";
      // Thea – Incarnation of the Gods (hero trait audit B7): inside the Divine Realm the "when outside" lines stop.
      if (params.outsideDivineRealm && state.thea?.incarnation?.realm?.inside) return off("you stand inside the Divine Realm (the \"Divine Realm position\" choice)");
      if (!(lost > 0)) return off(`no Life lost (${why})`);
      return steps > 0 ? on(`${round(lost)}% Life lost (${why}; provisional)${every > 1 ? ` ÷ ${every}% = ${steps} steps (rounded down: provisional)` : ""}${realm}`, { factor: steps, provisional: true }) : off(`${round(lost)}% Life lost: below ${every}%`);
    }
    // ---- hero trait audit batch B2 (2026-10-19) ----
    case "perKnockbackDistance": {
      const total = Math.max(0, state.knockbackDistancePercent ?? 0);
      const stacks = Math.min(params.stacks, Math.floor(total / params.every + 1e-9));
      const lines = (state.knockbackDistanceSources || []).map((item) => `${item.text} (${item.source})`).join(", ");
      return stacks > 0 ? on(`${round(total)}% Knockback distance (${lines}; the build-wide "+X% Knockback distance" lines, provisional) ÷ ${params.every}% = ${stacks} stacks (up to ${params.stacks}); the Projectile Max Deviation Angle part changes nothing on one dummy`, { factor: stacks, provisional: true }) : off(`${round(total)}% Knockback distance: no "+X% Knockback distance" line in the build`);
    }
    case "perLegendaryMediumTalent": {
      const count = Math.max(0, state.legendaryMediumTalentsAllocated ?? 0);
      const steps = Math.min(count, params.cap / params.per);
      return count > 0 ? on(`${count} Legendary Medium Talent${count === 1 ? "" : "s"} allocated on the talent panels × ${params.per}% = +${round(steps * params.per)}% (cap +${params.cap}%; slate Legendary Medium Talents are not counted: provisional)`, { factor: steps, provisional: true }) : off("no Legendary Medium Talent allocated on the talent panels");
    }
    case "dualWieldSameType": {
      const weapon = state.weapon || {};
      if (!weapon.dualWielding) return off("not dual wielding");
      return weapon.uniqueTypes === 1 ? on(`dual wielding two ${weapon.types?.[0] || "weapons"} (the same type)`) : off(`dual wielding different types (${(weapon.types || []).join(", ")})`);
    }
    case "dualWieldDifferentTypes": {
      const weapon = state.weapon || {};
      if (!weapon.dualWielding) return off("not dual wielding");
      return weapon.uniqueTypes > 1 ? on(`dual wielding different types (${(weapon.types || []).join(", ")})`) : off(`dual wielding two ${weapon.types?.[0] || "weapons"} (the same type)`);
    }
    case "fixedFireResistanceFrostbitten": return ailments.has("Frostbite") ? on(`the dummy is Frostbitten (enemy-ailment model): its Fire Resistance is fixed at ${params.value}% (no reduction or Scorch changes it; penetration still applies: provisional)`, { provisional: true }) : off("the build does not make the dummy Frostbitten");
    case "worldWithin": {
      const summons = (state.spiritMagusSummons || []).map((summon) => String(summon.name).replace(/^Summon /, ""));
      if (!summons.length) return off("no Spirit Magus summon on the skill board");
      const chances = worldWithinChances(params, state.worldWithinInputs || {});
      const describe = (name) => `${name} +${chances[name].chance}% (${chances[name].stat === "Armor" ? `${chances[name].value} Armor ÷ ${params.armorEvery}` : `${chances[name].value}% ${chances[name].stat} Resistance`}, up to +${params.cap}%)`;
      const parts = summons.filter((name) => chances[name]).map(describe);
      return summons.some((name) => chances[name]?.chance > 0) ? on(`Enhanced-skill chance per Magus: ${parts.join(", ")} (effective resistance; Armor without Aura buffs: provisional)`, { provisional: true }) : off(`no resistance or Armor for the summoned Magi: ${parts.join(", ") || summons.join(", ")}`);
    }
    case "youAndMinions": {
      // A typed body reaches the build only where it deals that type (or has modeled Minions, which read the line themselves).
      const typed = String(condition.wording || "").match(/\b(Physical|Fire|Cold|Lightning|Erosion|Elemental) Damage for you and your Minions$/i)?.[1];
      const want = !typed ? null : /^Elemental$/i.test(typed) ? ["Fire", "Cold", "Lightning"] : [typed[0].toUpperCase() + typed.slice(1).toLowerCase()];
      const dealt = state.dealtDamageTypes || state.dealtTypes || new Set();
      const reaches = !want || want.some((type) => dealt.has?.(type) || state.hitTypes?.has?.(type)) || state.minionsCrit;
      return reaches ? on(`applies to you (game record: the same attribute without the Minion tag)${state.minionsCrit ? " and to your Minions (the Minion model reads the line)" : ""}`) : off(`the build deals no ${typed} Damage and has no modeled Minion`);
    }
    case "blessingActive": { const stacks = state.blessingStacks?.[params.name] || 0; return stacks > 0 ? on(`${params.name} Blessing held at ${stacks} stacks (Blessing model; own buffs pre-built)`) : off(`no ${params.name} Blessing stacks (no gain source holds on the dummy)`); }
    case "blessingAtMax": { const stacks = state.blessingStacks?.[params.name] || 0; return stacks > 0 ? on(`${params.name} Blessing held at its max (${stacks} stacks; Blessing model, own buffs pre-built)`) : off(`no ${params.name} Blessing stacks (no gain source holds)`); }
    case "blessingAtLeast": { const stacks = state.blessingStacks?.[params.name] || 0; return stacks >= params.stacks ? on(`${stacks} ${params.name} Blessing stacks ≥ ${params.stacks} (Blessing model)`) : off(`${stacks} ${params.name} Blessing stacks < ${params.stacks}`); }
    case "anyBlessingAtLeast": { const best = Math.max(0, ...Object.values(state.blessingStacks || {})); return best >= params.stacks ? on(`a Blessing held at ${best} stacks ≥ ${params.stacks} (Blessing model)`) : off(`no Blessing reaches ${params.stacks} stacks (highest ${best})`); }
    case "usedSkillTag": return (state.activeDamageTags || new Set()).has(params.tag) ? on(`an active damage skill has the ${params.tag} tag (used on the dummy)`) : off(`no active damage skill has the ${params.tag} tag`);
    case "unarmed": return state.weapon?.unarmed ? on("no weapon held (Unarmed)") : off("a weapon is held");
    case "offHandEmpty": return state.weapon?.offHandEmpty ? on("the off-hand slot is empty") : off("the off-hand slot holds an item");
    case "wieldingWandOrStaff": return (state.weapon?.types || []).some((type) => /Wand|Tin Staff/i.test(type)) ? on("a Wand or Tin Staff is held") : off("no Wand or Tin Staff held");
    case "notWieldingWandOrStaff": return on("applies with any weapon (user-supplied 2026-10-19: the game record has no weapon check; only Mind Blade's +25% additional Cold Damage needs a Wand or Tin Staff)");
    case "fullLife": return atFullLife(state) ? on("at Full Life: the dummy never attacks (best case)") : off(notFullLifeReason(state));
    case "notFullLife": return atFullLife(state) ? off("at Full Life: the dummy never attacks") : on(notFullLifeReason(state));
    case "notFullMana": return atFullMana(state) ? off(`at Full Mana (${state.manaReason})`) : on(notFullManaReason(state));
    case "blessingPerStack": {
      const stacks = state.blessingStacks?.[params.name] || 0;
      const counted = params.cap ? Math.min(stacks, params.cap) : stacks;
      return stacks > 0 ? on(`${stacks} ${params.name} Blessing stacks (Blessing model)${params.cap ? `, counted up to ${params.cap}: ${counted}` : ""}`, { factor: counted }) : off(`no ${params.name} Blessing stacks`);
    }
    // Providential Grace (provisional reading): the named Blessing's max stacks against every other Blessing's held stacks.
    case "blessingMaxNotLower": {
      const max = state.blessingMaxStacks?.[params.name] ?? 0;
      const others = Object.entries(state.blessingStacks || {}).filter(([name]) => name !== params.name);
      const higher = others.filter(([, stacks]) => stacks > max);
      const list = (items) => items.map(([name, stacks]) => `${name} ${stacks}`).join(", ");
      return !higher.length ? on(`max ${params.name} Blessing stacks ${max} ≥ the other Blessings' held stacks (${list(others)}; "stacks of other Blessings" read as their held stacks: provisional)`, { provisional: true }) : off(`max ${params.name} Blessing stacks ${max} < ${list(higher)}`, { provisional: true });
    }
    case "enemyElementalAilment": {
      const held = ELEMENTAL_AILMENTS.filter((name) => ailments.has(name));
      return held.length ? on(`the dummy has ${held.join(", ")} (Elemental Ailments: Ignite, Frostbite, Freeze, Numbed; game keyword 101)`) : off("the build inflicts no Elemental Ailment (Ignite, Frostbite, Freeze, Numbed; game keyword 101)");
    }
    case "elementalAilmentTypes": {
      const held = [...new Set(ELEMENTAL_AILMENTS.filter((name) => ailments.has(name)).map((name) => name === "Frozen" ? "Freeze" : name))];
      return held.length ? on(`${held.length} Elemental Ailment type${held.length === 1 ? "" : "s"} on the dummy (${held.join(", ")}; game keyword 101)`, { factor: held.length }) : off("no Elemental Ailment on the dummy");
    }
    case "nearbyEnemiesAtLeast": {
      if (params.count > 1) return off(`needs ${params.count} enemies Nearby: the training dummy is one enemy`, { notOnDummy: true });
      return state.nearTarget !== false ? on(`the dummy is Nearby (within ${KEYWORD_RADII_METERS.nearby} m, TLIDB; distance group: close, best case)`) : off(`${DISTANT_STANDING_METERS} m from the dummy (distance group: Distant): no enemy Nearby`);
    }
    case "auraCountAtLeast": return (state.auraCount || 0) >= params.count ? on(`${state.auraCount} active Aura type${state.auraCount === 1 ? "" : "s"} ≥ ${params.count} (own Auras only${condition.wording && /your Minions/i.test(condition.wording) ? "; your Minions stand inside them: best case" : ""}: provisional)`, { provisional: true }) : off(`${state.auraCount || 0} active Aura types < ${params.count}`);
    case "auraCountExactly": return (state.auraCount || 0) === params.count ? on(`exactly ${params.count} active Aura type${params.count === 1 ? "" : "s"} (own Auras only: provisional)`, { provisional: true }) : off(`${state.auraCount || 0} active Aura types, not ${params.count}`);
    case "maxSpellBurstPerStack": {
      const stacks = Math.max(0, state.maxSpellBurst || 0);
      const counted = Math.min(stacks, params.cap / params.per);
      return counted > 0 ? on(`Max Spell Burst ${stacks} (the "+N Max Spell Burst" lines the Spell Burst model reads; no base value counted: provisional), capped at +${params.cap}%`, { factor: counted, provisional: true }) : off("Max Spell Burst 0 (no \"+N Max Spell Burst\" line)");
    }
    case "buffActive": {
      const held = { "Fervor": (state.buffs?.fervorRating || 0) > 0, "Attack Aggression": state.buffs?.hasAttackAggression, "Spell Aggression": state.buffs?.hasSpellAggression, "Hasten": state.buffs?.hasHasten }[params.buff];
      return held ? on(`${params.buff} held (src/combat-states.js)`) : off(`no ${params.buff} source`);
    }
    case "unmodeled": return off(params.reason || "not modeled", { unmodeled: true });
    default: return { active: null, appliedValue: 0, conditionText: "unknown condition" };
  }
}

/** The dummy profile flags a target word stands for (used by the support resolver's Elite / Boss words). */
export const dummyIs = (flag) => dummyTarget[flag] === true;
