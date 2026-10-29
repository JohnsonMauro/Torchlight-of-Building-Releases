// Rehan – Anger (hero trait audit batch B10, 2026-10-19): Burst (and Burst Blast), its cadence and additional damage, Tunnel Vision.
// The provisional readings are listed in packages/engine/src/heroes/rehan/traits.js.

import { buildSkillHitProfile } from "../../skills/skill-hit-profiles.js";
import { KEYWORDS, TUNNEL_VISION_SWITCH, EPS, round, pct, fmt, L } from "./trait-lines.js";
/** Burst's hit profile (packages/engine/src/skills/skill-hit-profiles.js builder): the attack row (340% Weapon Damage) or, with Hero's Resourcefulness, Burst Blast. */
export function burstProfile({ blast = false } = {}) {
  const levels = (row) => Object.fromEntries(Array.from({ length: 20 }, (_, index) => [String(index + 1), row]));
  const keyword = blast ? KEYWORDS.burstBlast : KEYWORDS.burst;
  const definition = blast
    ? {
        name: "Burst Blast",
        delivery: "spell-area",
        components: [
          {
            key: "blast",
            label: "Burst Blast",
            groupId: keyword.gameRow,
            group: {
              id: keyword.gameRow,
              synthetic: `game row ${keyword.gameRow}`,
              levels: levels({
                kind: "hit",
                effectiveness: keyword.effectiveness,
                entries: [{ type: keyword.type, min: keyword.min, max: keyword.max }],
              }),
            },
            perUse: 1,
            basis: "text",
            note: "one area hit within 3 m per trigger (the dummy inside: best case)",
          },
        ],
        notes: [
          `Burst Blast (hero trait audit B10): ${keyword.source}. Its single row is read at every level; levels add +10% additional damage each (multiplies).`,
        ],
      }
    : {
        name: "Burst",
        delivery: "attack-melee",
        weaponScaling: { baseTypes: ["Physical"], restriction: null },
        components: [
          {
            key: "burst",
            label: "Burst",
            groupId: keyword.gameRow,
            group: {
              id: keyword.gameRow,
              synthetic: `game row ${keyword.gameRow}`,
              levels: levels({ kind: "hit", effectiveness: keyword.weaponPercent, entries: [] }),
            },
            perUse: 1,
            basis: "text",
            note: "one area explosion within 3 m per trigger (the dummy inside: best case)",
          },
        ],
        notes: [
          `Burst (hero trait audit B10): ${keyword.source}. Its single row is read at every level; levels add +10% additional damage each (multiplies).`,
        ],
      };
  const profile = buildSkillHitProfile(definition);
  const tags = [...keyword.tags];
  return Object.freeze({
    ...profile,
    tags,
    spell: blast,
    mainStats: tags.filter((tag) => ["Strength", "Dexterity", "Intelligence"].includes(tag)),
    useModel: {
      kind: "rate",
      usesPerSecond: 0,
      firstUseSeconds: null,
      note: "triggered by the trait (hero trait audit B10)",
    },
    spellBurstAllowed: blast,
    sources: {
      tlidb: blast ? "https://tlidb.com/en/Burst_Blast" : "https://tlidb.com/en/Burst",
      gameData: `config_skill_damage group ${keyword.gameRow} (one Lv. 1 row; SS14 flat extraction 2026-10-15)`,
      timing: "triggered by Anger (no use time)",
    },
  });
}

