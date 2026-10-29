// Moto – Charge Calling (hero trait audit batch B6, 2026-10-19; research/hero-traits-audit-2026-10-19.md §5 B6, §8 B6):
// Self-Destruct Protocol on the Synthetic Troops. Pure; packages/engine/src/heroes/minion-heroes.js dispatches to it,
// packages/engine/src/minions/minion-damage-model.js runs the explosion loop.
//
// Provisional reading (src/app/stats/open-questions.js, shown only for the hero):
// - Charge Calling pressed on cooldown (6 s / 6 s: uptime 1; the Trait Skill switch); each summon cast during it creates 1 + Rally +
//   1 Synthetic Troop Minions that self-destruct 1 s after (115% of Base Damage, Physical Attack), at most the skill's quantity + 1
//   alive: explosions/s = min(casts/s × troops per cast, alive ÷ 1 s). Summon casts: Fuel War with War's trigger (Main Summon Skill)
//   or the player recasting the summon (its use time; a Module's 4 s cooldown). The planner keeps whichever of the troops' own
//   attacks and the explosion loop deals more (best case). Mechanical Parts: drop chance × explosions/s, picked up, "recently" = 4 s.

import { KEYWORDS, RECENTLY_SECONDS, firstOf, matchesOf, round, sumOf } from "../minion-hero-lines.js";

export const CHARGE_CALLING = "moto-charge-calling";

export const CHARGE_PATTERNS = Object.freeze({
  chargeCalling:
    /^Allows you to click the Trait Skill to gain Charge Calling for ([\d.]+) ?s\. Cooldown: ([\d.]+) ?s$/i,
  selfDestruct:
    /^During Charge Calling, Synthetic Troop Minions summoned at a time \+(\d+)\. All Synthetic Troop Minions will activate Self-Destruct Protocol and Charge at the enemy in the next ([\d.]+) ?s/i,
  selfDestructDamage: /^\+(\d+(?:\.\d+)?)% additional Self-Destruct Damage triggered by Self-Destruct Protocol$/i,
  chargeMoon:
    /^\+(\d+(?:\.\d+)?)% additional Minion Damage if any Mechanical Part is picked up recently\. \+(\d+(?:\.\d+)?)% Skill Area for Self-Destruct Protocol$/i,
  partDrop:
    /^\+(\d+(?:\.\d+)?)% chance for a Synthetic Troop Minion to drop (\d+) Mechanical Part When it initiates Self-Destruct Protocol\. Mechanical Parts last ([\d.]+) ?s$/i,
  partPickup: /^Player will automatically pick up nearby Mechanical Parts$/i,
  partDamage:
    /^\+?(\d+(?:\.\d+)?)% additional Minion Damage for each Mechanical Part picked up recently\. Stacks up to (\d+) time\(s\)$/i,
  traitSlot:
    /^Gains a Skill Slot, in which a Support Skill or Activation Medium Support Skill can be installed to support Trait Skill Charge Calling$/i,
  heroic:
    /^For every (\d+(?:\.\d+)?) Max Life and Max Energy Shield a Synthetic Troop Minion has, \+(\d+(?:\.\d+)?)% additional damage for the Self-Destruct triggered by Self-Destruct Protocol$/i,
  guerilla:
    /^\+(\d+(?:\.\d+)?)% additional Self-Destruct Protocol Charge Speed and \+(\d+(?:\.\d+)?)% additional Self-Destruct Protocol Damage for each Mechanical Part collected recently\. Stacks up to (\d+) time\(s\)$/i,
  fuelWar: /^Triggers the Main Summon Skill on the closest enemy within (\d+) ?m every ([\d.]+) ?s$/i,
  fuelWarCooldown: /^Skills triggered this way ignore the cooldown of Modularization Skills$/i,
  essentialSpeed:
    /^(\d+(?:\.\d+)?)% of the bonus and additional bonus to Minion Attack Speed is also applied to the bonus and additional bonus of Self-Destruct Protocol Damage$/i,
  perilLife: /^Adds (\d+(?:\.\d+)?)% of the player's Max Life to the Base Life of Synthetic Troop Minions$/i,
  perilShield:
    /^Adds (\d+(?:\.\d+)?)% of the player's Max Energy Shield to the Base Energy Shield of Synthetic Troop(?: Minions)?$/i,
});
const KEYS = Object.keys(CHARGE_PATTERNS);
// Peril of Synthetic Troops (revived).
const REVIVED_KEYS = ["perilLife", "perilShield"];

