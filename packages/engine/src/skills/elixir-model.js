// Elixir Skills on the training dummy (core audit batch B8: Tailored Remedy, Miraculous Touch; research/core-talents-audit-2026-10-18.md §5).
//
// Sourced:
// - The Elixir Skills' text (TLIDB, packages/engine/data/catalogs/tlidb.js): "Casts this skill and gains an Elixir Effect: <values> Lasts
//   for 3s" (no level table on TLIDB), and "Defeating enemies can increase the Charging Progress of this skill. At 15 Charging
//   Progress, gains 1 Charge." Restoration Elixirs (Tonics) restore Life / Mana instead. The game skill data gives every Elixir
//   3 charges and a 0.5 s cooldown (packages/engine/data/skills/skill-timing.generated.js).
// - Miraculous Touch (Ethereal Prism core, talent 80002000): affix 558153024 "Elixir Skills gain P1 Charging Progress every
//   second" (node 434: P1 ÷ 30 per server tick, filtered to Elixir-tagged skills). Gear lines of the same wording read the same.
// - Tailored Remedy (Steel Vanguard core, talent 62001400; SS14 record 4104733 + 16269445, the SS13 -40% duration line is gone):
//   "+60% additional Elixir Skill Effect while affected by no more than 2 Elixir Skills" (attr 3631 Inflicted Elixir Effect,
//   additional, while fewer than 3 Elixir buffs are on the player) and "The Restoration Effect from Elixir Skills cannot be
//   removed" (a flag on Restoration effects: defence / recovery only).
//
// Reading (provisional where marked):
// - The dummy is never defeated, so kill-based Charging Progress is 0 there; an Elixir recharges only from "Elixir Skills gain
//   N Charging Progress every second" lines: charges per second = N ÷ 15, capped by the 0.5 s cooldown. Each charge is cast
//   at once (best case), and its effect lasts 3 s × (1 + Σ Elixir Duration) × Π(1 + additional): uptime = min(1, casts per
//   second × duration). The charges held when the fight starts are not counted (the sustained reading; the 5 s / 20 s windows
//   use the same average).
// - Elixir Skill Effect scales the effect values: value × (1 + Σ "+X% Elixir Skill Effect") × Π(1 + "+X% additional Elixir Skill
//   Effect") × Tailored Remedy (the planner's reducer for every "Effect" pool; Life Tonic's text says its Restoration "is also
//   affected by Elixir Effect", i.e. Elixir Effects are). Tailored Remedy holds while at most 2 Elixir Skills have uptime (a
//   build with more is not split by time: provisional).
// - Each value line of an Elixir Effect becomes one time-averaged derived plain line (value × Elixir Skill Effect × uptime) that
//   every engine reads like the same plain line. State lines (Has Blur, Damage triggers Lucky, the Ignite → Scorch swap, the
//   Infiltrations on Spell damage, Energy Shield rules) cannot be averaged and are not modeled. Charging supports (Hyper
//   Metabolism's per-second progress, Medicinal Buildup's progress on cast) and "Triggers the Elixir Skill …" lines are not read.
// - Miraculous Gain ("Triggers Miraculous Gain when casting an Elixir Skill"; hyperlink 814: randomly one of four effects for 6 s,
//   up to 4 times within 1 s). User-supplied 2026-10-19 (Google AI Mode answer, not tested in game): 1 Charging Progress per
//   second gives 1 Elixir charge per 15 s without kills, and each of the four effects is 25%: a Lv. 20 Empower or Defensive Skill;
//   5 stacks of God of War's Blessing; the Main Skill triggered 10 times at a 0.2 s interval; Tenacity / Agility / Focus Blessings
//   maxed. Averaged (miraculousGainState): the Main Skill gains 25% × 10 uses per Elixir cast; the Blessings sit at max for
//   min(1, 25% × Elixir casts per second × 6 s) of the time. The Lv. 20 skill and God of War's Blessing are not modeled (the
//   ten skills are internal ids only and the Blessing's values are not identified).
import { tlidbSkillCatalog } from "../../data/catalogs/tlidb.js";
import { skillTiming } from "../../data/skills/skill-timing.generated.js";
import { cleanGameText } from "../text/percentage-text.js";

