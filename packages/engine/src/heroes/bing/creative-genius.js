// Bing – Creative Genius: Whimsy Essence, Whimsy Explosion, Whimsy Signal and Whimsy (hero trait audit B12, first part,
// 2026-10-29). Pure: packages/engine/src/heroes/hero-trait-modules.js reads the trait lines (origin "trait") and the revived
// Genius Idea Generator line (packages/engine/src/heroes/hero-exclusive-revivals.js MODULE_LINES), calls bingLineRead and
// derives the sustained lines: the dummy's Whimsy Signal ("additional Spell Damage taken", Spell hits only, like Frail) and
// your Whimsy ("additional Spell Damage").
//
// Sourced (TLIDB keyword tooltips, Torchlight_Hyperlink_hover on tlidb.com/en/Creative_Genius, fetched 2026-10-29):
// - Whimsy Explosion: "Fires a projectile that creates an energy explosion on hit, consuming 100 Whimsy Essence while
//   restoring 25 Ingenuity Essence" (no damage figure: its own damage is not published, so it is not a damage source).
// - Whimsy Signal: "+20% additional Spell Damage taken for 5s".
// - Whimsy: "+5% additional Spell Damage (multiplies) for 10s".
// - Ingenuity Overload: "Triggers your Main Skill once immediately (this skill must be able to activate Spell Burst). +200%
//   additional Max Spell Burst for the skill this time and immediately charges it to the max. Consumes 100 Ingenuity Essence".
// - Contingency Inspiration Machine: "Your Main Skill is automatically cast, and the Base Cast Frequency is equal to 100% of
//   Cast Speed. Unable to move for 5s".
//
// Provisional readings (src/app/stats/open-questions.js "bing-whimsy"):
// - Whimsy Explosions: one each time Whimsy Essence reaches 100 (20 per second × (1 + Whimsy Essence Recovery Speed)) while a
//   skill deals Spell Damage, plus Flash of Brilliance's procs: one per interval T after a cast rolls its chance p, so
//   1 ÷ (T + 1 ÷ (p × Main Skill uses per second)); a triggered use of the Main Skill counts as casting it. Inspiration
//   Overflow's Essence on Spell Burst is not read (a lower bound on the cadence).
// - Whimsy Signal on the dummy: uptime min(1, 5 s × explosions per second); its value is the base 20% (Trouble Maker: the
//   value it names) × (1 + Σ "Whimsy Signal Effect").
// - Whimsy (Mind Domain): you stand in the energy field (best-case switch), so the stacks reach the max and hold while a new
//   field comes within Whimsy's 10 s: uptime min(1, 10 s × explosions per second). Each stack is 5% × (1 + Σ "Whimsy Effect")
//   and the stacks multiply: (1 + w)^N − 1.
// - Ingenuity Overload and the traits built on it (the extra Main Skill cast, its Max Spell Burst, the Contingency Machines,
//   the Movement Speed and damage taken while casting it) are not modeled yet: Not modeled with that reason.

import { cleanGameText } from "../../text/percentage-text.js";

export const BING_CREATIVE = "bing-creative-genius";
export const ENERGY_FIELD_SWITCH = "bingInEnergyField";
export const ESSENCE_PER_SECOND = 20;
export const ESSENCE_PER_EXPLOSION = 100;
export const SIGNAL_BASE_PERCENT = 20;
export const SIGNAL_SECONDS = 5;
export const WHIMSY_STACK_PERCENT = 5;
export const WHIMSY_SECONDS = 10;

const N = "([+-]?\\d+(?:\\.\\d+)?)";
export const cleanBing = (text) =>
  cleanGameText(String(text ?? ""))
    .replace(/(\d) %/g, "$1%")
    .replace(/ ,/g, ",")
    .replace(/ \./g, ".")
    .trim();

const OVERLOAD_REASON =
  "Ingenuity Overload (it triggers the Main Skill once with +200% additional Max Spell Burst, charged to the max) is not modeled yet (hero trait audit B12)";