/** Charge Calling's state, or null without its lines. */
function state(lines, { traitPressed, stats }) {
  const M = CHARGE_PATTERNS;
  const press = firstOf(lines, M.chargeCalling),
    sd = firstOf(lines, M.selfDestruct);
  if (!press && !sd) return null;
  const drop = firstOf(lines, M.partDrop),
    part = firstOf(lines, M.partDamage),
    moon = firstOf(lines, M.chargeMoon),
    guerilla = firstOf(lines, M.guerilla);
  const heroic = firstOf(lines, M.heroic),
    fuel = firstOf(lines, M.fuelWar),
    essential = firstOf(lines, M.essentialSpeed);
  const pressed = Boolean(press && sd) && traitPressed;
  return {
    pressed,
    durationSeconds: press ? Number(press.match[1]) : 6,
    cooldownSeconds: press ? Number(press.match[2]) : 6,
    uptime: press ? Math.min(1, Number(press.match[1]) / Number(press.match[2])) : 0,
    extraPerCast: sd ? Number(sd.match[1]) : 0,
    chargeSeconds: sd ? Number(sd.match[2]) : KEYWORDS.selfDestruct.lifeSeconds,
    additional: matchesOf(lines, M.selfDestructDamage).map(({ line, match }) => ({
      source: line.source,
      value: Number(match[1]) * (line.multiplier ?? 1),
      text: `+${match[1]}% additional Self-Destruct Damage (Charge Calling)`,
    })),
    parts: drop
      ? {
          chancePercent: Number(drop.match[1]),
          perDrop: Number(drop.match[2]),
          lastsSeconds: Number(drop.match[3]),
          pickup: Boolean(firstOf(lines, M.partPickup)),
          perPartPercent: part ? Number(part.match[1]) : 0,
          partCap: part ? Number(part.match[2]) : 0,
          moonPercent: moon ? Number(moon.match[1]) : 0,
          guerilla: guerilla
            ? {
                speedPercent: Number(guerilla.match[1]),
                damagePercent: Number(guerilla.match[2]),
                cap: Number(guerilla.match[3]),
              }
            : null,
        }
      : null,
    moonPercent: moon ? Number(moon.match[1]) : 0,
    heroic: heroic ? { per: Number(heroic.match[1]), percent: Number(heroic.match[2]) } : null,
    fuelWar: fuel
      ? {
          meters: Number(fuel.match[1]),
          intervalSeconds: Number(fuel.match[2]),
          ignoresModuleCooldown: Boolean(firstOf(lines, M.fuelWarCooldown)),
        }
      : null,
    essentialSharePercent: essential ? Number(essential.match[1]) : 0,
    peril: {
      lifePercent: sumOf(lines, M.perilLife),
      shieldPercent: sumOf(lines, M.perilShield),
      playerLife: Number(stats.maxLife) || 0,
      playerShield: Number(stats.maxEnergyShield) || 0,
    },
    traitSlot: Boolean(firstOf(lines, M.traitSlot)),
  };
}