export const ELIXIR_PROGRESS_LINE = /^Elixir Skills gain (\d+(?:\.\d+)?) Charging Progress every second$/i;
export const ELIXIR_EFFECT_LINE = /^([+-]\d+(?:\.\d+)?)% Elixir Skill Effect$/i;
export const ELIXIR_ADDITIONAL_EFFECT_LINE = /^([+-]\d+(?:\.\d+)?)% additional Elixir Skill Effect$/i;
export const TAILORED_REMEDY_LINE =
  /^\+(\d+(?:\.\d+)?)% additional Elixir Skill Effect (?:while affected by|when equipped with) no more than (\d+) Elixir Skills?$/i;
export const ELIXIR_DURATION_LINE = /^([+-]\d+(?:\.\d+)?)% (additional )?Elixir Skill (?:Effect )?Duration$/i;
export const RESTORATION_KEPT_LINE = /^The Restoration Effect from Elixir Skills cannot be removed$/i;
export const MIRACULOUS_GAIN_LINE = /^Triggers Miraculous Gain when casting an Elixir Skill$/i;
// Sage – Licorice Note's Artificial Moon line (hero trait audit B8): an additional Elixir Skill Effect for the Scent Bottle Elixirs
// only (setups with `bottle`), not for an Elixir the player placed on the skill board.
export const BOTTLE_ADDITIONAL_EFFECT_LINE =
  /^([+-]\d+(?:\.\d+)?)% additional Elixir Skill Effect for the Elixir Skills from any Scent Bottle$/i;
const DEFAULT_PROGRESS_PER_CHARGE = 15;
const DEFAULT_DURATION_SECONDS = 3;
const round = (value) => Math.round(value * 10000) / 10000;
const clean = (text) => cleanGameText(String(text ?? ""));

// Value lines an Elixir Effect carries that scale linearly (time-averaged as derived lines), each with whether it can move dummy damage.
const VALUE_LINES = [
  {
    pattern:
      /^([+-])(\d+(?:\.\d+)?)% (Critical Strike Rating|Hit Damage|Damage Over Time|Affliction Effect|Attack and Cast Speed)$/i,
    damage: true,
  },
  { pattern: /^(\d+(?:\.\d+)?)% (Elemental Resistance Penetration for Spell Skills)$/i, damage: true, unsigned: true },
  {
    pattern: /^Adds (\d+(?:\.\d+)?)% of (Physical Damage) (as|to) (Fire|Cold|Lightning) Damage$/i,
    damage: true,
    adds: true,
  },
  {
    pattern:
      /^([+-])(\d+(?:\.\d+)?)% (Movement Speed|Projectile Speed|Elemental and Erosion Resistance|Max Elemental Resistance|Defense)(?:, up to [+-]?\d+(?:\.\d+)?%)?$/i,
    damage: false,
  },
  { pattern: /^([+-])(\d+) (Armor|Evasion)$/i, damage: false, flat: true },
];

/** The Elixir Effect of one Elixir Skill from its catalog text: kind, value lines, state lines, duration, progress per charge. */
export function elixirSkillProfile(name) {
  const effects = (tlidbSkillCatalog.find((entry) => entry.name === name)?.effects || []).map(String);
  const effectText =
    effects.find((text) => /^Casts this skill and gains (?:an Elixir Effect|restoration):/i.test(text)) || "";
  const kind = /gains an Elixir Effect:/i.test(effectText)
    ? "effect"
    : /gains restoration:/i.test(effectText)
      ? "restoration"
      : "unknown";
  const lines = effectText.split(/\n/).slice(1).map(clean).filter(Boolean);
  const durationLine = lines.find((line) => /^Lasts (?:for )?(\d+(?:\.\d+)?) ?s\.?$/i.test(line));
  const durationSeconds = Number(durationLine?.match(/(\d+(?:\.\d+)?)/)?.[1]) || DEFAULT_DURATION_SECONDS;
  const body = lines.filter((line) => line !== durationLine);
  const values = [],
    states = [];
  for (const text of kind === "effect" ? body : []) {
    const rule = VALUE_LINES.find((item) => item.pattern.test(text));
    // A state line that could change dummy damage (Has Blur, Lucky, the Ignite → Scorch swap, Infiltrations) vs defence / on-kill.
    if (rule) values.push({ text, damage: rule.damage, rule });
    else
      states.push({
        text,
        damage:
          /Damage|Lucky|Ignite|Scorch|Infiltration|Blur|Ill Omen|Critical|Penetration/i.test(text) &&
          !/damage taken|defeated|bypasses Energy Shield/i.test(text),
      });
  }
  const progressPerCharge =
    Number(effects.join("\n").match(/At (\d+(?:\.\d+)?) Charging Progress, gains 1 Charge/i)?.[1]) ||
    DEFAULT_PROGRESS_PER_CHARGE;
  const timing = skillTiming[name] || {};
  // Restoration Elixirs (hero trait audit B8, Sage's Elixir of Immortality): "Restores X% Max Life / Max Mana within N s".
  const restoration = kind === "restoration" ? body : [];
  const restores = (pool) =>
    Number(
      restoration
        .map((line) => line.match(new RegExp(`^Restores (\\d+(?:\\.\\d+)?)% Max ${pool} within`, "i"))?.[1])
        .find(Boolean),
    ) || 0;
  const restorationSeconds =
    Number(restoration.map((line) => line.match(/within (\d+(?:\.\d+)?) ?s/i)?.[1]).find(Boolean)) || 0;
  return {
    name,
    kind,
    values,
    states,
    restoration,
    restoresLifePercent: restores("Life"),
    restoresManaPercent: restores("Mana"),
    restorationSeconds,
    durationSeconds,
    progressPerCharge,
    cooldownSeconds: Number(timing.cooldown) > 0 ? Number(timing.cooldown) : 0.5,
    charges: Number(timing.cdTimes) || 1,
  };
}

