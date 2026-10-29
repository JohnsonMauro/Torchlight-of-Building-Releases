// Carino – Ranger of Glory (hero trait audit batch B9, 2026-10-19): Special Ammo, Magic Shot and Royal Arsenal (revived). The
// provisional readings are listed in packages/engine/src/heroes/carino/traits.js.

import { tlidbSkillCatalog, tlidbSupportCatalog } from "../../../data/catalogs/tlidb.js";
import { supportCanSupportProjectile } from "./special-ammo.js";
import {
  KEYWORDS,
  EPS,
  round,
  pct,
  all,
  first,
  sumOf,
  plainSum,
  MAGIC_SHOT_DURATION,
  CARINO_PATTERNS,
  SPECIAL_AMMO_LEVEL,
  L,
} from "./trait-lines.js";

/** Ranger of Glory's Special Ammo slots: which selections count and why the others do not. */
function specialAmmoSlots(hero, { expert, prepared, installedSupportNames = [] }) {
  const selections = Array.isArray(hero?.carinoSpecialAmmoSupports) ? hero.carinoSpecialAmmoSupports : [];
  const installed = new Set(installedSupportNames);
  return [0, 1, 2]
    .map((index) => {
      const name = String(selections[index] || "");
      if (!name) return null;
      const open = index < 2 ? Boolean(expert) : Boolean(prepared);
      const support = tlidbSupportCatalog.find((entry) => entry.name === name) || null;
      const premium = support && ["magnificent", "noble"].includes(support.category);
      const reason = !open
        ? index < 2
          ? "slot opened by Ammo Expert (not picked)"
          : "slot opened by Well Prepared (not picked)"
        : !support
          ? "not a support in the catalog"
          : premium && !prepared
            ? "Magnificent and Noble supports need Well Prepared"
            : !supportCanSupportProjectile(support, tlidbSkillCatalog)
              ? "cannot support Projectile Skills"
              : installed.has(name)
                ? "it is on the skill panel (Special Ammo keyword: then it is not consumed)"
                : "";
      return { index, name, category: support?.category || null, eligible: !reason, reason };
    })
    .filter(Boolean);
}

/** Special Ammo and Magic Shot, before the per-cast distribution (the use-rate factor outside Magic Shot is the ammo cycle's). */
export function specialAmmoState(
  lines,
  { hero, inputs, modifierTexts, attackInc, castInc, magazine, r, rateFactorOut },
) {
  // ---- Special Ammo and Magic Shot (Ranger of Glory) ----
  const expertSlots = all(lines, "slots"),
    preparedSlots = all(lines, "slotsNoble");
  const expert = expertSlots.length > 0,
    prepared = preparedSlots.length > 0;
  let special = null;
  if (expert || prepared) {
    const slots = specialAmmoSlots(hero, {
      expert,
      prepared,
      installedSupportNames: inputs.installedSupportNames || [],
    });
    const eligible = slots.filter((slot) => slot.eligible);
    const moon = first(lines, "moonSpecial");
    const gale = first(lines, "galeShare");
    const galeBonus = gale ? (Number(gale.match[1]) / 100) * (attackInc + castInc) : 0;
    const chancePercent = sumOf(all(lines, "reloadChance")) + (moon ? Number(moon.match[1]) : 0) + galeBonus;
    const chance = Math.max(0, Math.min(1, chancePercent / 100));
    const bonusLines = all(lines, "specialBonus").map((item) => ({
      source: item.line.source,
      text: item.line.clean,
      value: Number(item.match[1]),
    }));
    const landslideBonus = first(lines, "landslideBonus");
    const landslideAll = Boolean(first(lines, "landslideAll"));
    const gain = first(lines, "magicShotGain");
    const never = first(lines, "neverStopping");
    const n = eligible.length;
    const M = Math.max(1, magazine);
    const castsOut = r !== null ? r * rateFactorOut : null;
    let magic = null;
    if (gain && n > 0 && chance > 0) {
      const gainChance = Number(gain.match[1]) / 100,
        baseSeconds = Number(gain.match[2]),
        interval = Number(gain.match[3]);
      const durationPercent = (moon ? Number(moon.match[2]) : 0) + plainSum(modifierTexts, MAGIC_SHOT_DURATION);
      const d0 = baseSeconds * (1 + durationPercent / 100);
      const castsPerReloadIn = landslideAll ? 1 : Math.max(1, M / KEYWORDS.magicShot.ammoPerCast);
      const lambdaOut = castsOut !== null ? (n * chance * castsOut) / M : null;
      const lambdaIn = r !== null ? (n * chance * r) / castsPerReloadIn : null;
      const extension = never ? Number(never.match[1]) : 0;
      let duration = d0,
        uptime = 0,
        waitSeconds = null,
        permanent = false;
      if (r !== null && r > 0) {
        if (extension > 0) {
          const load = extension * lambdaIn;
          if (load >= 1 - EPS) {
            duration = Infinity;
            permanent = true;
          } else duration = d0 / (1 - load);
        }
        const lambda = duration > interval ? lambdaIn : lambdaOut;
        waitSeconds = lambda > 0 ? 1 / (gainChance * lambda) : Infinity;
        uptime = permanent
          ? 1
          : Number.isFinite(waitSeconds)
            ? Math.min(1, duration / Math.max(duration, interval + waitSeconds))
            : 0;
      }
      magic = {
        gainChance,
        baseSeconds,
        intervalSeconds: interval,
        durationPercent: round(durationPercent),
        baseDurationSeconds: round(d0),
        durationSeconds: Number.isFinite(duration) ? round(duration) : Infinity,
        permanent,
        extension,
        castsPerReloadIn: round(castsPerReloadIn),
        landslide: landslideAll,
        lambdaOut: lambdaOut === null ? null : round(lambdaOut),
        lambdaIn: lambdaIn === null ? null : round(lambdaIn),
        waitSeconds: waitSeconds === null ? null : Number.isFinite(waitSeconds) ? round(waitSeconds) : Infinity,
        uptime: round(uptime),
      };
    }
    special = {
      slots,
      eligible,
      n,
      chance: round(chance),
      chancePercent: round(chancePercent),
      galeBonus: round(galeBonus),
      bonusLines,
      landslideBonus: landslideBonus
        ? { source: landslideBonus.line.source, value: Number(landslideBonus.match[1]) }
        : null,
      landslideAll,
      magic,
      galeOrder: Boolean(first(lines, "galeOrder")),
    };
  }
  return special;
}

