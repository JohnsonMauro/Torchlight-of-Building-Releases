// Rehan – Seething Silhouette (hero trait audit batch B10, 2026-10-19): the Seething Spirit, its casts in Berserk and Starfall Wasteland.
// The provisional readings are listed in packages/engine/src/heroes/rehan/traits.js.

import { FURY_SPIRIT_OFFSET, SPIRIT_RETURN_SWITCH, EPS, round, pct, fmt, L } from "./trait-lines.js";

const spiritEligible = (main, starfall) => {
  if (!main) return { ok: false, reason: "no active Main Skill" };
  const tags = new Set(main.tags || []);
  if (starfall) {
    if (!tags.has("Ranged") || !tags.has("Projectile"))
      return {
        ok: false,
        reason: `Starfall Wasteland: the Spirit only uses Ranged Projectile Skills, and ${main.name} is not one`,
      };
    if (tags.has("Channeled") || tags.has("Parabolic"))
      return { ok: false, reason: `Starfall Wasteland: ${main.name} is a Channeled or Parabolic skill` };
    return { ok: true, reason: "" };
  }
  if (!tags.has("Melee") || !tags.has("Attack"))
    return {
      ok: false,
      reason: `the Seething Spirit casts Main Melee Attack Skills (TLIDB keyword), and ${main.name} is not one`,
    };
  if (tags.has("Mobility") || tags.has("Channeled"))
    return {
      ok: false,
      reason: `the Seething Spirit casts Non-Mobility and Non-Channeled skills (TLIDB keyword), and ${main.name} is a Mobility or Channeled skill`,
    };
  return { ok: true, reason: "" };
};

/** The Seething Spirit's casts in Berserk (Growing Anger and Hysteria read them). */
export function spiritCasts({ one, has, inputs, measured, inside }) {
  const ritual = has("ritualSpirit"),
    onslaught = one("onslaughtSpirit"),
    starfall = has("starfallRanged");
  // "Own Seething Spirit" grants the Spirit; Ritual of Offering / Fury's Onslaught say when it attacks.
  const spiritSource = !has("ownSpirit") ? null : ritual ? "ritual" : onslaught ? "onslaught" : null;
  const eligible = spiritEligible(inputs.main, starfall);
  const speedLine = one("spiritSpeed");
  const spiritSpeedFactor = speedLine ? Math.max(0, 1 - Number(speedLine.match[1]) / 100) : 1;
  const onslaughtSeconds = onslaught ? Number(onslaught.match[1]) : 0;
  const spiritPresence =
    !spiritSource || !eligible.ok
      ? 0
      : spiritSource === "ritual" || !measured
        ? 1
        : Math.min(1, onslaughtSeconds * inside.main);
  const spiritUsesIn = spiritPresence > 0 && measured ? inside.main * spiritSpeedFactor * spiritPresence : 0;
  return { starfall, spiritSource, eligible, spiritSpeedFactor, onslaughtSeconds, spiritPresence, spiritUsesIn };
}

/** The Seething Spirit's state, or null without a Spirit source. */
export function spiritState({
  one,
  onslaughtRage,
  spiritSource,
  eligible,
  inputs,
  starfall,
  spiritPresence,
  onslaughtSeconds,
  spiritSpeedFactor,
  spiritUsesIn,
  uptime,
  requestedConditions,
  spiritDoubleChance,
}) {
  const spiritDamage = one("spiritDamage");
  const furyBonus = onslaughtRage ? Number(onslaughtRage.match[1]) : 0;
  const furyOffset = onslaughtRage ? (FURY_SPIRIT_OFFSET[furyBonus] ?? null) : null;
  const projectiles = one("starfallProjectiles"),
    returning = one("starfallReturn");
  const spirit = spiritSource
    ? {
        source: spiritSource,
        eligible: eligible.ok,
        reason: eligible.reason,
        mainSetupKey: inputs.main?.setupKey || null,
        mainName: inputs.main?.name || null,
        starfall,
        presence: round(spiritPresence),
        onslaughtSeconds,
        speedFactor: round(spiritSpeedFactor),
        usesInBerserk: round(spiritUsesIn),
        active: eligible.ok && spiritPresence > 0 && uptime > 0,
        additional: [
          ...(spiritDamage
            ? [
                {
                  source: spiritDamage.line.source,
                  text: `${spiritDamage.line.clean} (Seething Spirit casts)`,
                  value: Number(spiritDamage.match[1]),
                },
              ]
            : []),
          ...(onslaughtRage && furyOffset !== null
            ? [
                {
                  source: onslaughtRage.line.source,
                  text: `${furyOffset}% additional damage for the Seething Spirit while Berserk (Fury's Onslaught: game record 187841424's second parameter, the Spirit's offset to the player's +${furyBonus}%)`,
                  value: furyOffset,
                },
              ]
            : []),
        ],
        extraLines:
          projectiles && starfall
            ? [
                {
                  text: `+${projectiles.match[1]} Projectile Quantity`,
                  source: projectiles.line.source,
                  origin: "memory",
                  multiplier: 1,
                },
                {
                  text: `+${projectiles.match[3]} Horizontal Projectile Penetration(s)`,
                  source: projectiles.line.source,
                  origin: "memory",
                  multiplier: 1,
                },
              ]
            : [],
        returning:
          returning && starfall
            ? {
                percent: Number(returning.match[1]),
                on: requestedConditions[SPIRIT_RETURN_SWITCH] !== false,
                source: returning.line.source,
                active: false,
                reason: "settled with the Spirit's casts",
              }
            : null,
        doubleChance: round(spiritDoubleChance),
      }
    : null;
  return spirit;
}