// The scaled text of one value line (value × factor), keeping its wording.
function scaledText(value, factor) {
  const match = value.text.match(value.rule.pattern);
  const scale = (number) => round(Number(number) * factor);
  if (value.rule.adds) return `Adds ${scale(match[1])}% of ${match[2]} ${match[3]} ${match[4]} Damage`;
  if (value.rule.unsigned) return `${scale(match[1])}% ${match[2]}`;
  if (value.rule.flat) return `${match[1]}${scale(match[2])} ${match[3]}`;
  return `${match[1]}${scale(match[2])}% ${match[3]}`;
}

/**
 * @param {object} p { elixirs: [{ name, setupKey, bottle?, extraProgressPerSecond?, extraProgressSources? }], lines: modifier lines
 *   with `clean` (non-derived) }. A Sage Scent Bottle Elixir (hero trait audit B8, packages/engine/src/heroes/sage-traits.js) carries `bottle` ("basic"):
 *   it takes the bottle-only "+X% additional Elixir Skill Effect for the Elixir Skills from any Scent Bottle" lines on top of the
 *   build's, and its own Charging Progress per second from the Functional Ingredient. Each setup carries its own `effectFactor`
 *   and `activeShare` (an Effect Elixir's uptime; a Restoration Elixir's restoring time share).
 * @returns {null | { setups, progressPerSecond, progressSources, effectFactor, increasedPercent, additionalFactor, effectSources,
 *   tailored, durationSources, derived: [{ text, source, conditionText }], hasDamageEffect }}
 */
