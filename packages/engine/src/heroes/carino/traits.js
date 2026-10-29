// Carino (Ranger of Glory, Lethal Flash, Zealot of War): hero trait audit batch B9 (2026-10-19; research/hero-traits-audit-2026-10-19.md
// §5 B9, §8 B9, §6 Q-H8). Pure: reads the build's trait lines (origin "trait"), the hero-exclusive revived lines the module reads
// (packages/engine/src/heroes/hero-exclusive-revivals.js MODULE_LINES: Royal Arsenal's Noble line, Into the Night, Self-Imposed Shackles' Heat Up line), the
// Special Ammo supports (`hero.carinoSpecialAmmoSupports`) and the hit pass's measured Projectile cast rate, and returns
//   - carinoState: the ammo cadence (magazine, reload, the Projectile use-rate factor), Special Ammo and Magic Shot (the per-cast
//     shares of the supports consumed, for packages/engine/src/planner.js's variant hits), Heat Up (Zealot of War), Deflection, Evil Ouroboros's
//     returning projectiles and Royal Arsenal, with the best-case switches and the recount assumptions;
//   - carinoLineRead: one clause's status, reason and derived bodies (packages/engine/src/heroes/hero-trait-modules.js "ammo" / "specialAmmo" / "heatUp" /
//     "deflection" / "ouroboros").
//
// Sourced:
// - Trait texts (TLIDB, SS14; packages/engine/data/heroes/all-hero-traits.generated.js).
// - TLIDB keyword tooltips (Torchlight_Hyperlink_hover, read 2026-10-19): Reload (bb23b3f1: the whole magazine is reloaded; Projectile
//   Skills cannot be used while reloading), Special Ammo (bab6adde: a chance to reload the slot's special ammo; it is consumed and
//   grants the support's effects when that support is not on the skill panel and can support Projectile Skills), Magic Shot
//   (948139d0: each Projectile Skill used or triggered consumes 3 ammo; several special ammo grant every consumed support's effects;
//   reloading is instant), Heat Up (80ec0559: additionally increases Projectile Damage by stacks), Overheated (707f8692: forced reload
//   after a while), Blank Firing (548823c3: Projectile Skills usable without ammo; no ammo benefits), Burning Red (3c9df3ab: lasts
//   10 s; no Overheated or reload while active; gains 100% Heat Up effect bonuses; forced reload when it ends), Deflection
//   (fd631f6a: 6% less damage taken per stack, up to 4; consumed when hit).
// - Game records (tools/bin/reverse-engineering/affix-catalog-2026-10-15.json, audit §4.3): magazine field 2100101 (Ranger 6,
//   Lethal Flash 12, Zealot 6), reload time field 2100102; Ceasefire (274178304) sets the Heat Up buff 80180 to field 2100101 stacks
//   and Extreme Heat (241096224) enters Burning Red at Heat Up stacks >= field 2100101, so Max Heat Up stacks = the magazine
//   capacity; Incinerated Glory (691824) adds a Heat Up stack on every ammo consumed (trigger 1001150) and Overheated on a cast during
//   Blank Firing; 282052064 (field 2100128 = 10 s) forces the reload and clears Heat Up / Overheated after it; the special-ammo reload
//   chance is field 2100107 (Ammo Expert 30, Artificial Moon +20); Crushing Gale Trigger converts Attack Speed (60011) and Cast Speed
//   (60021) into it; "if a Special Ammo is consumed" lines are next-cast buffs on trigger 1001152.
//
// Provisional readings (src/app/stats/open-questions.js, shown only for Carino):
// - Q-H8 (recommended): one ammo per cast, not per projectile. Ranger of Glory: Projectile Skills are unavailable while reloading, so
//   the Projectile casts run at r × M ÷ (M + R × r) (r: the Projectile casts per second the hit pass measured, M: the magazine, R: the
//   reload time); Reload Speed = 150% × the larger of the increased Attack Speed and Cast Speed (the "bonus" read as the increased
//   pool) plus "+X% Reload Speed" lines. Lethal Flash: no downtime (casting interrupts the reload), so its magazine and reload lines
//   change no dummy figure. Zealot of War: the magazine reloads automatically when empty, unavailable while reloading (the Reload
//   keyword), as Ranger of Glory but with no Reload Speed share.
// - Special Ammo (Ranger of Glory): Ammo Expert opens slots 1–2, Well Prepared slot 3 (Magnificent / Noble supports need Well
//   Prepared); each slot's support counts when it is not on the skill panel and can support Projectile Skills. At each magazine
//   reload every slot is refilled with chance p = Σ reload chance (+ Crushing Gale Trigger's share of the increased Attack and Cast
//   Speed, both converted as the game record does), capped at 100%; outside Magic Shot the next casts consume one special ammo each
//   (a cast gets support j with chance p ÷ M). The support is Lv. 20 (the tooltip's level; no Support Skill Level line raises it).
//   Its hit effects apply on that cast (packages/engine/src/planner.js variant hits); its effects on ailments and damage over time are not modeled.
//   "Reload Special Ammo slots in order" changes which support comes first, not how many: No DPS effect.
// - Magic Shot: 50% chance per special ammo consumed, at most once per 8 s; lasts 4 s × (1 + Magic Shot Duration), extended by Never
//   Stopping per special ammo consumed (D = D0 ÷ (1 − e × λ), permanent when e × λ >= 1); uptime = D ÷ max(D, 8 s + the expected wait
//   2 ÷ λ). While active a cast consumes 3 ammo (Landslide: the whole magazine) and reloading is instant, so there is no downtime and
//   each reload refills the slots: a cast gets the loaded supports together every max(1, M ÷ 3) casts (Landslide: every cast).
// - Heat Up (Zealot of War, Incinerated Glory): the k-th ammo of a magazine casts with k stacks (the stack is gained as the ammo is
//   consumed, before the projectiles hit); after M casts the magazine is empty and the casts Blank Fire at M stacks until Overheated
//   forces a reload 10 s later (Extreme Heat: Burning Red for 10 s at +100% Heat Up Effect, read into the increased pool, then the
//   reload), and the reload clears the stacks; the player never reloads by hand (best case). Each of those lines is read: without the
//   Overheated gain or the forced-reload line nothing forces a reload (the stacks stay at M after the first magazine, no downtime),
//   without the clearing line every cast after the first magazine reads M. Ceasefire: no forced reload, so the stacks stay at M
//   (without Incinerated Glory nothing clears them either). Heat Up Effect: the increased lines (Artificial Moon
//   +50%, Burning Red) and Self-Imposed Shackles' +30% additional while standing still (the Movement group). The damage line reads
//   the cast-weighted stacks, Eternal Flames' speed the time-weighted stacks; the 5 s / 20 s windows use the cycle average.
// - Deflection (Lethal Flash): held while a Deflection gain source holds (movement while moving, Reaping, hit recently, not hit
//   recently); the dummy never attacks, so it is never consumed (best-case switch `carinoDeflection`). Into the Night's 3 s duration
//   is met by a source that regains it within 3 s.
// - Evil Ouroboros: a projectile that reaches its max range returns over 75% of it; on one dummy only a projectile that passes
//   through it (at least 1 Penetration on a Horizontal Projectile skill) reaches that range, so each such projectile hits it once
//   more as a full hit (best-case switch `carinoReturningHits`: the dummy stands on the return path).
// - Royal Arsenal (revived): the Main Skill's enabled Noble supports count as activated.

