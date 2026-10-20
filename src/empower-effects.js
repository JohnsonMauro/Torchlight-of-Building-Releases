import { skillProgressionSs13 } from "./data/skills/skill-progression-ss13.generated.js";
import { normalizePercentageText } from "./percentage-text.js";
import { empowerAdditionalLines } from "./storm-command.js";

// Empower Skill effects that reach the build's other damage (frost-terra audit 2026-10-13;
// research/frost-terra-30t-audit-2026-10-13.md). Before this module, Ice Bond's Euphoria never reached another skill and
// Blizzard's hit debuff reached Blizzard's own hits only.
//
// Sources:
// - Game keyword "Empower Effect": "The positive effect values provided by Empower Skills are affected by Empower Effect
//   bonuses." Read as value × (1 + Σ increased Empower Effect / 100) × Π(1 + additional / 100), the reducer the planner uses
//   for every other "Effect" pool (Aura Effect, Focus Buff Effect).
// - Mass Effect (TLIDB): "+1 Max Charges for the supported skill" and "X% effect for the supported skill for every +1 Charge,
//   up to Y%": X for every +1 Max Charges the skill's supports grant (its own +1, Magic Dash's +1), up to Y. Provisional: the
//   text does not say whether "Charge" counts the Max Charges bonus or the charges held.
// - Well-Fought Battle (TLIDB): "The supported skill X% Effect every time it is cast, stacking up to N time(s)": N stacks with
//   own buffs built before engaging (combat condition prebuiltSelfBuffs, CLAUDE.md), else 1 (the first cast). The stack
//   duration is not published (provisional).
// - "+X% Empower Skill Effect" lines on the character (increased, every Empower skill).
// - Blizzard: Freezing Point (Magnificent; TLIDB): "The supported skill becomes an Empower Skill and no longer has a casting
//   action", "Debuffs inflicted when the supported skill hits are now affected by Empower Effect", "The cooldown of the supported
//   skill becomes 2 s, and the duration of inflicted debuffs becomes 4 s", roll "+X% additional Empower Effect for the supported
//   skill".
//
// Effects:
// - Ice Bond (TLIDB level table; game: "Gains Euphoria when the Sentry is within a certain area around the character: Other
//   skills deal X% additional Cold Damage to Frostbitten enemies"). Ice Bond carries the Empower tag, so the Euphoria takes its
//   Empower Effect. Uptime 1: the Sentry is recast when it expires and stays by the character (the best case its hits already
//   use; provisional). Needs a Frostbitten dummy; "other skills" keeps it off Ice Bond's own hits.
// - Blizzard's hit debuff ("+10% additional Cold Damage taken"; game: "inflicts debuff on hit: X% additional Cold Damage taken
//   for 6s"): a debuff on the enemy, so it reaches every Cold source on the dummy. Scaled by Empower Effect only when a support
//   says its debuffs are (Freezing Point). Uptime 1 while the debuff outlasts the skill's cooldown (Freezing Point: 4 s vs 2 s;
//   otherwise 6 s vs the 2 s cooldown), else duration / cooldown (provisional: the skill is used whenever it is ready).

const N = "([+-]?\\d+(?:\\.\\d+)?)";
const round = (value) => Math.round(value * 10000) / 10000;
const GLOBAL_EMPOWER = new RegExp(`^${N}% Empower (?:Skill )?Effect$`, "i");
const ICE_BOND_EUPHORIA = /other skills \+?(\d+(?:\.\d+)?)% additional Cold Damage against Frostbitten enemies/i;
const FROSTBITTEN = new Set(["Frostbite", "Frozen", "Freeze"]);
// Game text of Blizzard's debuff (config_multi_language_en, Blizzard skill description): "for 6s".
const DEFAULT_DEBUFF_SECONDS = 6;

/** Skills whose Empower effect on other damage is modeled here (support coverage reads it). */
export const EMPOWER_MODELED_SKILLS = new Map([
  [
    "Ice Bond",
    "Ice Bond's Euphoria (+X% additional Cold Damage against Frostbitten enemies for other skills) × Empower Effect (src/empower-effects.js; provisional)",
  ],
  [
    "Blizzard",
    "Blizzard's hit debuff (additional Cold Damage taken on the dummy) × Empower Effect when Freezing Point makes its debuffs Empower-scaled (src/empower-effects.js; provisional)",
  ],
  [
    "Bull's Rage",
    "Bull's Rage's Euphoria (+X% additional Melee Skill Damage while it lasts) × Empower Effect × uptime (src/empower-effects.js; provisional)",
  ],
]);