/** The badge of one Charge Calling clause, from the settled state and the Minions' results. */
function lineStatus(key, state, { modeled, list, pending, inCalc, inactive, neutral }) {
  const c = state.chargeCalling;
  if (!c) return inactive("no Charge Calling line in the build");
  const troops = modeled ? modeled.filter((minion) => minion.heroTraits?.selfDestruct) : [];
  const chosen = troops.filter((minion) => minion.heroTraits.selfDestruct.chosen);
  const sd = chosen[0]?.heroTraits.selfDestruct || troops[0]?.heroTraits?.selfDestruct || null;
  const none = !c.pressed
    ? "the Trait Skill switch is off: Charge Calling is never pressed"
    : !state.hasTroop
      ? "no modeled Synthetic Troop / Module Minion"
      : pending
        ? "settled after the Minion pass"
        : troops.length && sd
          ? `the troops' own attacks deal more (${round(sd.ownDps)} DPS) than the explosion loop (${round(sd.loopDps)} DPS), so the best case leaves Charge Calling unpressed`
          : "no Self-Destruct explosions";
  const loop = sd
    ? `${round(sd.rate)} explosions/s (${sd.fuel ? `Fuel War with War every ${round(sd.castInterval)} s` : `the summon recast every ${round(sd.castInterval)} s`} × ${sd.perCast} troops, at most ${sd.maxAlive} alive for ${round(sd.life)} s${sd.capped ? ": the alive cap binds" : ""}) × ${round(sd.perExplosion)} per explosion`
    : "";
  const parts = Boolean(sd && sd.partStacks > 0);
  switch (key) {
    case "chargeCalling":
    case "selfDestruct":
      return chosen.length
        ? inCalc(
            `Charge Calling held (6 s every 6 s, pressed on cooldown); ${list(chosen)} self-destruct: ${loop} (provisional)`,
          )
        : inactive(none);
    case "selfDestructDamage":
      return chosen.length
        ? inCalc(
            `+${c.additional.reduce((sum, item) => sum + item.value, 0)}% additional Self-Destruct Damage on ${loop}`,
          )
        : inactive(none);
    case "chargeMoon":
      return !chosen.length
        ? inactive(none)
        : parts
          ? inCalc(
              `a Mechanical Part is picked up recently (${round(sd.partsPerSecond)}/s): +${c.moonPercent}% additional Minion Damage on the explosions; the Skill Area part has no DPS effect`,
            )
          : inactive("no Mechanical Part drops (Unstoppable Wave's drop chance)");
    case "partDrop":
    case "partPickup":
      return !chosen.length
        ? inactive(none)
        : parts
          ? inCalc(
              `${c.parts.chancePercent}% × ${round(sd.rate)} explosions/s = ${round(sd.partsPerSecond)} Mechanical Parts/s, picked up at the dummy where they drop; ${round(sd.partStacks)} held "recently" (${RECENTLY_SECONDS} s)`,
            )
          : inactive("no Mechanical Part is picked up");
    case "partDamage":
      return !chosen.length
        ? inactive(none)
        : parts
          ? inCalc(
              `${round(sd.partStacks)} Mechanical Parts picked up recently × ${c.parts.perPartPercent}% (cap ${c.parts.partCap}) additional Minion Damage on the explosions`,
            )
          : inactive("no Mechanical Part is picked up");
    case "traitSlot":
      return state.chargeCallingSupport
        ? {
            status: "Not modeled",
            reason: `the support in Charge Calling's slot (${state.chargeCallingSupport}) is not read: Charge Calling deals no damage of its own and is held at uptime 1`,
          }
        : neutral("the slot is empty; Charge Calling deals no damage of its own and is held at uptime 1");
    case "heroic":
      return !chosen.length
        ? inactive(none)
        : sd.heroicPercent > 0
          ? inCalc(
              `Synthetic Troop Life ${round(sd.troopLife)} (5 × Base Damage${c.peril.lifePercent ? ` + ${c.peril.lifePercent}% of your Max Life` : ""})${sd.troopShield ? ` + Energy Shield ${round(sd.troopShield)}` : ""} ÷ ${c.heroic.per} = +${sd.heroicPercent}% additional Self-Destruct damage (Minion Max Life lines are not read; provisional)`,
            )
          : inactive("the troops' Life and Energy Shield give no step");
    case "guerilla":
      return !chosen.length
        ? inactive(none)
        : sd.guerillaStacks > 0
          ? inCalc(
              `${round(sd.guerillaStacks)} Mechanical Parts collected recently: +${round(c.parts.guerilla.speedPercent * sd.guerillaStacks)}% additional Charge Speed (shorter charge: ${round(sd.life)} s) and +${round(c.parts.guerilla.damagePercent * sd.guerillaStacks)}% additional Self-Destruct damage`,
            )
          : inactive("no Mechanical Part is picked up (Unstoppable Wave)");
    case "fuelWar": {
      if (!chosen.length) return inactive(none);
      if (!chosen.some((minion) => minion.heroTraits.selfDestruct.fuel))
        return inactive('the Main Skill is not a Synthetic Troop summon ("Main Summon Skill")');
      return sd.ownRate != null && sd.ownRate >= sd.rate - 1e-9
        ? neutral(`the troops' own summon already reaches the alive cap (${round(sd.rate)} explosions/s)`)
        : inCalc(`the Main Summon Skill triggered every ${round(c.fuelWar.intervalSeconds)} s: ${loop}`);
    }
    case "fuelWarCooldown":
      return !chosen.length
        ? inactive(none)
        : !chosen.some((minion) => minion.heroTraits.selfDestruct.fuel)
          ? inactive("no Fuel War with War trigger (the Main Skill is not this summon)")
          : chosen.some((minion) => minion.family === "module" && minion.heroTraits.selfDestruct.ignoresCooldown)
            ? inCalc("the triggered Module summon ignores its 4 s cooldown")
            : neutral("the summon is not a Modularization Skill (no cooldown to ignore)");
    case "essentialSpeed":
      return !chosen.length
        ? inactive(none)
        : sd.essentialIncreased > 0 || sd.essentialAdditional > 0
          ? inCalc(
              `${c.essentialSharePercent}% of the Minion Attack Speed bonuses (+${round(sd.essentialIncreased)}% increased${sd.essentialAdditional ? `, ${sd.essentialAdditional} additional line(s)` : ""}) on the Self-Destruct damage`,
            )
          : inactive("no Minion Attack Speed bonus");
    case "perilLife":
      return !chosen.length
        ? inactive(none)
        : !c.heroic
          ? neutral("the troops' Life reaches damage only through Heroic Sacrifice (not picked)")
          : c.peril.playerLife > 0
            ? inCalc(
                `+${c.peril.lifePercent}% × ${round(c.peril.playerLife)} Max Life on the troops' Base Life, read by Heroic Sacrifice`,
              )
            : inactive("no Max Life");
    case "perilShield":
      return !chosen.length
        ? inactive(none)
        : !c.heroic
          ? neutral("the troops' Energy Shield reaches damage only through Heroic Sacrifice (not picked)")
          : c.peril.playerShield > 0
            ? inCalc(
                `+${c.peril.shieldPercent}% × ${round(c.peril.playerShield)} Max Energy Shield on the troops, read by Heroic Sacrifice`,
              )
            : inactive("no Max Energy Shield");
    default:
      return null;
  }
}

/** The best-case switch of Charge Calling. */
function switches(state) {
  return state.chargeCalling
    ? [
        {
          id: "traitSkillOnCooldown",
          label: "Charge Calling pressed on cooldown (Self-Destruct Protocol)",
          enabled: state.chargeCalling.pressed,
          active: state.chargeCalling.pressed && state.hasTroop,
          summary:
            "Charge Calling held (6 s / 6 s): the Synthetic Troops self-destruct where that deals more (provisional)",
          reason: state.hasTroop ? "best-case assumption" : "no modeled Synthetic Troop / Module Minion",
        },
      ]
    : [];
}

export const chargeCalling = Object.freeze({
  id: CHARGE_CALLING,
  slot: "chargeCalling",
  patterns: CHARGE_PATTERNS,
  keys: KEYS,
  revivedKeys: REVIVED_KEYS,
  state,
  lineStatus,
  switches,
});