import {
  LETHAL,
  ZEALOT,
  CARINO_HEROES,
  DEFLECTION_SWITCH,
  SPECIAL_AMMO_LEVEL,
  CARINO_PATTERNS,
  EPS,
  round,
  pct,
  cleanCarino,
  carinoClauseKey,
  linesOf,
  all,
  first,
  sumOf,
  plainSum,
  PROJECTILE_QUANTITY,
  SPLIT_QUANTITY,
  RELOAD_SPEED,
  L,
} from "./trait-lines.js";
import { specialAmmoState, settleSpecialAmmoVariants, arsenalState, rangerRead } from "./ranger-of-glory.js";
import { deflectionState, returningState, lethalRead } from "./lethal-flash.js";
import { heatUpState, zealotRead } from "./zealot-of-war.js";

/** The ammo cycle's Projectile use-rate factor (Q-H8). */
export function rangerRateFactor({ magazine, reloadSeconds, castsPerSecond }) {
  if (!(castsPerSecond > 0) || !(magazine > 0)) return 1;
  return magazine / (magazine + reloadSeconds * castsPerSecond);
}
/**
 * @param {object} p
 * @param {string} p.heroId the selected loadout
 * @param {object} p.hero state.hero (`carinoSpecialAmmoSupports`)
 * @param {object[]} p.modifierTexts the build's lines (before the derived lines)
 * @param {object} p.requestedConditions the combat conditions (the best-case switches)
 * @param {boolean} p.moving the Movement group
 * @param {object|null} p.facts { projectileUsesPerSecond } from the hit pass (null before it)
 * @param {object} p.inputs { projectileSetups: [{ setupKey, name }], attackSpeedIncreasedPercent, castSpeedIncreasedPercent,
 *   projectileSpeedPercent, installedSupportNames, mainNobleSupports, hasReaping, hitRecently }
 */