/** Empower skills whose buff is modeled here without a damage engine of their own: skill → the buff's name (support coverage). */
export const EMPOWER_BUFF_SKILLS = new Map([["Bull's Rage", "Bull's Rage's Euphoria"]]);

// Bull's Rage (TLIDB, Lv20 reference text; level table Lv1 17.5% … Lv22 27.8% … Lv30 30.2%): "Casts the skill and gains
// Euphoria: +27% additional Melee Skill Damage while the skill lasts. Lasts 6s."; cooldown 10 s (TLIDB, game Split data).
// 2026-10-14 (provisional):
// - value = the level-table Euphoria × Empower Effect (Well-Fought Battle held at its 3 stacks with own buffs built before
//   engaging, the prebuiltSelfBuffs condition; Mass Effect; "+X% Empower Skill Effect").
// - use period = max(trigger interval, effective cooldown): Activation Medium: Multistrike triggers it at the build's Max
//   Multistrike Count events (interval = max(the medium's 0.1 s, 1 / events per second)), the rule user-confirmed 2026-10-12
//   for Activation Medium: Boss. Without a trigger it is cast whenever its cooldown is ready (best case, like Blizzard).
//   Effective cooldown = 10 s ÷ (1 + Σ Cooldown Recovery Speed) ÷ Π(1 + additional): support clauses and plain build lines.
// - duration = 6 s × (1 + Σ Duration) × Π(1 + additional Duration) from the support clauses.
// - uptime = min(1, duration ÷ period); the buff reaches Melee skills' hits as one time-averaged "+X% additional Melee Skill
//   Damage" line (the 5 s / 20 s windows use the same average).
const BULLS_RAGE_EUPHORIA = /([+-]?\d+(?:\.\d+)?)% additional Melee Skill Damage while the skill lasts/i;
const BULLS_RAGE_DURATION_SECONDS = 6;
const BULLS_RAGE_COOLDOWN_SECONDS = 10;
const PLAIN_COOLDOWN = new RegExp(`^${N}% (additional )?Cooldown Recovery Speed$`, "i");

/** Bull's Rage's Euphoria at a level: the TLIDB level table (Lv.20 is the reference text). */
export function bullsRageEuphoriaPercent(level) {
  const entry = skillProgressionSs13["Bull's Rage"];
  const clamped = String(Math.max(1, Math.min(40, Math.floor(level || 20))));
  const text =
    entry?.levels?.[clamped]?.changes
      ?.map(([, change]) => String(change))
      .find((change) => BULLS_RAGE_EUPHORIA.test(change)) ||
    entry?.reference ||
    "";
  return Number(text.match(BULLS_RAGE_EUPHORIA)?.[1]) || 0;
}

/**
 * Bull's Rage's Euphoria uptime and time-averaged value for one setup.
 * @param {object} p { setup, clauses, effect (empowerEffectFactor), modifierTexts, multistrikeEventsPerSecond (null before the hit pass) }
 */
