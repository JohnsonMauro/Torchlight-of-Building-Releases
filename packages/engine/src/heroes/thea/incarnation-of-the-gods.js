// Thea – Incarnation of the Gods (hero trait audit batch B7, 2026-10-19; §6 Q-H9): the Divine Realm, the player's position and the
// dummy deemed at Low Life. The provisional readings are listed in packages/engine/src/heroes/thea/traits.js.

import {
  INSIDE_REALM_CONDITION,
  THEA_PATTERNS,
  round,
  pct,
  matchesOf,
  firstOf,
  cycleRead,
  inCalc,
  inactive,
  neutral,
  notOnDummy,
  notModeled,
  signed,
  cleanThea,
} from "./trait-lines.js";

// The Divine Realm's cast and the player's position (Incarnation of the Gods).
export function realmBasics(lines, requestedConditions = {}) {
  const P = THEA_PATTERNS;
  const cast = firstOf(lines, P.realmCast);
  const prepares = matchesOf(lines, P.prepare).map(({ line, match }) => ({
    source: line.source,
    everySeconds: Number(match[1]),
  }));
  const pressed = requestedConditions.traitSkillOnCooldown !== false;
  const active = Boolean(cast) && (pressed || prepares.length > 0);
  const durationSeconds = cast ? Number(cast.match[1]) : 8,
    cooldownSeconds = cast ? Number(cast.match[2]) : 8;
  const uptime = active ? Math.min(1, durationSeconds / cooldownSeconds) : 0;
  const inside = active && requestedConditions[INSIDE_REALM_CONDITION] === true;
  return {
    cast: Boolean(cast),
    pressed,
    prepares,
    active,
    durationSeconds,
    cooldownSeconds,
    uptime,
    inside,
    outside: !inside,
  };
}

export function incarnationState(lines, state, requestedConditions, facts) {
  const P = THEA_PATTERNS;
  const realm = realmBasics(lines, requestedConditions);
  const B = state.blessings;
  const total = B.Focus.stacks + B.Agility.stacks + B.Tenacity.stacks;
  const deemLine = firstOf(lines, P.deem);
  const deem =
    deemLine && state.anyDamage
      ? {
          seconds: Number(deemLine.match[1]),
          cooldownSeconds: Number(deemLine.match[2]),
          share: round(Math.min(1, Number(deemLine.match[1]) / Number(deemLine.match[2]))),
          source: deemLine.line.source,
        }
      : null;
  const tenaciousLine = firstOf(lines, P.tenacious),
    agileLine = firstOf(lines, P.agile);
  const tenacious = tenaciousLine
    ? (() => {
        const [, at, flat, upper, per, cap] = tenaciousLine.match.map(Number);
        const stacks = B.Tenacity.stacks;
        const mode = stacks >= upper ? "lowLife" : stacks >= at ? "flat" : "none";
        const lowLifeShare = deem?.share || 0;
        const lowLifePercent = round(per * Math.min(cap, stacks));
        return {
          at,
          flat,
          upper,
          per,
          cap,
          stacks,
          mode,
          lowLifePercent,
          lowLifeShare,
          percent: mode === "flat" ? flat : mode === "lowLife" ? round(lowLifePercent * lowLifeShare) : 0,
          source: tenaciousLine.line.source,
        };
      })()
    : null;
  const agile = agileLine
    ? (() => {
        const [, at, speed, upper, per, cap] = agileLine.match.map(Number);
        const stacks = B.Agility.stacks;
        const mode = stacks >= upper ? "lowLife" : stacks >= at ? "speed" : "none";
        const lowLife = facts.life === "low";
        return {
          at,
          speed,
          upper,
          per,
          cap,
          stacks,
          mode,
          lowLife,
          speedPercent: mode === "speed" ? speed : 0,
          damagePercent: mode === "lowLife" && lowLife ? round(per * Math.min(cap, stacks)) : 0,
          source: agileLine.line.source,
        };
      })()
    : null;
  if (deem) deem.readers = (facts.enemyLowLifeLines || 0) + (tenacious?.mode === "lowLife" ? 1 : 0);
  return {
    realm,
    total: round(total),
    deem,
    tenacious,
    agile,
    crossing: Boolean(firstOf(lines, P.crossing)),
    convert: state.thea?.convert || null,
    transfer: state.thea?.transfer || null,
  };
}

