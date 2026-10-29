// Carino – Zealot of War (hero trait audit batch B9, 2026-10-19): the Heat Up cycle. The provisional readings are listed in
// packages/engine/src/heroes/carino/traits.js.

import { ZEALOT, KEYWORDS, round, pct, all, first, sumOf, L } from "./trait-lines.js";

/**
 * Heat Up over one Zealot of War cycle (Incinerated Glory): casts 1..M with k stacks, then `phaseSeconds` of Blank Firing at M stacks
 * (Overheated until the forced reload, or Burning Red), then the reload. Returns the cast- and time-weighted effective stacks
 * (stacks × the phase's Heat Up Effect factor) and the use-rate factor.
 */
export function heatUpCycle({
  magazine,
  castsPerSecond,
  phaseSeconds,
  reloadSeconds,
  ammoEffect = 1,
  blankEffect = 1,
  clears = true,
}) {
  const M = Math.max(0, magazine),
    r = castsPerSecond;
  if (!(r > 0) || !(M > 0))
    return {
      castWeighted: M * blankEffect,
      timeWeighted: M * blankEffect,
      rateFactor: 1,
      castsPerCycle: null,
      cycleSeconds: null,
    };
  const blankCasts = phaseSeconds * r;
  // The ammo phase: casts 1..M at 1..M stacks when the reload cleared them, else at M.
  const ammoStackSum = clears ? (M * (M + 1)) / 2 : M * M;
  const ammoStackSeconds = clears ? (M * (M - 1)) / (2 * r) : (M * M) / r;
  const castWeighted = (ammoEffect * ammoStackSum + blankEffect * blankCasts * M) / (M + blankCasts);
  const castingSeconds = M / r + phaseSeconds;
  const timeWeighted = (ammoEffect * ammoStackSeconds + blankEffect * phaseSeconds * M) / castingSeconds;
  return {
    castWeighted,
    timeWeighted,
    rateFactor: (M + blankCasts) / (M + blankCasts + reloadSeconds * r),
    castsPerCycle: M + blankCasts,
    cycleSeconds: castingSeconds + reloadSeconds,
  };
}