export function resolveElixirs({ elixirs = [], lines = [] } = {}) {
  const read = (pattern) =>
    lines.flatMap((line) => {
      const match = (line.clean ?? clean(line.text)).match(pattern);
      return match ? [{ line, match, value: Number(match[1]) * (line.multiplier ?? 1) }] : [];
    });
  const progress = read(ELIXIR_PROGRESS_LINE);
  const progressPerSecond = progress.reduce((sum, item) => sum + item.value, 0);
  const increased = read(ELIXIR_EFFECT_LINE),
    additional = read(ELIXIR_ADDITIONAL_EFFECT_LINE);
  const tailoredLines = read(TAILORED_REMEDY_LINE);
  const durations = read(ELIXIR_DURATION_LINE);
  const durationFactor =
    Math.max(0, 1 + durations.filter((item) => !item.match[2]).reduce((sum, item) => sum + item.value, 0) / 100) *
    durations.filter((item) => item.match[2]).reduce((product, item) => product * (1 + item.value / 100), 1);
  const seen = new Set();
  const setups = elixirs
    .filter((setup) => {
      if (seen.has(setup.name)) return false;
      seen.add(setup.name);
      return true;
    })
    .map((setup) => {
      const profile = elixirSkillProfile(setup.name);
      const extraProgress = Math.max(0, Number(setup.extraProgressPerSecond) || 0);
      const ownProgress = progressPerSecond + extraProgress;
      const chargesPerSecond = ownProgress / profile.progressPerCharge;
      const castsPerSecond = Math.min(chargesPerSecond, 1 / profile.cooldownSeconds);
      const durationSeconds = profile.durationSeconds * durationFactor;
      const uptime = profile.kind === "effect" ? Math.min(1, castsPerSecond * durationSeconds) : 0;
      // A Restoration Elixir's restoring time ("within N s", also affected by Elixir Duration per the Tonics' text).
      const activeShare =
        profile.kind === "effect" ? uptime : Math.min(1, castsPerSecond * profile.restorationSeconds * durationFactor);
      return {
        ...profile,
        setupKey: setup.setupKey,
        bottle: setup.bottle || null,
        progressPerSecond: round(ownProgress),
        extraProgressPerSecond: round(extraProgress),
        extraProgressSources: setup.extraProgressSources || [],
        chargesPerSecond: round(chargesPerSecond),
        castsPerSecond: round(castsPerSecond),
        durationSeconds: round(durationSeconds),
        uptime: round(uptime),
        activeShare: round(activeShare),
      };
    });
  const upCount = setups.filter((setup) => setup.uptime > 0).length;
  const equipped = setups.length;
  const tailored = tailoredLines.map((item) => {
    const limit = Number(item.match[2]);
    const affected = /affected by/i.test(item.line.clean ?? item.line.text);
    const count = affected ? upCount : equipped;
    const holds = upCount > 0 && count <= limit;
    return {
      source: item.line.source,
      text: item.line.clean ?? clean(item.line.text),
      value: item.value,
      limit,
      count,
      holds,
    };
  });
  const tailoredFactor = tailored
    .filter((item) => item.holds)
    .reduce((product, item) => product * (1 + item.value / 100), 1);
  const increasedPercent = increased.reduce((sum, item) => sum + item.value, 0);
  const additionalFactor = additional.reduce((product, item) => product * (1 + item.value / 100), 1) * tailoredFactor;
  const effectFactor = Math.max(0, 1 + increasedPercent / 100) * additionalFactor;
  const effectSources = [
    ...increased.map((item) => ({
      source: item.line.source,
      text: item.line.clean,
      value: item.value,
      kind: "increased",
    })),
    ...additional.map((item) => ({
      source: item.line.source,
      text: item.line.clean,
      value: item.value,
      kind: "additional",
    })),
    ...tailored
      .filter((item) => item.holds)
      .map((item) => ({
        source: item.source,
        text: item.text,
        value: item.value,
        kind: "additional",
        condition: `${item.count} Elixir Skill${item.count === 1 ? "" : "s"} ${/affected/i.test(item.text) ? "up" : "equipped"} ≤ ${item.limit}`,
      })),
  ];
  // Scent Bottle Elixirs (Sage): the bottle-only additional lines on top of the build's Elixir Skill Effect.
  const bottleLines = read(BOTTLE_ADDITIONAL_EFFECT_LINE);
  const bottleFactor = bottleLines.reduce((product, item) => product * (1 + item.value / 100), 1);
  const bottleSources = bottleLines.map((item) => ({
    source: item.line.source,
    text: item.line.clean,
    value: item.value,
    kind: "additional",
    condition: "Scent Bottle Elixirs only",
  }));
  const derived = [];
  for (const setup of setups) {
    setup.effectFactor = round(effectFactor * (setup.bottle ? bottleFactor : 1));
    setup.effectSources = setup.bottle ? [...effectSources, ...bottleSources] : effectSources;
    const factor = setup.effectFactor;
    setup.effectLines = setup.values.map((value) => {
      const scaled = setup.uptime > 0 ? scaledText(value, factor * setup.uptime) : null;
      if (scaled)
        derived.push({
          text: scaled,
          source: `${setup.name} (Elixir Effect × ${round(factor)} Elixir Skill Effect × ${setup.uptime} uptime)`,
          conditionText: `${setup.name}${setup.bottle ? " (Basic Scent Bottle)" : ""}: ${value.text} × ${round(factor)} Elixir Skill Effect × ${setup.uptime} uptime (${setup.castsPerSecond} casts/s × ${setup.durationSeconds} s; provisional)`,
          damage: value.damage,
          setupKey: setup.setupKey,
        });
      return { text: value.text, damage: value.damage, derivedText: scaled };
    });
  }
  const hasDamageEffect = setups.some((setup) => setup.uptime > 0 && setup.values.some((value) => value.damage));
  return {
    setups,
    progressPerSecond: round(progressPerSecond),
    progressSources: progress.map((item) => ({ source: item.line.source, text: item.line.clean, value: item.value })),
    effectFactor: round(effectFactor),
    increasedPercent: round(increasedPercent),
    additionalFactor: round(additionalFactor),
    effectSources,
    tailored,
    durationFactor: round(durationFactor),
    durationSources: durations.map((item) => ({
      source: item.line.source,
      text: item.line.clean,
      value: item.value,
      additional: Boolean(item.match[2]),
    })),
    derived,
    hasDamageEffect,
    upCount,
    bottleFactor: round(bottleFactor),
    bottleSources,
  };
}