/** The per-cast distribution of the consumed supports and the special-cast bonus lines, once Magic Shot's uptime is known. */
export function settleSpecialAmmoVariants(special, { magazine, rateFactorOut, magicUptime }) {
  // Per-cast distribution of the consumed supports (subsets of the eligible slots) and the special-cast bonus lines.
  if (special && special.n > 0 && special.chance > 0) {
    const M = Math.max(1, magazine),
      p = special.chance,
      n = special.n;
    const castsOut = (1 - magicUptime) * rateFactorOut,
      castsIn = magicUptime;
    const shareIn = castsOut + castsIn > 0 ? castsIn / (castsOut + castsIn) : 0;
    const perReloadIn = special.magic ? special.magic.castsPerReloadIn : 1;
    const outsideEach = Math.min(1 / n, p / M);
    const variants = [];
    for (let mask = 1; mask < 1 << n; mask++) {
      const members = special.eligible.filter((_, index) => mask & (1 << index));
      const size = members.length;
      const outside = size === 1 ? outsideEach : 0;
      const inside = special.magic
        ? special.eligible.reduce((product, _, index) => product * (mask & (1 << index) ? p : 1 - p), 1) / perReloadIn
        : 0;
      const weight = (1 - shareIn) * outside + shareIn * inside;
      if (weight > EPS)
        variants.push({
          names: members.map((slot) => slot.name),
          count: size,
          weight: round(weight),
          additional: [
            ...special.bonusLines.map((line) => ({
              source: line.source,
              text: `${line.text} (a Special Ammo consumed)`,
              value: line.value,
            })),
            ...(special.landslideBonus
              ? [
                  {
                    source: special.landslideBonus.source,
                    text: `+${special.landslideBonus.value}% additional damage for every Special Ammo consumed × ${size}`,
                    value: special.landslideBonus.value * size,
                  },
                ]
              : []),
          ],
        });
    }
    special.shareIn = round(shareIn);
    special.variants = variants;
    special.specialShare = round(variants.reduce((total, item) => total + item.weight, 0));
  } else if (special) {
    special.variants = [];
    special.specialShare = 0;
    special.shareIn = 0;
  }
}

/** Royal Arsenal (revived): the Main Skill's activated Noble supports. */
export function arsenalState(lines, { inputs }) {
  // ---- Royal Arsenal (revived, Ranger of Glory) ----
  const arsenalLine = first(lines, "arsenalNoble");
  const arsenal = arsenalLine
    ? (() => {
        const per = Number(arsenalLine.match[1]),
          cap = Number(arsenalLine.match[2]);
        const nobles = inputs.mainNobleSupports || [];
        const value = round(Math.min(cap, per * nobles.length));
        return { per, cap, nobles, value, source: arsenalLine.line.source };
      })()
    : null;
  return arsenal;
}