/** The badge of a Seething Spirit clause, or null when the clause is another mechanic's. */
export function seethingRead(key, state, { cycle, pending }) {
  const { rage, spirit } = state;
  switch (key) {
    // ---- Seething Spirit ----
    case "ownSpirit":
    case "ritualSpirit":
    case "onslaughtSpirit":
    case "spiritDamage":
    case "spiritSpeed":
    case "growing":
    case "hateConsume":
    case "starfallRanged":
    case "starfallProjectiles":
    case "starfallReturn": {
      if (!spirit)
        return key === "hateConsume"
          ? L("No DPS effect", "a Life cost: no Seething Spirit in the build (Ritual of Offering or Fury's Onslaught)")
          : L("Inactive", "no Seething Spirit (Ritual of Offering or Fury's Onslaught)");
      if (!spirit.eligible) return L("Inactive", spirit.reason);
      if (!spirit.active)
        return L(
          "Inactive",
          spirit.presence > 0 ? cycle : `the Main Skill is not used within every ${spirit.onslaughtSeconds} s`,
        );
      const settled = state.spiritHit;
      if (settled && !settled.modeled)
        return L(
          "Inactive",
          `the Spirit's casts deal no damage here${settled.inactiveReason ? ` (${settled.inactiveReason})` : ""}`,
        );
      if (key === "hateConsume")
        return rage.consumedRate > EPS && rage.matters.consumed
          ? L("In calc", `Hysteria: ${fmt(rage.consumedRate)} Rage/s in Berserk from the Life consumed (provisional)`)
          : L("No DPS effect", "a Life cost (Hysteria would turn it into Rage)");
      if (key === "growing")
        return !(rage.growingRate > EPS)
          ? L("Inactive", `the Spirit's casts are measured by the hit pass${pending}`)
          : rage.matters.growing
            ? L(
                "In calc",
                `+${fmt(rage.growingRate)} Rage/s in Berserk (${fmt(spirit.usesInBerserk)} Spirit casts/s, doubled on its ${pct(spirit.doubleChance)}% Double Damage; ${cycle})`,
              )
            : L("No DPS effect", "Berserk never ends without it");
      if (key === "starfallReturn") {
        const ret = spirit.returning;
        if (!ret) return L("Inactive", "Starfall Wasteland is not in the build");
        if (!ret.on) return L("Inactive", "switched off");
        return ret.active
          ? L(
              "In calc",
              `${ret.percent}% of the Spirit's projectiles pass through the dummy (Penetration) and return through it: +${round(ret.percent / 100)} hits per projectile (best case: the dummy on the return path; provisional)`,
            )
          : L("Inactive", ret.reason || "the Spirit's projectiles do not penetrate");
      }
      if (key === "starfallProjectiles")
        return L(
          "In calc",
          "+1 Projectile Quantity and +1 Horizontal Projectile Penetration on the Spirit's casts (Jumps and Projectile Size: no DPS effect on one dummy)",
        );
      if (key === "spiritSpeed") return L("In calc", `the Spirit casts at ×${spirit.speedFactor} your use rate`);
      if (key === "spiritDamage") return L("In calc", "on the Spirit's casts");
      return L(
        "In calc",
        `${settled ? `${fmt(settled.usesPerSecond)} Spirit casts/s of ${spirit.mainName} (${fmt(settled.dps)} DPS)` : `the Spirit casts ${spirit.mainName}`}: ${spirit.source === "ritual" ? "always while Berserk" : `while ${spirit.mainName} is used within every ${spirit.onslaughtSeconds} s (${pct(spirit.presence)}%)`}, × ${pct(rage.uptime)}% Berserk uptime (provisional)`,
      );
    }
    default:
      return null;
  }
}