export const BING_PATTERNS = Object.freeze({
  // Creative Genius (base trait).
  essence: /^Gains 2 Inspiration Machines that can be powered by Whimsy Essence and Ingenuity Essence respectively\./i,
  signal:
    /^When Whimsy Essence reaches 100, dealing Spell Damage to an enemy causes Inspiration Machines to use a Whimsy Explosion, inflicting Whimsy Signal on affected enemies$/i,
  overloadClick:
    /^When Ingenuity Essence reaches 100, clicking the Trait Skill causes Inspiration Machines to use Ingenuity Overload$/i,
  // Inspiration Overflow (its "additional Hit Damage for skills cast by Spell Burst" line is the generic Spell Burst reader's).
  overflowEssence: /^Instantly restores \d+(?:\.\d+)? Whimsy Essence when activating Spell Burst/i,
  ingenuityStart: /^Instantly restores \d+(?:\.\d+)? Ingenuity Essence after entering a stage or reviving$/i,
  // Mind Domain.
  mindDomain: new RegExp(
    `^Whimsy Explosion spawns an energy field\\. Gains 1 stack of Whimsy for every ${N} ?s staying in the energy field\\. Stacks up to (\\d+) time\\(s\\)$`,
    "i",
  ),
  // Trouble Maker.
  troubleSelf: /^Loses \d+(?:\.\d+)?% Max Life and Energy Shield when Whimsy Explosion hits yourself$/i,
  troubleSignal: new RegExp(`^Effect of Whimsy Signal enhanced to: \\+${N}% additional Spell Damage taken$`, "i"),
  // Brainstorm.
  brainstormExecute:
    /^After a [\d.]+ ?s delay, Whimsy Explosion creates an additional Energy Explosion that eliminates enemies/i,
  brainstormEssence: /Whimsy Essence for each enemy affected by Whimsy Signal defeated$/i,
  // Flash of Brilliance.
  flash: new RegExp(
    `^Casting a Main Skill has a ${N}% chance to trigger Whimsy Explosion without consuming Whimsy Essence\\. Interval: ${N} ?s$`,
    "i",
  ),
  // Auto-Ingenuity Program.
  autoOverload: /^When Ingenuity Essence reaches 100, triggers Ingenuity Overload$/i,
  recovery: new RegExp(`^${N}% Whimsy Essence Recovery Speed$`, "i"),
  // Ingenuity Overload family.
  overload: /Ingenuity Overload|Ingenuity Essence restoration per Max Spell Burst|Contingency Inspiration Machines/i,
  // Genius Idea Generator (revived, Lunar Phase): "+2 to Whimsy Explosion Projectile Quantity, +100% Whimsy Effect, +40% Whimsy
  // Signal Effect".
  genius: /^\+\d+ to Whimsy Explosion Projectile Quantity, \+[\d.]+% Whimsy Effect, \+[\d.]+% Whimsy Signal Effect$/i,
});
const TRAIT_KEYS = [
  "essence",
  "signal",
  "overloadClick",
  "overflowEssence",
  "ingenuityStart",
  "mindDomain",
  "troubleSelf",
  "troubleSignal",
  "brainstormExecute",
  "brainstormEssence",
  "flash",
  "autoOverload",
  "recovery",
  "overload",
];
const REVIVED_KEYS = ["genius"];

/** The clause key of a Creative Genius line (trait or revived), or null. `revived`: match only the revived keys. */
export function bingClauseKey(text, { revived = false } = {}) {
  const clean = cleanBing(text);
  return (revived ? REVIVED_KEYS : TRAIT_KEYS).find((key) => BING_PATTERNS[key].test(clean)) || null;
}
/** Whether a revived (memory) line of Creative Genius is read here (Genius Idea Generator's first line). */
export const bingRevivedLine = (heroId, text) =>
  heroId === BING_CREATIVE && Boolean(bingClauseKey(text, { revived: true }));

const num = (text) => Number(String(text).replace("−", "-"));
const round = (value) => Math.round(value * 10000) / 10000;
// "+X% <name>" clauses from every line (a comma-joined line splits into its clauses).
const sumClauses = (modifierTexts, name) =>
  modifierTexts
    .filter((line) => line && line.origin !== "derived" && !line.lineEffect)
    .flatMap((line) => cleanBing(line.text).split(/,\s*/))
    .map((clause) => clause.match(new RegExp(`^${N}% ${name}$`, "i")))
    .filter(Boolean)
    .reduce((total, match) => total + num(match[1]), 0);

/**
 * @param {object} p
 * @param {string} p.heroId the selected loadout
 * @param {object[]} p.modifierTexts the build's lines (before the derived lines)
 * @param {object} p.requestedConditions the combat conditions (the energy-field switch)
 * @param {boolean} p.dealsSpell a skill of the build deals Spell Damage
 * @param {number|null} p.mainUsesPerSecond the Main Skill's uses per second the hit pass measured (null before it)
 */