/** The badge of a Special Ammo / Royal Arsenal clause, or null when the clause is another mechanic's. */
export function rangerRead(key, text, state) {
  const noProjectile = "no active Projectile skill";
  const { rate, special, arsenal } = state;
  switch (key) {
    // ---- Special Ammo ----
    case "slots":
    case "slotsNoble":
    case "reloadChance":
    case "moonSpecial":
    case "galeShare": {
      if (!special) return L("Inactive", "no Special Ammo slot (Ammo Expert / Well Prepared)");
      const skipped = special.slots.filter((slot) => !slot.eligible);
      const skippedText = skipped.length
        ? `; not counted: ${skipped.map((slot) => `${slot.name} (${slot.reason})`).join(", ")}`
        : "";
      if (!state.projectile) return L("Inactive", noProjectile);
      if (!special.n)
        return L("Inactive", `no counted Special Ammo support in the slots (Hero → Special Ammo)${skippedText}`);
      if (key === "galeShare" && !(special.galeBonus > 0)) return L("Inactive", "no increased Attack or Cast Speed");
      if (key === "moonSpecial" && !special.magic)
        return L(
          "In calc",
          `+${text.match(CARINO_PATTERNS.moonSpecial)[1]}% special-ammo reload chance: ${pct(special.chance)}% per slot (the Magic Shot Duration part needs Ammo Expert's Magic Shot)`,
        );
      return L(
        "In calc",
        `${special.eligible.map((slot) => slot.name).join(", ")} (Lv. ${SPECIAL_AMMO_LEVEL}): reload chance ${pct(special.chance)}% per slot per magazine reload (${special.chancePercent}%${special.galeBonus ? `, Crushing Gale Trigger +${special.galeBonus}%` : ""}, capped at 100%) → ${pct(special.specialShare)}% of Projectile casts consume a Special Ammo and gain its support's hit effects (provisional)${skippedText}`,
      );
    }
    case "specialBonus":
    case "landslideBonus": {
      if (!special?.n || !state.projectile)
        return L("Inactive", !state.projectile ? noProjectile : "no counted Special Ammo support in the slots");
      return L(
        "In calc",
        `on the ${pct(special.specialShare)}% of Projectile casts that consume a Special Ammo${key === "landslideBonus" ? ", per Special Ammo consumed" : ""} (variant hits; provisional)`,
      );
    }
    case "magicShotGain":
    case "neverStopping":
    case "landslideAll": {
      const magic = special?.magic;
      if (!magic)
        return L(
          "Inactive",
          !special?.n
            ? "no counted Special Ammo support in the slots"
            : "no Special Ammo is consumed (reload chance 0)",
        );
      if (!(magic.uptime > 0))
        return L(
          "Inactive",
          rate.measured
            ? "no Special Ammo consumed on the dummy"
            : "Magic Shot's uptime follows the Projectile cast rate the hit pass measures",
        );
      if (key === "neverStopping")
        return magic.extension > 0
          ? L(
              "In calc",
              magic.permanent
                ? `${magic.extension} s per Special Ammo consumed × ${magic.lambdaIn}/s under Magic Shot >= 1 s per second: Magic Shot never ends (provisional)`
                : `Magic Shot lasts ${magic.durationSeconds} s (${magic.baseDurationSeconds} s ÷ (1 − ${magic.extension} s × ${magic.lambdaIn} Special Ammo/s); provisional)`,
            )
          : L("Inactive", "no extension");
      if (key === "landslideAll")
        return L(
          "In calc",
          `under Magic Shot each cast consumes the whole magazine and the instant reload refills every slot (chance ${pct(special.chance)}%), so every cast consumes the loaded Special Ammo together (provisional)`,
        );
      return L(
        "In calc",
        `Magic Shot up ${pct(magic.uptime)}% of the time (${magic.permanent ? "permanent" : `${magic.durationSeconds} s every max(${magic.durationSeconds} s, ${magic.intervalSeconds} s + ${magic.waitSeconds} s expected wait at ${magic.gainChance * 100}% per Special Ammo)`}): 3 ammo per cast, instant reloads (no downtime), the loaded Special Ammo consumed together every ${magic.castsPerReloadIn} cast(s) (provisional)`,
      );
    }
    case "galeOrder":
      return !special?.n
        ? L("Inactive", "no counted Special Ammo support in the slots")
        : L(
            "No DPS effect",
            "the order changes which support a reload fills first, not how many Special Ammo are consumed (each slot is rolled at every reload; provisional)",
          );
    case "arsenalNoble": {
      if (!arsenal) return L("Inactive", "Royal Arsenal is not in the build");
      const body = `+${arsenal.value}% additional Projectile Damage`;
      if (!state.projectile) return L("Inactive", noProjectile);
      return arsenal.value > 0
        ? L(
            "In calc",
            `${arsenal.nobles.length} activated Noble support(s) on the Main Skill (${arsenal.nobles.join(", ")}) × ${arsenal.per}% (up to ${arsenal.cap}%): ${body} (provisional)`,
            { bodies: [body] },
          )
        : L("Inactive", "no Noble support on the Main Skill");
    }
    default:
      return null;
  }
}