export function carinoState({
  heroId = "",
  hero = {},
  modifierTexts = [],
  requestedConditions = {},
  moving = true,
  facts = null,
  inputs = {},
} = {}) {
  if (!CARINO_HEROES.has(heroId)) return null;
  const lines = linesOf(modifierTexts, heroId);
  const projectileSetups = inputs.projectileSetups || [];
  const projectile = projectileSetups.length > 0;
  const consumes = Boolean(first(lines, "consume"));
  const measured = Number.isFinite(facts?.projectileUsesPerSecond) ? facts.projectileUsesPerSecond : null;
  const r = measured;
  const attackInc = Number(inputs.attackSpeedIncreasedPercent) || 0,
    castInc = Number(inputs.castSpeedIncreasedPercent) || 0;
  const projectileSpeed = Math.max(0, Number(inputs.projectileSpeedPercent) || 0);

  // ---- Magazine and reload ----
  const magazineLines = all(lines, "magazine");
  const perQuantity = first(lines, "magazinePerQuantity");
  const quantity = perQuantity
    ? plainSum(modifierTexts, PROJECTILE_QUANTITY) + plainSum(modifierTexts, SPLIT_QUANTITY)
    : 0;
  const quantityCapacity = perQuantity ? Number(perQuantity.match[1]) * Math.floor(quantity + EPS) : 0;
  const magazine = Math.max(0, sumOf(magazineLines) + quantityCapacity);
  const reloadClick = first(lines, "reloadClick"),
    reloadQuantityLine = first(lines, "autoReloadQuantity"),
    reloadBaseLine = first(lines, "reloadBase");
  const baseReload = reloadClick
    ? Number(reloadClick.match[1])
    : reloadQuantityLine
      ? Number(reloadQuantityLine.match[2])
      : reloadBaseLine
        ? Number(reloadBaseLine.match[1])
        : 0;
  const share = first(lines, "reloadShare");
  const shareBonus = share ? (Number(share.match[1]) / 100) * Math.max(attackInc, castInc, 0) : 0;
  const perSpeed = first(lines, "reloadSpeedPer");
  const perSpeedBonus = perSpeed ? Number(perSpeed.match[1]) * projectileSpeed : 0;
  const plainReload = plainSum(modifierTexts, RELOAD_SPEED);
  const reloadSpeedPercent = round(shareBonus + perSpeedBonus + plainReload);
  const reloadSeconds = baseReload > 0 ? baseReload / Math.max(EPS, 1 + reloadSpeedPercent / 100) : 0;
  const perQuantityLine = first(lines, "reloadQuantityPer");
  const reloadQuantity = reloadQuantityLine
    ? Number(reloadQuantityLine.match[1]) +
      (perQuantityLine
        ? Number(perQuantityLine.match[1]) * Math.floor(projectileSpeed / Number(perQuantityLine.match[2]) + EPS)
        : 0)
    : null;
  const ammo = {
    consumes,
    projectile,
    magazine,
    magazineLines: magazineLines.map((item) => item.line.source),
    quantity: round(quantity),
    quantityCapacity,
    baseReloadSeconds: baseReload,
    reloadSpeedPercent,
    shareBonus: round(shareBonus),
    perSpeedBonus: round(perSpeedBonus),
    plainReload: round(plainReload),
    reloadSeconds: round(reloadSeconds),
    reloadQuantity,
    attackInc: round(attackInc),
    castInc: round(castInc),
    projectileSpeed: round(projectileSpeed),
  };

  const heat = heatUpState(lines, { heroId, moving, magazine, r, reloadSeconds });

  // ---- Use-rate factor of the Projectile skills (Q-H8) ----
  const unavailable = Boolean(first(lines, "unavailable"));
  const lethal = heroId === LETHAL || Boolean(first(lines, "castWhileReloading"));
  let rateMode = "none",
    rateFactorOut = 1;
  if (consumes && projectile && !lethal) {
    if (heroId === ZEALOT && heat && heat.mode !== "none" && heat.gains) {
      rateMode = heat.mode === "ceasefire" ? "ceasefire" : heat.mode === "held" ? "noReload" : "heatCycle";
      rateFactorOut = heat.rateFactor;
    } else if (heroId === ZEALOT && heat?.mode === "ceasefire") {
      rateMode = "reload";
      rateFactorOut = rangerRateFactor({ magazine, reloadSeconds, castsPerSecond: r });
    } else if (unavailable || heroId === ZEALOT) {
      rateMode = "reload";
      rateFactorOut = rangerRateFactor({ magazine, reloadSeconds, castsPerSecond: r });
    }
  } else if (consumes && projectile && lethal) rateMode = "noDowntime";

  const special = specialAmmoState(lines, {
    hero,
    inputs,
    modifierTexts,
    attackInc,
    castInc,
    magazine,
    r,
    rateFactorOut,
  });
  // Time-weighted rate factor: Magic Shot has instant reloads (no downtime) for its uptime.
  const magicUptime = special?.magic?.uptime || 0;
  const rateFactor =
    rateMode === "reload" && magicUptime > 0 ? (1 - magicUptime) * rateFactorOut + magicUptime : rateFactorOut;
  const rate = {
    mode: rateMode,
    castsPerSecond: r,
    factorOutsideMagicShot: round(rateFactorOut),
    factor: round(rateFactor),
    measured: r !== null,
  };

  settleSpecialAmmoVariants(special, { magazine, rateFactorOut, magicUptime });
  const deflection = deflectionState(lines, { modifierTexts, moving, inputs, requestedConditions });
  const returning = returningState(lines, { requestedConditions });
  const arsenal = arsenalState(lines, { inputs });

  // ---- Switches and assumptions ----
  const switches = [];
  if (deflection && deflection.sources.length)
    switches.push({
      id: DEFLECTION_SWITCH,
      label: "Carino: Deflection held (the dummy never attacks)",
      enabled: deflection.on,
      active: deflection.held,
      summary: deflection.held ? 'Deflection held: the "while having Deflection" lines apply' : "no Deflection",
      reason: deflection.held ? "best-case assumption (not hit, so Deflection is never consumed)" : deflection.reason,
    });
  const assumptions = [];
  if (rateMode === "reload" || rateMode === "heatCycle")
    assumptions.push({
      id: "carino:ammo",
      value: rate.factor,
      text: `Carino – ammo (Q-H8, provisional): one ammo per cast; magazine ${magazine}, reload ${round(reloadSeconds)} s (${baseReload} s ÷ (1 + ${reloadSpeedPercent}% Reload Speed)); ${r === null ? "the Projectile cast rate is measured by the hit pass" : `${round(r)} Projectile casts/s → available ${pct(rate.factor)}% of the time${magicUptime > 0 ? ` (Magic Shot ${pct(magicUptime)}%: instant reloads)` : ""}`}${rateMode === "heatCycle" ? `; Zealot: Blank Firing for ${heat.phaseSeconds} s after the magazine empties, then the reload` : ""}.`,
    });
  if (rateMode === "noDowntime")
    assumptions.push({
      id: "carino:ammo",
      value: 1,
      text: "Carino – Lethal Flash ammo (Q-H8, provisional): one ammo per cast; casting interrupts the reload, so the Projectile casts have no downtime and every cast consumes ammo.",
    });
  if (rateMode === "ceasefire")
    assumptions.push({
      id: "carino:ammo",
      value: 1,
      text: "Carino – Zealot of War with Ceasefire and Incinerated Glory (provisional): Blank Firing from the start, Overheated never forces a reload, so the Projectile casts have no downtime.",
    });
  if (rateMode === "noReload")
    assumptions.push({
      id: "carino:ammo",
      value: 1,
      text: "Carino – Zealot of War (provisional): Blank Firing after the first magazine and nothing forces a reload, so the Projectile casts have no downtime.",
    });
  if (special?.n > 0)
    assumptions.push({
      id: "carino:specialAmmo",
      value: special.specialShare,
      text: `Carino – Special Ammo (provisional): ${special.eligible.map((slot) => slot.name).join(", ")} at Lv. ${SPECIAL_AMMO_LEVEL}; reload chance ${pct(special.chance)}% per slot per magazine reload; ${pct(special.specialShare)}% of Projectile casts consume one${special.magic ? `; Magic Shot ${pct(special.magic.uptime)}% of the time (${special.magic.permanent ? "permanent through Never Stopping" : `${special.magic.durationSeconds} s, at most every ${special.magic.intervalSeconds} s`})` : ""}; the supports' hit effects apply on those casts (not their ailment / DoT effects).`,
    });
  if (heat && heat.mode !== "none")
    assumptions.push({
      id: "carino:heatUp",
      value: heat.castWeighted,
      text: `Carino – Heat Up (provisional): ${heat.mode === "ceasefire" ? `held at ${heat.maxStacks} stacks (Ceasefire)` : `${heat.castWeighted} effective stacks per cast over the cycle (k-th ammo at k stacks, then ${heat.phaseSeconds} s ${heat.mode === "burningRed" ? "of Burning Red" : "of Blank Firing until Overheated forces the reload"} at ${heat.maxStacks}; reloads clear them)`} × Heat Up Effect ×${heat.effect}; the 5 s / 20 s windows use the cycle average.`,
    });
  if (deflection)
    assumptions.push({
      id: "carino:deflection",
      value: deflection.held,
      text: `Carino – Deflection (provisional): ${deflection.reason}.`,
    });
  if (returning)
    assumptions.push({
      id: "carino:returning",
      value: returning.on,
      text: `Carino – Evil Ouroboros (provisional): ${returning.on ? "each projectile that passes through the dummy (Penetration) returns and hits it once more (the dummy on the return path: best case)" : "returning projectiles switched off"}.`,
    });
  return {
    heroId,
    consumes,
    projectile,
    ammo,
    rate,
    heat,
    special,
    deflection,
    returning,
    arsenal,
    switches,
    assumptions,
    needsRates: Boolean(
      projectile && consumes && (rateMode === "reload" || rateMode === "heatCycle" || (special && special.n > 0)),
    ),
  };
}
/** One Carino clause: { key, status, reason, bodies }, or null when the line is not a Carino clause. */
export function carinoLineRead(heroId, text, state, { revived = false } = {}) {
  if (!CARINO_HEROES.has(heroId)) return null;
  const key = carinoClauseKey(text, { revived });
  if (!key) return null;
  // The Movement group (moving vs standing still, packages/engine/src/planner.js exclusiveConditionGroups) is compared when a clause depends on it:
  // Self-Imposed Shackles (standing still) and Deflection gained from movement.
  const movement =
    key === "shackles" ||
    (["deflectionBonus", "nightBonus", "nightDuration"].includes(key) &&
      (state?.deflection?.sources || []).some((item) => item.kind === "movement"));
  return { key, bodies: [], ...lineRead(key, cleanCarino(text), state), ...(movement ? { group: "movement" } : {}) };
}