export function bingState({
  heroId = "",
  modifierTexts = [],
  requestedConditions = {},
  dealsSpell = false,
  mainUsesPerSecond = null,
} = {}) {
  if (heroId !== BING_CREATIVE) return null;
  const traits = modifierTexts
    .filter((line) => line && line.origin === "trait" && line.origin !== "derived" && !line.lineEffect)
    .map((line) => cleanBing(line.text));
  const first = (key) => traits.map((text) => text.match(BING_PATTERNS[key])).find(Boolean) || null;
  const base = Boolean(first("signal")) && Boolean(first("essence"));
  const recoveryPercent = sumClauses(modifierTexts, "Whimsy Essence Recovery Speed");
  const essencePerSecond = Math.max(0, ESSENCE_PER_SECOND * (1 + recoveryPercent / 100));
  const essenceExplosions = base && dealsSpell ? essencePerSecond / ESSENCE_PER_EXPLOSION : 0;
  const flashMatch = first("flash");
  const flash = flashMatch ? { chance: num(flashMatch[1]) / 100, intervalSeconds: num(flashMatch[2]) } : null;
  const uses = Number.isFinite(mainUsesPerSecond) ? Math.max(0, mainUsesPerSecond) : null;
  const flashExplosions =
    base && dealsSpell && flash && uses > 0 && flash.chance > 0
      ? 1 / (flash.intervalSeconds + 1 / (flash.chance * uses))
      : 0;
  const explosionsPerSecond = essenceExplosions + flashExplosions;
  const signalEffectPercent = sumClauses(modifierTexts, "Whimsy Signal Effect");
  const enhanced = first("troubleSignal");
  const signalBasePercent = enhanced ? num(enhanced[1]) : SIGNAL_BASE_PERCENT;
  const signalPercent = signalBasePercent * (1 + signalEffectPercent / 100);
  const signalUptime = Math.min(1, SIGNAL_SECONDS * explosionsPerSecond);
  const domain = first("mindDomain");
  const inField = requestedConditions[ENERGY_FIELD_SWITCH] !== false;
  const whimsyEffectPercent = sumClauses(modifierTexts, "Whimsy Effect");
  const stackPercent = WHIMSY_STACK_PERCENT * (1 + whimsyEffectPercent / 100);
  const maxStacks = domain ? num(domain[2]) : 0;
  const whimsyPercent = ((1 + stackPercent / 100) ** maxStacks - 1) * 100;
  const whimsyUptime = domain && inField ? Math.min(1, WHIMSY_SECONDS * explosionsPerSecond) : 0;
  return {
    base,
    dealsSpell,
    recoveryPercent,
    essencePerSecond: round(essencePerSecond),
    essenceExplosions: round(essenceExplosions),
    flash,
    mainUsesPerSecond: uses,
    flashExplosions: round(flashExplosions),
    explosionsPerSecond: round(explosionsPerSecond),
    whimsyEffectPercent,
    signal: {
      basePercent: signalBasePercent,
      effectPercent: signalEffectPercent,
      percent: round(signalPercent),
      uptime: round(signalUptime),
      value: round(signalPercent * signalUptime),
    },
    whimsy: domain
      ? {
          inField,
          maxStacks,
          effectPercent: whimsyEffectPercent,
          stackPercent: round(stackPercent),
          percent: round(whimsyPercent),
          uptime: round(whimsyUptime),
          value: round(whimsyPercent * whimsyUptime),
        }
      : null,
    // The Flash of Brilliance procs read the Main Skill's measured uses, so a build with the pick runs the measuring pass.
    needsRates: Boolean(base && dealsSpell && flash),
  };
}

/** The best-case switch of the energy field (shown with Mind Domain only). */
export function bingSwitches(state) {
  if (!state?.whimsy) return [];
  const on = state.whimsy.inField;
  return [
    {
      id: ENERGY_FIELD_SWITCH,
      label: "Whimsy: standing in the energy field (Mind Domain)",
      enabled: on,
      active: on && state.whimsy.uptime > 0,
      summary: `${state.whimsy.maxStacks} Whimsy stacks held while a Whimsy Explosion field comes within 10 s`,
      reason: on ? "best-case assumption" : "off: no Whimsy stacks",
    },
  ];
}

const L = (status, reason, bodies = []) => ({ status, reason, bodies });
const cadence = (state) => {
  const parts = [
    `${state.essencePerSecond} Whimsy Essence per second: a Whimsy Explosion every ${round(100 / state.essencePerSecond)} s`,
  ];
  if (state.flashExplosions > 0) parts.push(`Flash of Brilliance +${state.flashExplosions} per second`);
  return `${parts.join(", ")} (${state.explosionsPerSecond} per second; provisional)`;
};
const signalBody = (state) => `+${state.signal.value}% additional Spell Damage taken`;
const whimsyBody = (state) => `+${state.whimsy.value}% additional Spell Damage`;