/** Zealot of War's Heat Up over its cycle, or null for another loadout or without a Heat Up line. */
export function heatUpState(lines, { heroId, moving, magazine, r, reloadSeconds }) {
  // ---- Heat Up (Zealot of War) ----
  const blank = Boolean(first(lines, "blank")),
    heatGain = Boolean(first(lines, "heatGain"));
  const heatValueLine = first(lines, "heatValue"),
    heatSpeedLine = first(lines, "heatSpeed");
  const ceasefire = Boolean(first(lines, "ceasefireStart")),
    ceasefireHold = Boolean(first(lines, "ceasefireHold"));
  const burning = Boolean(first(lines, "burningRed"));
  const forced = first(lines, "forcedReload"),
    overheat = Boolean(first(lines, "overheatGain")),
    clears = Boolean(first(lines, "heatLoss"));
  const shackles = first(lines, "shackles");
  const heatIncreased = sumOf(all(lines, "heatEffect"));
  const standing = moving === false;
  const shacklesFactor = shackles && standing ? 1 + Number(shackles.match[1]) / 100 : 1;
  const effectFactor = (extraIncreased = 0) => (1 + (heatIncreased + extraIncreased) / 100) * shacklesFactor;
  let heat = null;
  if (heroId === ZEALOT && (heatValueLine || heatSpeedLine || ceasefire || heatGain)) {
    const gains = blank && heatGain;
    const maxStacks = magazine;
    let mode,
      castWeighted,
      timeWeighted,
      rateFactor = 1,
      cycle = null,
      phaseSeconds = 0;
    const baseEffect = effectFactor(0),
      burningEffect = effectFactor(KEYWORDS.burningRed.heatUpEffectPercent);
    if (ceasefire && (!gains || ceasefireHold)) {
      // Ceasefire: max stacks from the start and nothing clears them (no forced reload; without Incinerated Glory no clearing line).
      mode = "ceasefire";
      castWeighted = timeWeighted = maxStacks * baseEffect;
    } else if (gains && !burning && !(overheat && forced)) {
      // Blank Firing with nothing that forces a reload (no Overheated gain or no forced-reload line): the stacks reach max on the
      // first magazine and stay there.
      mode = "held";
      castWeighted = timeWeighted = maxStacks * baseEffect;
    } else if (gains) {
      // Burning Red (Extreme Heat) or the forced reload after Overheated ends the Blank Firing phase; the reload clears the stacks
      // only with Incinerated Glory's clearing line (else every cast after the first magazine reads max stacks).
      phaseSeconds = burning ? KEYWORDS.burningRed.seconds : Number(forced.match[1]);
      mode = burning ? "burningRed" : "overheated";
      cycle = heatUpCycle({
        magazine: maxStacks,
        castsPerSecond: r,
        phaseSeconds,
        reloadSeconds,
        ammoEffect: baseEffect,
        blankEffect: burning ? burningEffect : baseEffect,
        clears,
      });
      castWeighted = cycle.castWeighted;
      timeWeighted = cycle.timeWeighted;
      rateFactor = cycle.rateFactor;
    } else {
      mode = "none";
      castWeighted = timeWeighted = 0;
    }
    const perStack = heatValueLine ? Number(heatValueLine.match[1]) : 0;
    const speedPerStack = heatSpeedLine ? Number(heatSpeedLine.match[1]) : 0;
    heat = {
      mode,
      gains,
      blank,
      ceasefire,
      burning,
      overheat,
      forced: Boolean(forced),
      clears,
      maxStacks,
      phaseSeconds,
      castWeighted: round(castWeighted),
      timeWeighted: round(timeWeighted),
      rateFactor: round(rateFactor),
      cycle,
      effect: round(baseEffect),
      burningEffect: round(burningEffect),
      heatIncreased: round(heatIncreased),
      shackles: shackles ? { percent: Number(shackles.match[1]), active: standing } : null,
      perStack,
      damagePercent: round(perStack * castWeighted),
      speedPerStack,
      speedPercent: round(speedPerStack * timeWeighted),
      measured: r !== null,
    };
  }
  return heat;
}

