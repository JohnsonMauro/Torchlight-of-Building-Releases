import { cleanGameText } from "../text/percentage-text.js";
import { curseTakenEffect, DEDICATED_CURSE_MODELS, NO_DUMMY_EFFECT_CURSES } from "./curse-effects.js";

// Skills that gear and pact lines trigger ("Triggers Lv. 20 Secret Origin Unleash every 6 s", "When moving, triggers a Lv. 20
// Split Shot every 0.6 s", "Triggers Lv. 20 Ice Shot if you have inflicted Frostbite recently. Interval: 0.3s"). Gear-pact
// batch chunk 4. Each becomes a skill-hit stream at the line's level, one use per interval the text states, while its event
// holds on the dummy:
//   - "every T s": always;
//   - "when moving" / "while standing still": the movement group (exclusive; the planner compares both);
//   - "when hitting an enemy" / "on hit": a hit lands far more often than once per interval (provisional);
//   - "if you have inflicted Frostbite recently": Frostbite from the enemy-ailment model;
//   - "when inflicting Paralysis": Paralysis from packages/engine/src/combat-states.js (held on hit, or Grudge / Cripple / Witch Antelope's
//     scheduled Paralysis since 2026-10-14).
// The interval is the text's ("every T s" or "Interval / Cooldown: T s"); a line without one has no cadence and is Not
// modeled. Triggers on Mobility use, on starting to move, on defeat or with a chance are not modeled here (status with reason).
const EVENTS = [
  [/^every ([\d.]+) ?s$/i, (m) => ({ event: "always", interval: Number(m[1]) })],
  [/^when moving$/i, () => ({ event: "moving" })],
  [/^while standing still$/i, () => ({ event: "standingStill" })],
  [/^(?:when hitting an enemy|on hit|upon hit)$/i, () => ({ event: "hit" })],
  [/^if you have inflicted Frostbite recently$/i, () => ({ event: "frostbite" })],
  [/^when inflicting Paralysis$/i, () => ({ event: "paralysis" })],
];
const LINE =
  /^Triggers? (?:a )?Lv\. (\d+) (.+?) (every [\d.]+ ?s|when moving|while standing still|when hitting an enemy|on hit|upon hit|if you have inflicted Frostbite recently|when inflicting Paralysis)\.?(?: (?:Interval|Cooldown): ([\d.]+) ?s\.?)?$/i;
const MOVING_EVERY = /^When moving, triggers (?:a )?Lv\. (\d+) (.+?) every ([\d.]+) ?s\.?$/i;
const OTHER_TRIGGER = /^(?:\+?[\d.]+% chance to )?Triggers? (?:a )?Lv\. \d+ /i;

/** The trigger a line describes: { name, level, event, intervalSeconds } | { unmodeled: reason } | null. */
export function parseItemTrigger(text) {
  const clean = cleanGameText(String(text ?? ""));
  let match = clean.match(MOVING_EVERY);
  if (match)
    return { name: match[2].trim(), level: Number(match[1]), event: "moving", intervalSeconds: Number(match[3]) };
  match = clean.match(LINE);
  if (match) {
    if (/ Curse$/i.test(match[2])) return null; // curse triggers belong to packages/engine/src/skills/curse-effects.js
    const eventRule = EVENTS.find(([pattern]) => pattern.test(match[3]));
    const event = eventRule[1](match[3].match(eventRule[0]));
    const intervalSeconds = event.interval ?? (match[4] ? Number(match[4]) : null);
    if (!(intervalSeconds > 0)) return { unmodeled: "the line states no interval, so the trigger has no cadence" };
    return { name: match[2].trim(), level: Number(match[1]), event: event.event, intervalSeconds };
  }
  // A curse named without the word "Curse" (Dual Kismet: Spindle, "Triggers Lv. 25 Corruption upon inflicting damage. Cooldown:
  // 0.2s") is a gear-triggered curse too (packages/engine/src/build-mechanics.js; pact scripted-effects batch 2026-10-13).
  const namedCurse = clean.match(/^Triggers? Lv\. \d+ ([\w']+(?: [\w']+)*?) upon inflicting damage\b/i)?.[1];
  if (
    namedCurse &&
    (curseTakenEffect(namedCurse) || DEDICATED_CURSE_MODELS.has(namedCurse) || NO_DUMMY_EFFECT_CURSES[namedCurse])
  )
    return null;
  if (OTHER_TRIGGER.test(clean) && !/ Curse\b/i.test(clean)) {
    if (/Mobility Skill|starting to move/i.test(clean))
      return {
        notOnDummy: "the event (a Mobility Skill, starting to move) does not happen in a stationary dummy test",
      };
    if (/defeat|kill/i.test(clean)) return { notOnDummy: "the training dummy is never defeated" };
    return { unmodeled: "a chance-based or other trigger event has no rate model" };
  }
  return null;
}

/** Whether the event holds in this build's state: { active, reason }. */
export function itemTriggerEvent(trigger, state = {}) {
  switch (trigger.event) {
    case "always":
      return { active: true, reason: `every ${trigger.intervalSeconds} s` };
    case "moving":
      return state.moving !== false
        ? { active: true, reason: "moving (movement group: compared with standing still)" }
        : { active: false, reason: "standing still" };
    case "standingStill":
      return state.moving === false
        ? { active: true, reason: "standing still (movement group)" }
        : { active: false, reason: "moving (movement group)" };
    case "hit":
      return state.anyHit
        ? { active: true, reason: "the build hits more often than once per interval (provisional)" }
        : { active: false, reason: "no modeled hit" };
    case "frostbite":
      return (state.enemyAilments || []).includes("Frostbite")
        ? { active: true, reason: "Frostbite on the dummy (enemy-ailment model)" }
        : { active: false, reason: "the build inflicts no Frostbite" };
    // Paralysis held by an on-hit source (debuffs.paralysis), or inflicted on its own clock (2026-10-14): Grudge's / Cripple's
    // chance Paralysis on a supported skill's hits and Witch Antelope's turns (`scheduledParalysis`: their labels).
    case "paralysis": {
      if (state.paralysis) return { active: true, reason: "Paralysis on the dummy (combat states)" };
      const scheduled = (state.scheduledParalysis || []).filter(Boolean);
      return scheduled.length
        ? {
            active: true,
            reason: `Paralysis inflicted by ${scheduled.join(", ")} (combat states; each inflicting can trigger it, at most once per interval)`,
          }
        : { active: false, reason: "the build inflicts no Paralysis" };
    }
    default:
      return { active: false, reason: "unknown event" };
  }
}