export function bullsRageEuphoria({
  setup,
  clauses = [],
  effect = { factor: 1 },
  modifierTexts = [],
  multistrikeEventsPerSecond = null,
} = {}) {
  const level = Math.floor(setup?.effectiveLevel || 20);
  const base = bullsRageEuphoriaPercent(level);
  const value = base * effect.factor;
  const cooldownLines = [
    ...clauses
      .filter((clause) => clause.family === "cooldown")
      .map((clause) => ({
        source: clause.source,
        text: clause.text,
        value: clause.value,
        additional: Boolean(clause.additional),
      })),
    ...modifierTexts
      .filter((line) => line.origin !== "derived")
      .flatMap((line) => {
        const match = normalizePercentageText(String(line.text ?? ""))
          .replace(/\s+/g, " ")
          .trim()
          .match(PLAIN_COOLDOWN);
        return match
          ? [
              {
                source: line.source,
                text: line.text,
                value: Number(match[1]) * (line.multiplier ?? 1),
                additional: Boolean(match[2]),
              },
            ]
          : [];
      }),
  ];
  const cooldownFactor =
    Math.max(
      1e-9,
      1 + cooldownLines.filter((line) => !line.additional).reduce((sum, line) => sum + line.value, 0) / 100,
    ) * cooldownLines.filter((line) => line.additional).reduce((product, line) => product * (1 + line.value / 100), 1);
  const cooldown = BULLS_RAGE_COOLDOWN_SECONDS / cooldownFactor;
  const durationLines = clauses
    .filter((clause) => clause.family === "duration")
    .map((clause) => ({
      source: clause.source,
      text: clause.text,
      value: clause.value,
      additional: Boolean(clause.additional),
    }));
  const duration =
    BULLS_RAGE_DURATION_SECONDS *
    Math.max(0, 1 + durationLines.filter((line) => !line.additional).reduce((sum, line) => sum + line.value, 0) / 100) *
    durationLines.filter((line) => line.additional).reduce((product, line) => product * (1 + line.value / 100), 1);
  const trigger = clauses.find((clause) => clause.family === "trigger" && clause.kind === "maxMultistrike") || null;
  const events = Number.isFinite(multistrikeEventsPerSecond) ? multistrikeEventsPerSecond : null;
  // Before the hit pass the event rate is unknown: the medium's own interval (best case for this pass).
  const triggerInterval = trigger
    ? events == null
      ? trigger.interval
      : events > 0
        ? Math.max(trigger.interval, 1 / events)
        : null
    : null;
  const period = Math.max(triggerInterval ?? 0, cooldown);
  const uptime = period > 0 ? Math.min(1, duration / period) : 1;
  const average = value * uptime;
  const cadence = trigger
    ? triggerInterval == null
      ? `Activation Medium: Multistrike finds no Max Multistrike Count events, so it is cast whenever its ${round(cooldown)} s cooldown is ready (best case)`
      : `triggered by Activation Medium: Multistrike every max(${round(triggerInterval)} s${events == null ? " (event rate not measured yet: the medium's interval)" : ` = max(${trigger.interval} s, 1 ÷ ${round(events)} Max Multistrike Count events/s)`}, cooldown ${round(cooldown)} s) = ${round(period)} s (rule user-confirmed 2026-10-12 for Activation Medium: Boss)`
    : `cast whenever its ${round(cooldown)} s cooldown is ready (best case, provisional)`;
  return {
    level,
    base,
    value: round(value),
    cooldownSeconds: round(cooldown),
    cooldownLines,
    durationSeconds: round(duration),
    durationLines,
    triggerIntervalSeconds: triggerInterval == null ? null : round(triggerInterval),
    eventsPerSecond: events,
    periodSeconds: round(period),
    uptime: round(uptime),
    average: round(average),
    cadence,
  };
}

/** Ice Bond's Euphoria value at a level: the TLIDB level table (Lv.20 is the reference text). */
export function iceBondEuphoriaPercent(level) {
  const entry = skillProgressionSs13["Ice Bond"];
  const clamped = String(Math.max(1, Math.min(40, Math.floor(level || 20))));
  const text =
    entry?.levels?.[clamped]?.changes
      ?.map(([, change]) => String(change))
      .find((change) => ICE_BOND_EUPHORIA.test(change)) ||
    entry?.reference ||
    "";
  return Number(text.match(ICE_BOND_EUPHORIA)?.[1]) || 0;
}

/**
 * Empower Effect of one setup from its support clauses (src/support-effects.js family "empower") and the character's lines.
 * @returns {{ factor, increasedPercent, additionalFactor, sources }}
 */
