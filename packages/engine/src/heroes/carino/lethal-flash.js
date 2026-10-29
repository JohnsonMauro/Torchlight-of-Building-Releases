// Carino – Lethal Flash (hero trait audit batch B9, 2026-10-19): Deflection held on the dummy and Evil Ouroboros's returning hits. The
// provisional readings are listed in packages/engine/src/heroes/carino/traits.js.

import { ASSUMED_MOVEMENT_METERS_PER_SECOND } from "../../combat/dummy-target.js";
import {
  DEFLECTION_SWITCH,
  RETURNING_SWITCH,
  EPS,
  round,
  cleanCarino,
  CARINO_PATTERNS,
  first,
  L,
} from "./trait-lines.js";
// Deflection gain sources (gear, talents, kismets, cores): what keeps "having Deflection" on the dummy.
const DEFLECTION_SOURCES = [
  { pattern: /^For every (\d+(?:\.\d+)?) ?m moved, gains (\d+) stack\(s\) of Deflection$/i, kind: "movement" },
  { pattern: /^Gains (\d+) stack\(s\) of Deflection when Reaping\.? Interval:? (\d+(?:\.\d+)?) ?s$/i, kind: "reaping" },
  {
    pattern: /^Gains (\d+) stack\(s\) of Deflection every (\d+(?:\.\d+)?) ?s if you have been hit recently$/i,
    kind: "hitRecently",
  },
  { pattern: /^Gains max stacks of Deflection if you haven't been hit recently$/i, kind: "notHitRecently" },
  { pattern: /^Gains max stacks of Deflection on Evade$/i, kind: "evade" },
];

/** Deflection held on the dummy (its gain sources, Into the Night's 3 s), or null without a Deflection line. */
export function deflectionState(lines, { modifierTexts, moving, inputs, requestedConditions }) {
  // ---- Deflection (Lethal Flash) ----
  const deflectionBonus = first(lines, "deflectionBonus"),
    nightBonus = first(lines, "nightBonus"),
    nightDuration = first(lines, "nightDuration");
  let deflection = null;
  if (deflectionBonus || nightBonus || nightDuration) {
    const limit = nightDuration ? Number(nightDuration.match[1]) : Infinity;
    const sources = modifierTexts
      .filter((line) => line && line.origin !== "derived" && !line.lineEffect)
      .flatMap((line) => {
        const clean = cleanCarino(line.text);
        const rule = DEFLECTION_SOURCES.find((item) => item.pattern.test(clean));
        if (!rule) return [];
        const match = clean.match(rule.pattern);
        let active = false,
          every = null,
          why = "";
        if (rule.kind === "movement") {
          every = Number(match[1]) / ASSUMED_MOVEMENT_METERS_PER_SECOND;
          active = moving !== false && every <= limit + EPS;
          why =
            moving === false
              ? "standing still (Movement group)"
              : `every ${round(every)} s at the assumed ${ASSUMED_MOVEMENT_METERS_PER_SECOND} m/s (the planner's movement placeholder, unsourced)`;
        } else if (rule.kind === "reaping") {
          every = Number(match[2]);
          active = Boolean(inputs.hasReaping) && every <= limit + EPS;
          why = inputs.hasReaping ? `when Reaping, every ${every} s at most` : "the build has no Reaping source";
        } else if (rule.kind === "hitRecently") {
          every = Number(match[2]);
          active = Boolean(inputs.hitRecently) && every <= limit + EPS;
          why = inputs.hitRecently
            ? `every ${every} s while hit recently (best case)`
            : "the Hit or blocked recently switch is off";
        } else if (rule.kind === "notHitRecently") {
          active = !inputs.hitRecently;
          why = inputs.hitRecently
            ? "the build is assumed hit recently (the Hit or blocked recently switch)"
            : "not hit recently (the dummy never attacks)";
          every = 0;
        } else {
          active = false;
          why = "on Evade: the dummy never attacks";
        }
        if (every !== null && every > limit + EPS && !why.startsWith("standing") && rule.kind !== "evade")
          why = `${why}; regained every ${round(every)} s, slower than Into the Night's ${limit} s`;
        return [
          {
            source: line.source,
            text: clean,
            kind: rule.kind,
            active,
            everySeconds: every === null ? null : round(every),
            reason: why,
          },
        ];
      });
    const on = requestedConditions[DEFLECTION_SWITCH] !== false;
    const held = on && sources.some((item) => item.active);
    deflection = {
      on,
      held,
      limitSeconds: Number.isFinite(limit) ? limit : null,
      sources,
      reason: !sources.length
        ? "no Deflection gain source in the build (movement, Reaping or hit-recently lines)"
        : !on
          ? "the Deflection switch is off"
          : held
            ? `held: ${sources
                .filter((item) => item.active)
                .map((item) => `${item.source} (${item.reason})`)
                .join("; ")}; the dummy never attacks, so it is not consumed (best case)`
            : sources.map((item) => `${item.source}: ${item.reason}`).join("; "),
    };
  }
  return deflection;
}

/** Evil Ouroboros's returning hits, or null without its line. */
export function returningState(lines, { requestedConditions }) {
  // ---- Evil Ouroboros (Lethal Flash) ----
  const returningLine = first(lines, "returning");
  const returning = returningLine
    ? {
        percent: Number(returningLine.match[1]),
        on: requestedConditions[RETURNING_SWITCH] !== false,
        source: returningLine.line.source,
        setups: [],
      }
    : null;
  return returning;
}

/** The badge of an Evil Ouroboros / Deflection clause, or null when the clause is another mechanic's. */
export function lethalRead(key, text, state) {
  const noProjectile = "no active Projectile skill";
  const { deflection, returning } = state;
  switch (key) {
    // ---- Evil Ouroboros ----
    case "returning": {
      if (!returning) return L("Inactive", "Evil Ouroboros is not in the build");
      if (!state.projectile) return L("Inactive", noProjectile);
      if (!returning.on) return L("Inactive", "the returning-projectiles switch is off");
      const hitting = returning.setups.filter((item) => item.active);
      if (!returning.setups.length)
        return L(
          "In calc",
          "each projectile that passes through the dummy returns and hits it again (settled with the hits)",
        );
      return hitting.length
        ? L(
            "In calc",
            `${hitting.map((item) => `${item.name}: ${item.reason}`).join("; ")} (best case: the dummy on the return path; provisional)`,
          )
        : L("Inactive", returning.setups.map((item) => `${item.name}: ${item.reason}`).join("; "));
    }
    // ---- Deflection ----
    case "deflectionBonus":
    case "nightBonus": {
      if (!deflection) return L("Inactive", "no Deflection line");
      const value = Number(text.match(CARINO_PATTERNS[key])[1]);
      const body = `+${value}% additional Projectile Damage`;
      if (!state.projectile) return L("Inactive", noProjectile);
      return deflection.held
        ? L("In calc", `Deflection ${deflection.reason}: ${body} (provisional)`, { bodies: [body] })
        : L("Inactive", deflection.reason);
    }
    case "nightMax":
      return L(
        "No DPS effect",
        "Max Deflection: no line in this build reads the Deflection stack count (its damage reduction is defence)",
      );
    case "nightDuration":
      return deflection?.held
        ? L(
            "No DPS effect",
            `the dummy never attacks, so Deflection is never consumed either way; the ${deflection.limitSeconds} s duration is met: ${deflection.reason}`,
          )
        : L("Inactive", deflection?.reason || "no Deflection gain source");
    default:
      return null;
  }
}