function lineRead(key, text, state) {
  if (!state) return L("Inactive", "Carino's lines are not in the build");
  const noProjectile = "no active Projectile skill";
  const { ammo, rate, heat, special } = state;
  const cadence =
    rate.mode === "reload"
      ? rate.measured
        ? `Projectile casts available ${pct(rate.factor)}% of the time: ${round(rate.castsPerSecond)} casts/s × ${ammo.magazine} ÷ (${ammo.magazine} + ${ammo.reloadSeconds} s × ${round(rate.castsPerSecond)})${special?.magic?.uptime > 0 ? `, instant reloads under Magic Shot (${pct(special.magic.uptime)}%)` : ""} (Q-H8, provisional)`
        : "the reload downtime follows the Projectile cast rate the hit pass measures (Q-H8)"
      : rate.mode === "heatCycle"
        ? rate.measured
          ? `the Heat Up cycle: ${ammo.magazine} ammo casts, ${heat.phaseSeconds} s of Blank Firing, a ${ammo.reloadSeconds} s reload: casts available ${pct(rate.factor)}% of the time (provisional)`
          : "the cycle follows the Projectile cast rate the hit pass measures"
        : rate.mode === "ceasefire"
          ? "Ceasefire with Blank Firing: no reload, no downtime (provisional)"
          : rate.mode === "noReload"
            ? "Blank Firing after the first magazine and nothing forces a reload: no downtime (provisional)"
            : rate.mode === "noDowntime"
              ? "casting interrupts the reload, so the casts have no downtime and every cast consumes ammo (Q-H8, provisional)"
              : "";
  switch (key) {
    case "consume":
      return !state.projectile
        ? L("Inactive", noProjectile)
        : L("In calc", `one ammo per cast (Q-H8, provisional); ${cadence}`);
    case "ammoBonus": {
      const value = Number(text.match(CARINO_PATTERNS.ammoBonus)[1]);
      const body = `+${value}% additional Projectile Damage`;
      if (!state.projectile) return L("Inactive", noProjectile);
      if (!state.consumes) return L("Inactive", '"Projectile Skills consume ammo" is not in the build');
      return L(
        "In calc",
        `every Projectile cast consumes ammo (${rate.mode === "noDowntime" ? "no downtime" : "the casts wait for the reload instead"}; Q-H8, provisional): ${body}`,
        { bodies: [body] },
      );
    }
    case "magazine":
    case "reloadClick":
    case "reloadBase":
    case "magazinePerQuantity":
    case "reloadShare":
    case "unavailable": {
      if (!state.projectile) return L("Inactive", noProjectile);
      if (rate.mode === "noDowntime")
        return L(
          "No DPS effect",
          "Lethal Flash: casting interrupts the reload, so the magazine and the reload change no dummy figure (Q-H8, provisional)",
        );
      if (rate.mode === "ceasefire" || rate.mode === "noReload") {
        const capacity = key === "magazine" || key === "magazinePerQuantity";
        const why =
          rate.mode === "ceasefire"
            ? "Ceasefire with Blank Firing: no reload ever happens"
            : "Blank Firing after the first magazine and nothing forces a reload";
        if (
          capacity &&
          (heat?.perStack > 0 || heat?.speedPerStack > 0) &&
          (key === "magazine" || ammo.quantityCapacity > 0)
        )
          return L(
            "In calc",
            `${why}; the magazine (${ammo.magazine}${key === "magazinePerQuantity" ? `, +${ammo.quantityCapacity} from ${ammo.quantity} Projectile / Split Quantity` : ""}) sets Max Heat Up Stacks, held ${rate.mode === "ceasefire" ? "from the start" : "after the first magazine"} (game records 274178304 / 241096224)`,
          );
        return L("No DPS effect", why);
      }
      if (key === "magazinePerQuantity")
        return ammo.quantityCapacity > 0
          ? L(
              "In calc",
              `${ammo.quantity} Projectile / Split Quantity from the build's lines (the trait's +2 included; skill and support quantity excluded) → +${ammo.quantityCapacity} Magazine Capacity: magazine ${ammo.magazine}; ${cadence}`,
            )
          : L("Inactive", "no build-wide Projectile or Split Quantity line");
      if (key === "reloadShare")
        return ammo.shareBonus > 0
          ? L(
              "In calc",
              `150% × max(+${ammo.attackInc}% Attack Speed, +${ammo.castInc}% Cast Speed) (the increased pools; provisional) = +${ammo.shareBonus}% Reload Speed: reload ${ammo.reloadSeconds} s; ${cadence}`,
            )
          : L("Inactive", "no increased Attack Speed or Cast Speed");
      return L(
        "In calc",
        `magazine ${ammo.magazine}, reload ${ammo.reloadSeconds} s${ammo.reloadSpeedPercent ? ` (${ammo.baseReloadSeconds} s ÷ (1 + ${ammo.reloadSpeedPercent}% Reload Speed))` : ""}: ${cadence}`,
      );
    }
    case "autoReload":
      return L(
        "No DPS effect",
        "the magazine reloads as soon as it is empty (the cycle the ammo lines model); interrupting a reload never raises the dummy figure",
      );
    case "reloadMove":
      return L("No DPS effect", "Movement Speed while reloading only");
    case "autoReloadQuantity":
    case "castWhileReloading":
    case "reloadSpeedPer":
    case "reloadQuantityPer":
      return !state.projectile
        ? L("Inactive", noProjectile)
        : L(
            "No DPS effect",
            `Lethal Flash: casting interrupts the reload, so the casts have no downtime (Q-H8, provisional) and the reload ${key === "reloadQuantityPer" || key === "autoReloadQuantity" ? "quantity" : "speed"} changes no dummy figure${key === "reloadSpeedPer" ? ` (Reload Speed +${ammo.perSpeedBonus}% from +${ammo.projectileSpeed}% Projectile Speed)` : key === "reloadQuantityPer" ? ` (${ammo.reloadQuantity} per reload)` : ""}`,
          );
    default:
      return (
        rangerRead(key, text, state) ??
        lethalRead(key, text, state) ??
        zealotRead(key, text, state) ??
        L("Not modeled", "this Carino clause is not read")
      );
  }
}