/** The badge of a Heat Up clause, or null when the clause is another mechanic's. */
export function zealotRead(key, text, state) {
  const noProjectile = "no active Projectile skill";
  const { ammo, heat } = state;
  switch (key) {
    // ---- Heat Up ----
    case "heatValue": {
      if (!heat) return L("Inactive", "no Heat Up state");
      if (!state.projectile) return L("Inactive", noProjectile);
      if (!(heat.castWeighted > 0))
        return L(
          "Inactive",
          "no Heat Up stacks (Incinerated Glory's gain needs Blank Firing; Ceasefire starts at max)",
        );
      const body = `+${heat.damagePercent}% additional Projectile Damage`;
      return L(
        "In calc",
        `${heat.perStack}% × ${heat.castWeighted} effective stacks per cast (${heat.mode === "ceasefire" || heat.mode === "held" ? `${heat.maxStacks} held` : "the cycle's cast-weighted average"}, × Heat Up Effect${heat.mode === "burningRed" ? " and Burning Red's +100%" : ""}) = ${body} (provisional)`,
        { bodies: [body] },
      );
    }
    case "heatSpeed": {
      if (!heat || !(heat.timeWeighted > 0)) return L("Inactive", "no Heat Up stacks");
      if (!state.projectile) return L("Inactive", noProjectile);
      const body = `+${heat.speedPercent}% additional Attack and Cast Speed`;
      return L(
        "In calc",
        `${heat.speedPerStack}% × ${heat.timeWeighted} effective stacks (time-weighted over the casting time) = ${body} (scaled by Heat Up Effect; provisional)`,
        { bodies: [body] },
      );
    }
    case "heatEffect":
    case "shackles": {
      if (!heat || !(heat.castWeighted > 0) || !(heat.perStack > 0 || heat.speedPerStack > 0))
        return L("Inactive", "no Heat Up value line reads the effect (Incinerated Glory / Eternal Flames)");
      if (key === "shackles" && !heat.shackles?.active)
        return L("Inactive", 'moving (Movement group): "after stopping movement" needs standing still');
      return L(
        "In calc",
        `Heat Up Effect ×${heat.effect} (increased +${heat.heatIncreased}%${heat.shackles?.active ? `, ×${1 + heat.shackles.percent / 100} after stopping movement (standing still)` : ""}) on every Heat Up value`,
      );
    }
    case "blank":
    case "heatGain":
    case "overheatGain":
    case "forcedReload":
    case "heatLoss": {
      if (!heat) return L("Inactive", "no Heat Up state");
      if (!state.projectile) return L("Inactive", noProjectile);
      if (heat.mode === "ceasefire")
        return key === "blank"
          ? L("In calc", "Ceasefire: Blank Firing from the start keeps the max stacks with no reload (provisional)")
          : L("No DPS effect", "Ceasefire: the stacks start at max and no reload ever clears them");
      if (!heat.gains) return L("Inactive", "Heat Up stacks need Blank Firing and the per-ammo gain together");
      if (heat.mode === "held")
        return key === "blank" || key === "heatGain"
          ? L(
              "In calc",
              `the stacks reach max (${heat.maxStacks}) on the first magazine and Blank Firing keeps them: nothing forces a reload (provisional)`,
            )
          : L(
              "No DPS effect",
              `nothing forces a reload (${!heat.overheat ? "no Overheated gain" : "no forced-reload line"}), so the stacks stay at max`,
            );
      if (heat.mode === "burningRed" && (key === "overheatGain" || key === "forcedReload"))
        return L(
          "No DPS effect",
          "Extreme Heat: Burning Red replaces Overheated, and Burning Red's end forces the reload",
        );
      const ramp = heat.clears
        ? `casts 1..${heat.maxStacks} at 1..${heat.maxStacks} stacks`
        : `${heat.maxStacks} stacks on every cast (no clearing line)`;
      return L(
        "In calc",
        heat.measured
          ? `the cycle: ${ramp}, then ${heat.phaseSeconds} s ${heat.mode === "burningRed" ? "of Burning Red" : "of Blank Firing (Overheated forces the reload)"} at ${heat.maxStacks}, a ${ammo.reloadSeconds} s reload${heat.clears ? " clears them" : ""}: ${heat.castWeighted} effective stacks per cast, casts available ${pct(heat.rateFactor)}% of the time (provisional)`
          : "the cycle follows the Projectile cast rate the hit pass measures",
      );
    }
    case "ceasefireStart":
    case "ceasefireHold": {
      if (!heat) return L("Inactive", "no Heat Up state");
      if (!state.projectile) return L("Inactive", noProjectile);
      if (heat.mode !== "ceasefire") return L("Inactive", "Ceasefire's state needs its start line");
      return heat.perStack > 0 || heat.speedPerStack > 0
        ? L("In calc", `Heat Up held at ${heat.maxStacks} stacks (the magazine capacity), never cleared (provisional)`)
        : L("Inactive", "no Heat Up value line (Incinerated Glory / Eternal Flames) reads the stacks");
    }
    case "burningRed":
    case "burningRedReload": {
      if (!heat) return L("Inactive", "no Heat Up state");
      if (heat.mode !== "burningRed")
        return L(
          "Inactive",
          heat.mode === "ceasefire"
            ? "Ceasefire: the stacks start at max"
            : "Burning Red needs Heat Up stacks from Incinerated Glory",
        );
      if (key === "burningRedReload")
        return L(
          "No DPS effect",
          "the Burning Red keyword already forces the reload when it ends (the cycle reloads there)",
        );
      return L(
        "In calc",
        `at ${heat.maxStacks} stacks: ${KEYWORDS.burningRed.seconds} s of Burning Red (Heat Up Effect +${KEYWORDS.burningRed.heatUpEffectPercent}%, read as increased: ×${heat.burningEffect}), then the reload (provisional)`,
      );
    }
    default:
      return null;
  }
}