// `globalAdditional`: the character's "+X% additional Empower Skill (and Defensive Skill) Effect" lines (Storm's Command's -99%,
// game affix 12665181 attr 3401 additional on Empower-tagged effects; core audit B8): { factor, sources }.
export function empowerEffectFactor(
  clauses = [],
  { globalIncreasedPercent = 0, globalSources = [], prebuiltSelfBuffs = true, globalAdditional = null } = {},
) {
  const empower = clauses.filter((clause) => clause.family === "empower");
  const sources = [...globalSources];
  let increasedPercent = globalIncreasedPercent,
    additionalFactor = 1;
  for (const item of globalAdditional?.sources || []) {
    additionalFactor *= Math.max(0, 1 + item.value / 100);
    sources.push({
      source: item.source,
      text: item.text,
      value: item.value,
      reading: "additional (multiplies; core audit B8)",
    });
  }
  const chargeBonus = empower
    .filter((clause) => clause.kind === "charges")
    .reduce((sum, clause) => sum + (clause.value || 0), 0);
  for (const clause of empower) {
    if (clause.kind === "perCharge") {
      const value = Math.min(clause.cap ?? Infinity, (clause.value * chargeBonus) / (clause.per || 1));
      increasedPercent += value;
      sources.push({
        source: clause.source,
        text: clause.text,
        value: round(value),
        reading: `${clause.value}% × ${chargeBonus} Max Charges bonus (provisional)`,
      });
    } else if (clause.kind === "perCast") {
      const stacks = prebuiltSelfBuffs ? clause.cap : 1;
      increasedPercent += clause.value * stacks;
      sources.push({
        source: clause.source,
        text: clause.text,
        value: round(clause.value * stacks),
        reading: `${stacks} stack${stacks === 1 ? "" : "s"} (${prebuiltSelfBuffs ? "own buffs built before engaging" : "cold start: the first cast"}; provisional)`,
      });
    } else if (clause.kind === "additional") {
      additionalFactor *= 1 + clause.value / 100;
      sources.push({
        source: clause.source,
        text: clause.text,
        value: clause.value,
        reading: "additional (multiplies)",
      });
    }
  }
  return {
    factor: (1 + increasedPercent / 100) * additionalFactor,
    increasedPercent: round(increasedPercent),
    additionalFactor: round(additionalFactor),
    sources,
  };
}

/**
 * @param {object} p
 * @param {object[]} p.setups resolved setups (with supportEffects)
 * @param {Set<string>} p.activeNames active skill names
 * @param {Set<string>} p.damagingSetupKeys setups whose own damage is modeled (their hits land on the dummy)
 * @param {Map<string, object>} p.hitProfiles setupKey → skill-hit profile (selfDebuffTaken)
 * @param {object[]} p.modifierTexts the build's lines
 * @param {string[]} p.enemyAilments the enemy-ailment model's state names
 * @param {boolean} p.prebuiltSelfBuffs combat condition (CLAUDE.md)
 * @returns {{ lines: object[], entries: object[], sharedDebuffSetupKeys: Set<string> }}
 */