/** One sentence on an Elixir Skill's state, for badges and the assumptions. */
export function elixirSetupText(setup, elixirs) {
  if (setup.kind === "restoration")
    return `${setup.name}: a Restoration Elixir (restores Life / Mana): no damage effect`;
  const where = setup.bottle ? " (Basic Scent Bottle)" : "";
  if (!(setup.uptime > 0))
    return `${setup.name}${where}: charged by defeating enemies (${setup.progressPerCharge} Charging Progress per charge); the dummy is never defeated and the build has no "Elixir Skills gain N Charging Progress every second" line${setup.bottle ? " or Functional Ingredient progress" : ""}, so no Elixir Effect is up on the dummy`;
  const values = setup.effectLines
    .filter((line) => line.derivedText)
    .map((line) => `${line.text} → ${line.derivedText}`)
    .join("; ");
  const unread = setup.states.filter((line) => line.damage);
  const progress =
    setup.extraProgressPerSecond > 0
      ? `${setup.progressPerSecond ?? elixirs.progressPerSecond} Charging Progress/s (${elixirs.progressPerSecond} from the build's lines + ${setup.extraProgressPerSecond} from the Functional Ingredient)`
      : `${setup.progressPerSecond ?? elixirs.progressPerSecond} Charging Progress/s`;
  return `${setup.name}${where}: ${progress} ÷ ${setup.progressPerCharge} per charge = ${setup.castsPerSecond} casts/s, each lasting ${setup.durationSeconds} s: uptime ${Math.round(setup.uptime * 1000) / 10}% × Elixir Skill Effect ×${setup.effectFactor ?? elixirs.effectFactor}${values ? ` (${values})` : ""}${unread.length ? `; not modeled: ${unread.map((line) => line.text).join("; ")}` : ""} (provisional)`;
}

export const MIRACULOUS_GAIN_SHARE = 0.25;
export const MIRACULOUS_GAIN_SECONDS = 6;
export const MIRACULOUS_GAIN_TRIGGERS = 10;

/**
 * Miraculous Gain averaged over the Elixir casts (user-supplied 2026-10-19): { gainsPerSecond, blessingShare,
 * mainSkillUsesPerSecond, sources, text } or null without the line or without an Elixir cast on the dummy.
 */
export function miraculousGainState(elixirs = null, lines = []) {
  const sources = lines.filter((line) => MIRACULOUS_GAIN_LINE.test(line.clean ?? clean(line.text)));
  if (!sources.length || !elixirs?.setups?.length) return null;
  const gainsPerSecond = elixirs.setups.reduce((sum, setup) => sum + (setup.castsPerSecond || 0), 0);
  if (!(gainsPerSecond > 0)) return null;
  const blessingShare = Math.min(1, MIRACULOUS_GAIN_SHARE * gainsPerSecond * MIRACULOUS_GAIN_SECONDS);
  const mainSkillUsesPerSecond = MIRACULOUS_GAIN_SHARE * MIRACULOUS_GAIN_TRIGGERS * gainsPerSecond;
  const text = `Miraculous Gain on ${round(gainsPerSecond)} Elixir casts/s (one per ${round(1 / gainsPerSecond)} s): each of the four effects 25% (user-supplied 2026-10-19, Google AI Mode answer, not tested in game): the Main Skill triggered ${MIRACULOUS_GAIN_TRIGGERS} times → +${round(mainSkillUsesPerSecond)} Main Skill uses/s; Tenacity / Agility / Focus Blessings at max ${round(blessingShare * 100)}% of the time (25% × ${MIRACULOUS_GAIN_SECONDS} s per cast); the Lv. 20 Empower / Defensive Skill and 5 stacks of God of War's Blessing are not modeled`;
  return {
    gainsPerSecond: round(gainsPerSecond),
    blessingShare: round(blessingShare),
    mainSkillUsesPerSecond: round(mainSkillUsesPerSecond),
    sources: sources.map((line) => line.source),
    text,
  };
}