/** Burst's triggers in Berserk (Righteous Fury's cost and Frenzy Furious's gain read them), or no Burst without a trigger line. */
export function burstState({ one, has, all, lines, inputs, berserkLevel, inside, fact, measured, skillArea }) {
  const trigger = one("burstTrigger"),
    roar = one("roarTrigger");
  const moon = one("moonCdr"),
    rampaging = one("rampaging"),
    levelLine = one("burstPerLevel"),
    areaLine = one("areaToBurst");
  const characterLevel = Number(inputs.characterLevel?.level) || 100;
  const burst =
    trigger || roar
      ? {
          blast: has("blast"),
          onHit: has("onHit"),
          base: Boolean(trigger),
          cooldownSeconds: Number((trigger || roar).match[1]),
          roar: roar ? { cooldownSeconds: Number(roar.match[1]) } : null,
          moonPercent: moon ? (Number(moon.match[1]) * berserkLevel) / Number(moon.match[2]) : 0,
          rampagingShare: rampaging ? Number(rampaging.match[1]) / 100 : 0,
          perLevel: levelLine
            ? {
                percent: Number(levelLine.match[1]),
                per: Number(levelLine.match[2]),
                level: characterLevel,
                stored: Boolean(inputs.characterLevel?.stored),
                value: round(
                  Number(levelLine.match[1]) * Math.floor(characterLevel / Number(levelLine.match[2]) + EPS),
                ),
              }
            : null,
          additional: [...all(lines, "burstAdditional"), ...all(lines, "roarPenalty")].map((item) => ({
            source: item.line.source,
            text: item.line.clean,
            value: Number(item.match[1]),
          })),
          area: areaLine
            ? {
                per: Number(areaLine.match[1]),
                gain: Number(areaLine.match[2]),
                cap: Number(areaLine.match[3]),
                skillArea: round(skillArea),
                value: Math.min(
                  Number(areaLine.match[3]),
                  Math.floor(skillArea / Number(areaLine.match[1]) + EPS) * Number(areaLine.match[2]),
                ),
              }
            : null,
          events: { attack: inside.attack, attackCrit: inside.attackCrit, hits: inside.hits },
          critChance: round(Math.max(0, Math.min(1, fact("burstCritChance")))),
          measured,
        }
      : null;
  const burstRateIn = burst ? burstCadence({ burst, rage: { uptime: 1 } }, inputs.attackSpeed || null).inBerserk : 0;
  if (burst) burst.burstRateIn = round(burstRateIn);
  const burstCrit = burst ? burst.critChance : 0;
  return { trigger, roar, burst, burstRateIn, burstCrit };
}

/** Tunnel Vision's penalty, or null without its line. */
export function tunnelState(one, requestedConditions) {
  const tunnelLine = one("tunnelPenalty");
  const tunnel = tunnelLine
    ? {
        percent: Number(tunnelLine.match[1]),
        on: requestedConditions[TUNNEL_VISION_SWITCH] !== false,
        source: tunnelLine.line.source,
      }
    : null;
  return tunnel;
}

/** Burst's cooldown and trigger rate (Rampaging reads the weapon model's Attack Speed bonuses). */
export function burstCadence(state, attackSpeed = null) {
  const burst = state?.burst;
  if (!burst) return null;
  const share = burst.rampagingShare || 0;
  const increased = share * Math.max(0, Number(attackSpeed?.increasedPercent) || 0);
  const additionalFactor = share
    ? (attackSpeed?.sources || [])
        .filter((line) => line.additional && Number(line.value))
        .reduce((product, line) => product * Math.max(0, 1 + (share * Number(line.value)) / 100), 1)
    : 1;
  const cdrPercent = burst.moonPercent + increased;
  const events = burst.onHit ? burst.events.hits : burst.events.attack;
  const critEvents = burst.events.attackCrit;
  const measured = burst.measured;
  const fromEvents = (rate, cd) => (!measured ? 1 / cd : rate > EPS ? 1 / Math.max(1 / rate, cd) : 0);
  // The trigger rates for a Cooldown Recovery Speed (the build's, or one part left out: the badges' leave-one-out reading).
  const ratesFor = (percent, additional) => {
    const factor = Math.max(EPS, 1 + percent / 100) * additional;
    const cooldown = burst.cooldownSeconds / factor,
      roarCooldown = burst.roar ? burst.roar.cooldownSeconds / factor : null;
    const hitRate = burst.base ? fromEvents(events, cooldown) : 0,
      roarRate = burst.roar ? fromEvents(critEvents, roarCooldown) : 0;
    return { cooldown, roarCooldown, hitRate, roarRate, inBerserk: hitRate + roarRate };
  };
  const { cooldown, roarCooldown, hitRate, roarRate, inBerserk } = ratesFor(cdrPercent, additionalFactor);
  const binds =
    !measured ||
    (events > EPS && 1 / events < cooldown - EPS) ||
    (Boolean(burst.roar) && critEvents > EPS && 1 / critEvents < roarCooldown - EPS);
  const moonMatters =
    burst.moonPercent > 0 && Math.abs(ratesFor(increased, additionalFactor).inBerserk - inBerserk) > EPS;
  const rampagingMatters = share > 0 && Math.abs(ratesFor(burst.moonPercent, 1).inBerserk - inBerserk) > EPS;
  const uptime = state.rage.uptime;
  return {
    cooldownSeconds: round(cooldown),
    baseCooldownSeconds: burst.cooldownSeconds,
    cdrPercent: round(cdrPercent),
    moonPercent: round(burst.moonPercent),
    rampagingIncreased: round(increased),
    rampagingAdditionalFactor: round(additionalFactor),
    eventsPerSecond: round(events),
    eventKind: burst.onHit ? "uses of every hitting skill" : "Attack Skill uses",
    hitRate: round(hitRate),
    roarRate: round(roarRate),
    roarCooldownSeconds: roarCooldown === null ? null : round(roarCooldown),
    critEventsPerSecond: round(critEvents),
    binds,
    moonMatters,
    rampagingMatters,
    inBerserk: round(inBerserk),
    usesPerSecond: round(inBerserk * uptime),
    uptime,
    measured,
  };
}