export function resolveEmpowerEffects({
  setups = [],
  activeNames = new Set(),
  damagingSetupKeys = new Set(),
  hitProfiles = new Map(),
  modifierTexts = [],
  enemyAilments = [],
  prebuiltSelfBuffs = true,
  multistrikeEventsPerSecond = null,
} = {}) {
  const lines = [],
    entries = [],
    sharedDebuffSetupKeys = new Set();
  const globalSources = [];
  for (const line of modifierTexts) {
    if (line.origin === "derived") continue;
    const match = normalizePercentageText(String(line.text ?? ""))
      .replace(/\s+/g, " ")
      .trim()
      .match(GLOBAL_EMPOWER);
    if (match)
      globalSources.push({
        source: line.source,
        text: line.text,
        value: Number(match[1]) * (line.multiplier ?? 1),
        reading: "increased",
      });
  }
  const globalIncreasedPercent = globalSources.reduce((sum, item) => sum + item.value, 0);
  const globalAdditional = empowerAdditionalLines(modifierTexts);
  const frostbitten = enemyAilments.some((name) => FROSTBITTEN.has(name));
  for (const setup of setups) {
    if (setup.enabled === false || !activeNames.has(setup.name)) continue;
    const clauses = setup.supportEffects?.clauses || [];
    const empowerTag =
      (setup.tags || []).includes("Empower") ||
      clauses.some((clause) => clause.family === "empower" && clause.kind === "becomes");
    const effect = empowerEffectFactor(clauses, {
      globalIncreasedPercent,
      globalSources,
      prebuiltSelfBuffs,
      globalAdditional,
    });
    const factorText = `Empower Effect ×${round(effect.factor)} = (1 + ${effect.increasedPercent}%) × ${effect.additionalFactor}`;
    if (setup.name === "Ice Bond") {
      const base = iceBondEuphoriaPercent(setup.effectiveLevel);
      const factor = empowerTag ? effect.factor : 1;
      const value = round(base * factor);
      const active = frostbitten && value > 0;
      entries.push({
        setupKey: setup.setupKey,
        skill: setup.name,
        kind: "euphoria",
        base,
        factor: round(factor),
        value,
        active,
        empowerScaled: empowerTag,
        sources: effect.sources,
        text: `Ice Bond Lv.${Math.floor(setup.effectiveLevel || 20)} Euphoria: other skills +${base}% additional Cold Damage against Frostbitten enemies${empowerTag ? ` × ${factorText}` : ""} = +${value}%; ${active ? "the dummy is Frostbitten; uptime 1 (the Sentry is recast on expiry and stays by the character: best case, provisional)" : "inactive: the dummy is not Frostbitten"}.`,
      });
      if (active)
        lines.push({
          text: `+${value}% additional Cold Damage`,
          source: `Ice Bond: Euphoria (+${base}% × ${round(factor)} Empower Effect; other skills, Frostbitten dummy)`,
          origin: "derived",
          multiplier: 1,
          exceptSetupKey: setup.setupKey,
          empower: true,
        });
    }
    if (setup.name === "Bull's Rage") {
      const factor = empowerTag ? effect.factor : 1;
      const euphoria = bullsRageEuphoria({
        setup,
        clauses,
        effect: { factor },
        modifierTexts,
        multistrikeEventsPerSecond,
      });
      const active = euphoria.average > 0;
      entries.push({
        setupKey: setup.setupKey,
        skill: setup.name,
        kind: "euphoria",
        base: euphoria.base,
        factor: round(factor),
        value: euphoria.average,
        uptime: euphoria.uptime,
        active,
        empowerScaled: empowerTag,
        sources: effect.sources,
        euphoria,
        text: `Bull's Rage Lv.${euphoria.level} Euphoria: Melee skills +${euphoria.base}% additional damage${empowerTag ? ` × ${factorText}` : ""} = +${euphoria.value}% for ${euphoria.durationSeconds} s${euphoria.durationLines.length ? ` (6 s × duration lines)` : ""}; ${euphoria.cadence}; uptime min(1, ${euphoria.durationSeconds} ÷ ${euphoria.periodSeconds}) = ${euphoria.uptime} → +${euphoria.average}% additional Melee Skill Damage on average (provisional).`,
      });
      if (active)
        lines.push({
          text: `+${euphoria.average}% additional Melee Skill Damage`,
          source: `Bull's Rage: Euphoria (+${euphoria.base}% × ${round(factor)} Empower Effect × ${euphoria.uptime} uptime)`,
          origin: "derived",
          multiplier: 1,
          empower: true,
        });
    }
    const profile = hitProfiles.get(setup.setupKey);
    if (profile?.selfDebuffTaken?.length && damagingSetupKeys.has(setup.setupKey)) {
      const scaled = clauses.some((clause) => clause.family === "empower" && clause.kind === "debuffs");
      const timing = clauses.find((clause) => clause.family === "empower" && clause.kind === "timing");
      const duration = timing?.duration ?? DEFAULT_DEBUFF_SECONDS;
      const cooldown = timing?.cooldown ?? profile.cooldownSeconds ?? 2;
      const uptime = Math.min(1, duration / Math.max(1e-9, cooldown));
      const factor = scaled ? effect.factor : 1;
      for (const debuff of profile.selfDebuffTaken) {
        const value = round(debuff.value * factor * uptime);
        for (const type of debuff.types || []) {
          lines.push({
            text: `+${value}% additional ${type} Damage taken`,
            source: `${setup.name}: hit debuff (+${debuff.value}%${scaled ? ` × ${round(factor)} Empower Effect` : ""}${uptime < 1 ? ` × uptime ${round(uptime)}` : ""}; enemy debuff)`,
            origin: "derived",
            multiplier: 1,
            empower: scaled,
          });
        }
        entries.push({
          setupKey: setup.setupKey,
          skill: setup.name,
          kind: "debuff",
          base: debuff.value,
          factor: round(factor),
          uptime: round(uptime),
          value,
          active: true,
          empowerScaled: scaled,
          sources: scaled ? effect.sources : [],
          text: `${setup.name} hit debuff: +${debuff.value}% additional ${(debuff.types || []).join("/")} Damage taken on the dummy${scaled ? ` × ${factorText} (debuffs Empower-scaled by Freezing Point)` : ""}${uptime < 1 ? ` × uptime ${round(uptime)}` : ""} = +${value}%; it lasts ${duration} s against a ${cooldown} s cooldown (uptime ${round(uptime)}; provisional), and reaches every ${(debuff.types || []).join("/")} source, not only ${setup.name}'s hits.`,
        });
      }
      sharedDebuffSetupKeys.add(setup.setupKey);
    }
  }
  return { lines, entries, sharedDebuffSetupKeys };
}