/** A Creative Genius line's status, reason and derived lines, or null when the module does not read it. */
export function bingLineRead(heroId, text, state, { revived = false } = {}) {
  if (heroId !== BING_CREATIVE || !state) return null;
  const key = bingClauseKey(text, { revived });
  if (!key) return null;
  const noSpell = "no skill of the build deals Spell Damage, so no Whimsy Explosion is used";
  const signalOn = state.base && state.dealsSpell && state.signal.uptime > 0;
  const signalReason = () =>
    `${cadence(state)}; Whimsy Signal ${state.signal.percent}% (${state.signal.basePercent}% × (1 + ${state.signal.effectPercent}% Whimsy Signal Effect)) for 5 s, up ${round(state.signal.uptime * 100)}% of the time: ${signalBody(state)} (Spell hits only)`;
  const whimsyOn = Boolean(state.whimsy && state.whimsy.uptime > 0);
  const whimsyReason = () =>
    !state.whimsy
      ? "Mind Domain is not picked: no Whimsy stacks"
      : !state.whimsy.inField
        ? 'the "standing in the energy field" switch is off: no Whimsy stacks'
        : !state.dealsSpell
          ? noSpell
          : `${state.whimsy.maxStacks} stacks × ${state.whimsy.stackPercent}% (5% × (1 + ${state.whimsy.effectPercent}% Whimsy Effect), multiplies) = +${state.whimsy.percent}%, held ${round(state.whimsy.uptime * 100)}% of the time standing in the field: ${whimsyBody(state)}`;
  switch (key) {
    case "essence":
      return state.dealsSpell ? L("In calc", cadence(state)) : L("Inactive", noSpell);
    case "signal":
      return signalOn ? L("In calc", signalReason(), [signalBody(state)]) : L("Inactive", noSpell);
    case "troubleSignal":
      return signalOn
        ? L("In calc", `the Whimsy Signal base is ${state.signal.basePercent}% (read in the Whimsy Signal line)`)
        : L("Inactive", noSpell);
    case "recovery":
      return state.dealsSpell
        ? L("In calc", `Whimsy Essence ${state.recoveryPercent}% Recovery Speed: ${cadence(state)}`)
        : L("Inactive", noSpell);
    case "flash":
      if (!state.dealsSpell) return L("Inactive", noSpell);
      if (state.mainUsesPerSecond === null)
        return L("Inactive", "the Main Skill's uses per second are read in the hit pass");
      if (!(state.mainUsesPerSecond > 0)) return L("Inactive", "the Main Skill deals no modeled hits");
      return L(
        "In calc",
        `${round(state.flash.chance * 100)}% per Main Skill use (${round(state.mainUsesPerSecond)} per second), then ${state.flash.intervalSeconds} s: +${state.flashExplosions} Whimsy Explosions per second (provisional)`,
      );
    case "mindDomain":
      return whimsyOn ? L("In calc", whimsyReason(), [whimsyBody(state)]) : L("Inactive", whimsyReason());
    case "overflowEssence": {
      const held = state.signal.uptime >= 1 && (!state.whimsy || state.whimsy.uptime >= 1 || !state.whimsy.inField);
      return held
        ? L(
            "No DPS effect",
            "Whimsy Signal and Whimsy are already held from the Essence regeneration: more Essence changes no dummy figure",
          )
        : L(
            "Not modeled",
            "the Essence from Spell Burst activations is not read (the Whimsy Explosion cadence is a lower bound)",
          );
    }
    case "troubleSelf":
      return L(
        "No DPS effect",
        "a Life and Energy Shield cost when a Whimsy Explosion hits you; the planner does not model when that happens",
      );
    case "brainstormExecute":
    case "brainstormEssence":
      return L("Not on dummy", "an execute / on-kill effect (the training dummy is never defeated)");
    case "overloadClick":
    case "autoOverload":
    case "ingenuityStart":
    case "overload":
      return L("Not modeled", OVERLOAD_REASON);
    case "genius": {
      const parts = [
        "+2 Whimsy Explosion Projectile Quantity: Not modeled (Whimsy Explosion's own damage is not published)",
        `+${state.whimsyEffectPercent}% Whimsy Effect: ${whimsyOn ? "In calc (the Whimsy stacks)" : `Inactive (${whimsyReason()})`}`,
        `Whimsy Signal Effect: ${signalOn ? "In calc (the Whimsy Signal value)" : `Inactive (${noSpell})`}`,
      ];
      const status = whimsyOn || signalOn ? "Partly modeled" : "Not modeled";
      return L(status, parts.join("; "));
    }
    default:
      return null;
  }
}