/** The Burst source's additional damage lines (packages/engine/src/planner.js heroEffects.additional) with its level bonus. */
export function burstAdditionalLines(state, { levels = 0 } = {}) {
  const burst = state?.burst;
  if (!burst) return [];
  const lines = [];
  if (burst.perLevel?.value)
    lines.push({
      source: "Hero trait: Anger",
      text: `+${burst.perLevel.percent}% additional Burst Damage per ${burst.perLevel.per} level × character level ${burst.perLevel.level}${burst.perLevel.stored ? "" : " (not stored: the default 100)"} = +${burst.perLevel.value}%`,
      value: burst.perLevel.value,
    });
  for (const line of burst.additional) lines.push({ source: line.source, text: line.text, value: line.value });
  if (burst.area?.value)
    lines.push({
      source: "Hero trait: Uncontrolled Anger",
      text: `For every +${burst.area.per}% Skill Area, +${burst.area.gain}% additional Burst Damage: +${burst.area.skillArea}% Skill Area → +${burst.area.value}% (cap ${burst.area.cap}%)`,
      value: burst.area.value,
    });
  if (levels > 0)
    lines.push({
      source: "Burst: Skill Level",
      text: `+${levels} Skill Level(s) × +10% additional damage (multiplies, TLIDB Burst keyword) = +${round((1.1 ** levels - 1) * 100)}%`,
      value: round((1.1 ** levels - 1) * 100),
    });
  return lines;
}