export function incarnationRead(key, text, state) {
  const n = state.incarnation,
    realm = n.realm,
    B = state.blessings;
  const where = realm.inside
    ? 'you stand inside the Divine Realm (the "Divine Realm position" choice)'
    : 'you stand outside the Divine Realm (the "Divine Realm position" choice: best case unless inside deals more)';
  const noRealm = !realm.cast
    ? "the Divine Realm line is not in the build"
    : "the Divine Realm is not active (the Trait Skill switch is off and no trait Prepares it)";
  const outsideOnly = realm.inside ? `${where}` : "";
  switch (key) {
    case "cycle":
      return cycleRead(state);
    case "realmCast":
      return realm.active
        ? inCalc(
            `the Divine Realm on the dummy from t = 0, ${realm.durationSeconds} s every ${realm.cooldownSeconds} s: uptime ${pct(realm.uptime)}% (${realm.pressed ? "pressed on cooldown: best case" : "Prepared by a trait"}); ${where}`,
          )
        : inactive(noRealm);
    case "realmDamage": {
      const match = cleanThea(text).match(THEA_PATTERNS.realmDamage);
      if (!realm.active) return inactive(noRealm);
      const stacks = Math.min(Number(match[2]), n.total),
        value = round(Number(match[1]) * stacks * realm.uptime),
        body = `+${value}% additional damage`;
      return value
        ? inCalc(
            `${round(n.total)} Blessing stacks (up to ${match[2]}) × ${match[1]}% while the Divine Realm is active = ${body} (the keyword's Full Life / Low Life targets are not applied: provisional)`,
            { bodies: [body] },
          )
        : inactive("no Blessing stacks");
    }
    case "convertOutside":
      return realm.inside
        ? inactive(where)
        : inCalc(
            `outside the Divine Realm: Tenacity converts to Agility (Agility ${round(B.Agility.stacks)} of ${B.Agility.maxStacks}, Tenacity 0)`,
            { group: "theaRealm" },
          );
    case "convertInside":
      return realm.inside
        ? inCalc(
            `within the Divine Realm: Agility converts to Tenacity (Tenacity ${round(B.Tenacity.stacks)} of ${B.Tenacity.maxStacks}, Agility 0)`,
            { group: "theaRealm" },
          )
        : inactive(realm.active ? where : noRealm);
    case "transferOutside":
    case "transferInside": {
      const outside = key === "transferOutside";
      if (outside === realm.inside) return inactive(realm.active || outside ? where : noRealm);
      const change = n.transfer?.change || 0;
      return change
        ? inCalc(
            `${outside ? "Tenacity" : "Agility"} Blessing's max-stack change (${signed(change)}) also applies to ${outside ? "Agility" : "Tenacity"} Blessing: max ${outside ? B.Agility.maxStacks : B.Tenacity.maxStacks}`,
            { group: "theaRealm" },
          )
        : inactive(`${outside ? "Tenacity" : "Agility"} Blessing's max stacks are unchanged`);
    }
    case "realmMoon": {
      const match = cleanThea(text).match(THEA_PATTERNS.realmMoon);
      const stacks = Math.min(Number(match[2]), B.Tenacity.stacks + B.Agility.stacks),
        value = round(Number(match[1]) * stacks),
        body = `+${value}% additional damage`;
      return value
        ? inCalc(
            `${round(B.Tenacity.stacks + B.Agility.stacks)} Tenacity + Agility stacks (up to ${match[2]}) × ${match[1]}% = ${body}`,
            { bodies: [body] },
          )
        : inactive("no Tenacity or Agility stacks");
    }
    case "realmArea":
      return neutral("Divine Realm Skill Area: the Realm is cast on the dummy");
    case "prepare":
      return !realm.cast
        ? inactive(noRealm)
        : realm.pressed
          ? neutral(
              "the Trait Skill best case already holds the Divine Realm (pressed on cooldown); Preparation keeps it with the switch off",
            )
          : inCalc(
              "Prepares the Divine Realm (TLIDB Preparation: cast when ready, else right after its cooldown): held at uptime 1 without pressing",
            );
    case "tenacious": {
      const t = n.tenacious;
      if (!t || t.mode === "none")
        return inactive(
          `Tenacity Blessing ${round(t?.stacks ?? B.Tenacity.stacks)} stacks: below ${t?.at ?? 6}${realm.inside ? "" : " (outside the Divine Realm Tenacity converts to Agility)"}`,
        );
      if (t.mode === "flat")
        return inCalc(`Tenacity Blessing ${t.stacks} ≥ ${t.at}: +${t.flat}% additional damage`, {
          bodies: [`+${t.flat}% additional damage`],
        });
      const body = `+${t.percent}% additional damage`;
      return t.percent
        ? inCalc(
            `Tenacity Blessing ${t.stacks} ≥ ${t.upper}: +${t.per}% × ${Math.min(t.cap, t.stacks)} = +${t.lowLifePercent}% against enemies at Low Life; the dummy is deemed at Low Life ${pct(t.lowLifeShare)}% of the time (Incarnation; Q-H9) = ${body}`,
            {
              bodies: [body],
              timed: n.deem
                ? [
                    {
                      id: "theaLowLifeTenacious",
                      label: "Tenacious Divinity: the dummy deemed at Low Life",
                      target: "enemy",
                      toggle: false,
                      enabled: true,
                      active: true,
                      parts: [
                        {
                          type: null,
                          reach: "all",
                          percent: t.lowLifePercent,
                          schedule: {
                            kind: "periodic",
                            durationSeconds: n.deem.seconds,
                            periodSeconds: n.deem.cooldownSeconds,
                            startSeconds: 0,
                          },
                        },
                      ],
                    },
                  ]
                : [],
            },
          )
        : inactive(
            `Tenacity Blessing ${t.stacks} ≥ ${t.upper}: the bonus needs an enemy at Low Life, and the dummy never loses Life (Q-H9; Incarnation would deem it)`,
          );
    }
    case "agile": {
      const a = n.agile;
      if (!a || a.mode === "none")
        return inactive(
          `Agility Blessing ${round(a?.stacks ?? B.Agility.stacks)} stacks: below ${a?.at ?? 6}${realm.inside ? " (inside the Divine Realm Agility converts to Tenacity)" : ""}`,
        );
      if (a.mode === "speed") {
        const body = `+${a.speed}% additional Attack and Cast Speed`;
        return inCalc(`Agility Blessing ${a.stacks} ≥ ${a.at}: ${body}`, { bodies: [body] });
      }
      const body = `+${a.damagePercent}% additional damage`;
      return a.damagePercent
        ? inCalc(
            `Agility Blessing ${a.stacks} ≥ ${a.upper} and you are at Low Life: +${a.per}% × ${Math.min(a.cap, a.stacks)} = ${body}`,
            { bodies: [body], group: "life" },
          )
        : inactive(
            `Agility Blessing ${a.stacks} ≥ ${a.upper}: the effect needs you at Low Life (the Life group compares Low Life)`,
            { group: "life" },
          );
    }
    case "mightSpeed":
    case "mightDamage": {
      if (realm.inside) return inactive(where);
      const match = cleanThea(text).match(THEA_PATTERNS[key]);
      const value = round(Math.min(Number(match[2]), Number(match[1]) * n.total)),
        body = key === "mightSpeed" ? `+${value}% additional Attack and Cast Speed` : `+${value}% additional damage`;
      return value
        ? inCalc(
            `outside the Divine Realm: ${round(n.total)} Blessing stacks × ${match[1]}% (up to ${match[2]}%) = ${body}`,
            { bodies: [body], group: "theaRealm" },
          )
        : inactive("no Blessing stacks");
    }
    case "mightTaken":
      return neutral("damage you take: the dummy never attacks");
    case "powerInside": {
      const value = Number(cleanThea(text).match(THEA_PATTERNS.powerInside)[1]),
        body = `+${value}% additional damage`;
      return realm.inside
        ? inCalc(`you and the dummy are inside the Divine Realm: ${body}`, { bodies: [body], group: "theaRealm" })
        : inactive(realm.active ? where : noRealm);
    }
    case "powerSpeed": {
      const value = Number(cleanThea(text).match(THEA_PATTERNS.powerSpeed)[1]),
        body = `+${value}% Attack and Cast Speed`;
      return realm.active && !realm.inside
        ? inCalc(`outside the active Divine Realm: ${body}`, { bodies: [body], group: "theaRealm" })
        : inactive(!realm.active ? noRealm : where);
    }
    case "powerKill":
      return notOnDummy("needs defeated enemies (the dummy never dies); Movement Speed only");
    case "powerRefresh":
      return neutral("the dummy is always in the Divine Realm (cast on it)");
    case "deem": {
      if (!n.deem) return inactive("the build deals no modeled damage");
      const deemText = `the dummy is deemed at Low Life ${n.deem.seconds} s of every ${n.deem.cooldownSeconds} s from the first hit (${pct(n.deem.share)}%; Q-H9)`;
      return !n.deem.share
        ? inactive("no share")
        : n.deem.readers
          ? inCalc(
              `${deemText}: read by "enemies at Low Life" lines${n.tenacious?.mode === "lowLife" ? " (Tenacious Divinity)" : ""}`,
            )
          : neutral(`${deemText}, but no line in the build reads an enemy at Low Life`);
    }
    case "realmEnemy": {
      const value = Number(cleanThea(text).match(THEA_PATTERNS.realmEnemy)[1]),
        body = `+${round(value * realm.uptime)}% additional damage`;
      return realm.active
        ? inCalc(`the dummy is in the Divine Realm (cast on it): ${body}`, { bodies: [body] })
        : inactive(noRealm);
    }
    case "crossing":
      return realm.inside
        ? inactive(where)
        : inCalc(
            `outside the Divine Realm: +${cleanThea(text).match(THEA_PATTERNS.crossing)[1]} to max stacks of every Blessing (Tenacity's also reaches Agility): Focus ${B.Focus.maxStacks}, Agility ${B.Agility.maxStacks}, Tenacity ${B.Tenacity.maxStacks}`,
            { group: "theaRealm" },
          );
    default:
      return notModeled(outsideOnly || "this Incarnation of the Gods clause is not read");
  }
}