/** The badge of a Burst / Tunnel Vision clause, or null when the clause is another mechanic's. */
export function angerRead(key, state, { cycle, pending, measured, burstUses, burstDealt, burstIdle }) {
  const { rage, burst, tunnel, cadence } = state;
  switch (key) {
    // ---- Burst ----
    case "burstTrigger":
    case "roarTrigger":
    case "blast":
      if (burstIdle) return L("Inactive", burstIdle);
      if (key === "roarTrigger")
        return cadence.roarRate > 0
          ? L(
              "In calc",
              `+${fmt(cadence.roarRate)} Bursts/s in Berserk on attack Critical Strikes (${fmt(cadence.critEventsPerSecond)}/s), its own ${fmt(cadence.roarCooldownSeconds)} s cooldown (provisional)`,
            )
          : L("Inactive", "no attack Critical Strike");
      if (key === "blast")
        return L(
          "In calc",
          `Burst Blast (${KEYWORDS.burstBlast.min}–${KEYWORDS.burstBlast.max} Spell Physical at ${KEYWORDS.burstBlast.effectiveness}%, game row ${KEYWORDS.burstBlast.gameRow}) replaces Burst and can activate Spell Burst (provisional)`,
        );
      return L(
        "In calc",
        `${fmt(burstUses)} Bursts/s: 1 ÷ max(1 ÷ ${fmt(cadence.eventsPerSecond)} ${cadence.eventKind}/s, cooldown ${fmt(cadence.cooldownSeconds)} s) in Berserk × ${pct(rage.uptime)}% uptime (provisional)${pending}`,
      );
    case "onHit": {
      if (burstIdle) return L("Inactive", burstIdle);
      const hits = Number(state.facts?.hitUses) || 0,
        attacks = Number(state.facts?.attackUses) || 0;
      return measured && hits > attacks + EPS
        ? L("In calc", `Burst triggers on the hits of every skill (${fmt(hits)} uses/s; Attacks ${fmt(attacks)}/s)`)
        : L("Inactive", `every skill that hits here is an Attack, so the change adds no trigger${pending}`);
    }
    case "burstPerLevel":
    case "burstAdditional":
    case "roarPenalty":
    case "areaToBurst":
      if (burstIdle) return L("Inactive", burstIdle);
      if (key === "areaToBurst")
        return burst.area?.value > 0
          ? L(
              "In calc",
              `+${burst.area.skillArea}% Skill Area → +${burst.area.value}% additional Burst Damage (cap ${burst.area.cap}%)`,
            )
          : L("Inactive", "no Skill Area bonus");
      if (key === "burstPerLevel")
        return L(
          "In calc",
          `× character level ${burst.perLevel.level}${burst.perLevel.stored ? "" : " (not stored: the default 100)"} = +${burst.perLevel.value}% additional Burst Damage ("per 1 levels" read as the character level: provisional)`,
        );
      return L("In calc", "on Burst's hits");
    case "moonCdr":
    case "rampaging":
      if (burstIdle) return L("Inactive", burstIdle);
      if (key === "rampaging" && !(cadence.rampagingIncreased > 0 || cadence.rampagingAdditionalFactor > 1))
        return L("Inactive", "no Attack Speed bonus");
      if (measured && !(key === "moonCdr" ? cadence.moonMatters : cadence.rampagingMatters))
        return L(
          "Inactive",
          `the attacks trigger Burst every ${fmt(1 / Math.max(EPS, cadence.eventsPerSecond))} s, slower than its cooldown even without this line (${fmt(cadence.cooldownSeconds)} s with it), so it changes nothing`,
        );
      return L(
        "In calc",
        `Burst cooldown ${fmt(cadence.baseCooldownSeconds)} s ÷ (1 + ${fmt(cadence.cdrPercent)}%)${cadence.rampagingAdditionalFactor > 1 ? ` ÷ ${fmt(cadence.rampagingAdditionalFactor)}` : ""} = ${fmt(cadence.cooldownSeconds)} s (${cadence.binds ? "the cooldown binds" : "Burst now follows every attack: without the line the cooldown binds"}; Artificial Moon at ${rage.berserkLevel} Rage${cadence.rampagingIncreased ? `, Rampaging +${fmt(cadence.rampagingIncreased)}%` : ""}; provisional)${pending}`,
      );
    case "furyCost":
      if (burstIdle) return L("Inactive", burstIdle);
      return rage.matters.furyCost
        ? L("In calc", `${fmt(rage.furyCostRate)} Rage/s consumed by Bursts (${cycle})`)
        : L(
            "No DPS effect",
            `Rage stays at max: the ${fmt(rage.natural)} Rage/s Righteous Fury generates outweighs the ${fmt(rage.furyCostRate)} Rage/s the Bursts cost`,
          );
    case "frenzyGain":
      if (burstIdle) return L("Inactive", burstIdle);
      if (!(rage.frenzyRate > EPS))
        return L(
          "Inactive",
          measured ? "Burst lands no Critical Strike" : "Burst's crits are measured by the hit pass",
        );
      return rage.matters.frenzy
        ? L(
            "In calc",
            `+${fmt(rage.frenzyRate)} Rage/s in Berserk from Burst Critical Strikes (${pct(burst.critChance)}% crit; ${cycle})`,
          )
        : L("No DPS effect", "Berserk is permanent without it (Rage stays at max)");
    case "tunnelPenalty":
      if (!tunnel) return L("Inactive", "Tunnel Vision is not in the build");
      return tunnel.on
        ? L(
            "In calc",
            `applied (Q-H15, provisional): -${tunnel.percent}% additional damage on every hit, damage over time and ailment except Burst's hits${burstDealt ? "" : "; Burst deals no damage here, so the build's main damage source is missing"}`,
            { bodies: [`-${tunnel.percent}% additional damage`] },
          )
        : L("Inactive", "switched off (best-case assumptions): the non-Burst skills keep their damage");
    case "burstArea":
      return L("No DPS effect", "Burst's area: the dummy stands within 3 m (best case)");
    default:
      return null;
  }
}
