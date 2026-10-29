// Youga's badge modules (packages/engine/src/heroes/hero-trait-modules.js reads them): each row of the module table, the trait
// lines it reads and its badge handler, for Spacetime Illusion, Spacetime Elapse and The Ultimate One; with the Illusion and
// Twisted Spacetime readings (resolveIllusionState, resolveSpacetimeState) the planner and the handlers share.
import { cleanGameText } from "../../text/percentage-text.js";
import { yougaClauseKey, yougaLineStatus } from "./the-ultimate-one.js";
import {
  ILLUSION_RECENT_SECONDS,
  endlessManaDamage,
  illusionRate,
  makeItQuickDamage,
  meAndMyselfFrequency,
  stacksHeld,
} from "./spacetime-illusion.js";
import { twistedSpacetime } from "./spacetime-elapse.js";

const num = (text) => Number(String(text).replace("−", "-"));
const round = (value) => Math.round(value * 10000) / 10000;

const PATTERNS = {
  illusionUse:
    /^The Spacetime Illusion uses your Main Skill once every ([\d.]+) s\. The Spacetime Illusion ?'s castings are considered your castings$/i,
  illusionFrequency: /^\+(\d+(?:\.\d+)?)% Spacetime Illusion Cast Frequency$/i,
  illusionDamage: /^([+-]?\d+(?:\.\d+)?)% additional Spacetime Illusion Damage$/i,
  illusionUnableMain: /^Unable to cast the Main Skill$/i,
  illusionLimit: /^\+(\d+) Spacetime Illusion upper limit$/i,
  // Hero trait audit B4 (packages/engine/src/heroes/youga/spacetime-illusion.js, packages/engine/src/heroes/youga/spacetime-elapse.js).
  illusionOwn: /^Own Spacetime Illusion$/i,
  illusionRecall: /^While having Spacetime Illusion ?, click the Trait Skill to recall Spacetime Illusion$/i,
  illusionMoon:
    /^\+?(\d+(?:\.\d+)?) ?% Cooldown Recovery Speed every time you or the Spacetime Illusion casts a skill\. Lasts for ([\d.]+) ?s\. Stacks up to (\d+) time\(s\)$/i,
  meAndMyself:
    /^For every \+5 ?% Cooldown Recovery Speed or 2\.5 ?% additional Cooldown Recovery Speed, \+?(\d+(?:\.\d+)?) ?% Spacetime Illusion Cast Frequency$/i,
  makeItQuick: /^Spacetime Illusion no longer has casting actions and is only limited by cast frequency\.?$/i,
  makeItQuickShare:
    /^(\d+(?:\.\d+)?) ?% of the bonuses for Cast Speed is also applied to additional Spacetime Illusion Damage, up to (\d+(?:\.\d+)?) ?%\.?$/i,
  endlessMana: /^Seals (\d+(?:\.\d+)?) ?% Max Mana\. Spacetime Illusion no longer has Cast Frequency limitations$/i,
  endlessManaDamage:
    /^\+?(\d+(?:\.\d+)?) ?% additional Spacetime Illusion Damage for every \+(\d+(?:\.\d+)?) ?% Spacetime Illusion Cast Frequency$/i,
  outOfManaCost: /^Casting of Spacetime Illusion will consume your Mana, equal to the Mana Cost of your Main Skill$/i,
  outOfMana:
    /^\+?(\d+(?:\.\d+)?) ?% additional damage for you and Spacetime Illusion for each time Spacetime Illusion consumed Mana recently\. Stacks up to (\d+) time\(s\)$/i,
  telepathy: /^When Spacetime Illusion consumes Spell Burst, it also attempts to consume Spell Burst for Youga$/i,
  elapseCast:
    /^Clicking the Trait Skill or dealing Damage Over Time to an enemy casts Twisted Spacetime ?\. Interval: ([\d.]+) ?s\. Lasts for ([\d.]+) ?s$/i,
  elapseMove:
    /^While Twisted Spacetime is active, cast Twisted Spacetime again to move it and extend its Duration by ([\d.]+)$/i,
  elapseRecord:
    /^Records (\d+(?:\.\d+)?) ?% of Damage Over Time, Reaping Damage, and Additional Damage dealt to enemies while Twisted Spacetime is active$/i,
  elapseTurbulence:
    /^After moving, Twisted Spacetime inflicts Turbulence on enemies within, having them share the damage it records equally and clearing the records$/i,
  elapseSpeedUp:
    /^For every 1 ?s Twisted Spacetime lasts, \+?(\d+(?:\.\d+)?) ?% to all recorded damage for Twisted Spacetime ?\. Stacks up to (\d+) time\(s\)$/i,
  elapseBonus: /^\+?(\d+(?:\.\d+)?) ?% to all recorded damage for Twisted Spacetime$/i,
  elapseUpheaval: /^\+?(\d+(?:\.\d+)?) ?% additional Damage Over Time while Twisted Spacetime lasts$/i,
  elapseElites: /^Twisted Spacetime only inflicts Spacetime Turbulence on Elites within its area/i,
  elapseDuration: /Spacetime Turbulence Duration$|additional Duration for Twisted Spacetime and Spacetime Turbulence$/i,
  elapseDeemed: /^Enemies with Spacetime Turbulence are deemed as being within Twisted Spacetime$/i,
  elapseToMyselfReap:
    /^When dealing damage to enemies in Twisted Spacetime, Reaps (\d+(?:\.\d+)?) ?s of Damage Over Time\. This effect has a (\d+(?:\.\d+)?) ?s interval for the same target$/i,
  elapseToMyselfInterval: /^The casting interval of Twisted Spacetime is reduced to (\d+(?:\.\d+)?) ?s$/i,
  elapseFollows: /^Twisted Spacetime only follows you$/i,
};

// Youga clause → badge module (packages/engine/src/heroes/youga/the-ultimate-one.js YOUGA_PATTERNS).
const YOUGA_GROUPS = Object.freeze({
  coreShare: "yougaCore",
  nonMain: "yougaCore",
  coreGrant: "yougaCore",
  moonTangle: "yougaCore",
  moonDamage: "yougaCore",
  recalled: "yougaRecall",
  huntCast: "yougaRecall",
  huntTrack: "yougaRecall",
  huntRecall: "yougaRecall",
  huntPenetration: "yougaRecall",
  claimGain: "yougaVault",
  claimExtend: "yougaVault",
  doomDefer: "yougaVault",
  doomInversion: "yougaVault",
  threadsLinks: "yougaChains",
  threadsCooldown: "yougaChains",
  threadsTransfer: "yougaChains",
  threadsRatio: "yougaChains",
  commandGain: "yougaChains",
  commandDominion: "yougaChains",
  measureExtend: "yougaSelves",
  measureEffect: "yougaSelves",
  measureDuration: "yougaSelves",
  liftSummon: "yougaSelves",
  liftRestore: "yougaSelves",
  liftDamage: "yougaSelves",
});

// Youga – Spacetime Illusion (hero trait audit B4; packages/engine/src/heroes/youga/spacetime-illusion.js). `state.yougaSpacetime` carries what the hit pass
// measured (packages/engine/src/planner.js hitRateFacts.youga, then the settled pass): the Main Skill's own cast rate, every cast per second
// (yours and the Illusion's) and the character's increased Cast Speed. Before the hits: the moon and I'm Out of Mana held at
// their caps, Eeeendless Mana at the frequency rate.
const sumMatches = (traits, pattern, group = 1) =>
  traits
    .filter((item) => pattern.test(item.clean))
    .reduce((total, item) => total + num(item.clean.match(pattern)[group]), 0);
const firstMatch = (traits, pattern) => traits.map((item) => item.clean.match(pattern)).find(Boolean) || null;
export function resolveIllusionState(traitLines = [], state = {}) {
  const traits =
    traitLines[0]?.clean !== undefined
      ? traitLines
      : traitLines.map((line) => ({
          ...line,
          clean: cleanGameText(String(line.text ?? "")),
        }));
  const use = firstMatch(traits, PATTERNS.illusionUse);
  if (!use) return null;
  const measured = state.yougaSpacetime || null;
  const intervalSeconds = num(use[1]);
  const count = 1 + sumMatches(traits, PATTERNS.illusionLimit);
  const playerCasts = !traits.some((item) => PATTERNS.illusionUnableMain.test(item.clean));
  const plainFrequency = sumMatches(traits, PATTERNS.illusionFrequency);
  // The moon: +X% Cooldown Recovery Speed per cast (yours and the Illusion's), 8 s, up to 10.
  const moonMatch = firstMatch(traits, PATTERNS.illusionMoon);
  const moon = moonMatch
    ? (() => {
        const perCast = num(moonMatch[1]),
          seconds = num(moonMatch[2]),
          maxStacks = num(moonMatch[3]);
        const castsPerSecond = Number.isFinite(measured?.castsPerSecond) ? measured.castsPerSecond : null;
        const stacks = castsPerSecond === null ? maxStacks : stacksHeld(castsPerSecond, seconds, maxStacks);
        return { perCast, seconds, maxStacks, castsPerSecond, stacks, percent: round(perCast * stacks) };
      })()
    : null;
  // Me and Myself: Cast Frequency per +5% Cooldown Recovery Speed (the stat sheet's plus the moon's) or 2.5% additional.
  const meMatch = firstMatch(traits, PATTERNS.meAndMyself);
  const cdrIncreased = (Number(state.cooldownRecoverySpeedPercent) || 0) + (moon?.percent || 0);
  const cdrAdditional = Number(state.additionalCooldownRecoverySpeedPercent) || 0;
  const meAndMyself = meMatch
    ? {
        perStepPercent: num(meMatch[1]),
        increasedPercent: round(cdrIncreased),
        additionalPercent: round(cdrAdditional),
        ...meAndMyselfFrequency({
          increasedPercent: cdrIncreased,
          additionalPercent: cdrAdditional,
          perStepPercent: num(meMatch[1]),
        }),
      }
    : null;
  const castFrequencyPercent = round(plainFrequency + (meAndMyself?.percent || 0));
  const endless = firstMatch(traits, PATTERNS.endlessMana);
  const quick = traits.some((item) => PATTERNS.makeItQuick.test(item.clean));
  const rate = illusionRate({
    intervalSeconds,
    count,
    castFrequencyPercent,
    endlessMana: Boolean(endless),
    makeItQuick: quick,
    playerCastsPerSecond: measured?.playerCastsPerSecond ?? null,
  });
  const endlessDamageMatch = firstMatch(traits, PATTERNS.endlessManaDamage);
  const endlessPercent = endlessDamageMatch
    ? round(endlessManaDamage(castFrequencyPercent, num(endlessDamageMatch[1]), num(endlessDamageMatch[2])))
    : 0;
  const quickMatch = firstMatch(traits, PATTERNS.makeItQuickShare);
  const castSpeedIncreasedPercent = Number.isFinite(measured?.castSpeedIncreasedPercent)
    ? measured.castSpeedIncreasedPercent
    : Number(state.castSpeedStatPercent) || 0;
  const quickPercent = quickMatch
    ? round(makeItQuickDamage(castSpeedIncreasedPercent, num(quickMatch[1]), num(quickMatch[2])))
    : 0;
  // "additional Spacetime Illusion Damage" lines multiply; Eeeendless Mana's and Make it Quick's conversions both write the same
  // attribute (57191, game records 257393 / 101140027), so they add into one term (provisional).
  const plainFactor = traits
    .filter((item) => PATTERNS.illusionDamage.test(item.clean))
    .reduce((factor, item) => factor * (1 + num(item.clean.match(PATTERNS.illusionDamage)[1]) / 100), 1);
  const damageFactor = plainFactor * (1 + (endlessPercent + quickPercent) / 100);
  // I'm Out of Mana: one stack per Illusion cast in the last 4 s (buff 81520), up to 10; Mana assumed sufficient (best case).
  const outMatch = firstMatch(traits, PATTERNS.outOfMana);
  const outOfMana = outMatch
    ? (() => {
        const perStack = num(outMatch[1]),
          maxStacks = num(outMatch[2]);
        const stacks = stacksHeld(rate.usesPerSecond, ILLUSION_RECENT_SECONDS, maxStacks);
        return { perStack, maxStacks, stacks: round(stacks), percent: round(perStack * stacks) };
      })()
    : null;
  return {
    intervalSeconds,
    count,
    castFrequencyPercent,
    plainFrequencyPercent: plainFrequency,
    usesPerSecond: rate.usesPerSecond,
    rateBasis: rate.basis,
    frequencyRate: rate.frequencyRate,
    openRate: rate.open,
    damageFactor,
    plainFactor,
    playerCasts,
    source: traits.find((item) => PATTERNS.illusionUse.test(item.clean))?.source || null,
    moon,
    meAndMyself,
    endlessMana: endless ? { sealPercent: num(endless[1]), damagePercent: endlessPercent } : null,
    makeItQuick:
      quick || quickMatch
        ? {
            noCastingAction: quick,
            sharePercent: quickMatch ? num(quickMatch[1]) : 0,
            capPercent: quickMatch ? num(quickMatch[2]) : 0,
            castSpeedIncreasedPercent: round(castSpeedIncreasedPercent),
            damagePercent: quickPercent,
          }
        : null,
    outOfMana,
    telepathy: traits.some((item) => PATTERNS.telepathy.test(item.clean)),
    measured: Boolean(measured),
  };
}

// Youga – Spacetime Elapse (hero trait audit B4; packages/engine/src/heroes/youga/spacetime-elapse.js): Twisted Spacetime and Turbulence on the dummy (Q-H6).
// `state.dealsDamageOverTime`: an active damaging ailment or skill DoT (packages/engine/src/planner.js).
export function resolveSpacetimeState(traitLines = [], state = {}) {
  const traits =
    traitLines[0]?.clean !== undefined
      ? traitLines
      : traitLines.map((line) => ({
          ...line,
          clean: cleanGameText(String(line.text ?? "")),
        }));
  const cast = firstMatch(traits, PATTERNS.elapseCast);
  if (!cast) return null;
  const dot = Boolean(state.dealsDamageOverTime);
  const toMyselfInterval = firstMatch(traits, PATTERNS.elapseToMyselfInterval);
  const intervalSeconds = toMyselfInterval ? num(toMyselfInterval[1]) : num(cast[1]);
  const moves = traits.some((item) => PATTERNS.elapseMove.test(item.clean));
  const record = firstMatch(traits, PATTERNS.elapseRecord);
  const releases = traits.some((item) => PATTERNS.elapseTurbulence.test(item.clean));
  const speedUp = firstMatch(traits, PATTERNS.elapseSpeedUp);
  const bonusPercent = sumMatches(traits, PATTERNS.elapseBonus);
  const recordPercent = record ? num(record[1]) : 0;
  const spacetime = twistedSpacetime({
    intervalSeconds,
    recordPercent,
    bonusPercent,
    speedUpPercent: speedUp ? num(speedUp[1]) : 0,
    speedUpMaxStacks: speedUp ? num(speedUp[2]) : 0,
  });
  const turbulence = dot && moves && releases && recordPercent > 0;
  const upheaval = firstMatch(traits, PATTERNS.elapseUpheaval);
  const reap = firstMatch(traits, PATTERNS.elapseToMyselfReap);
  return {
    active: dot,
    intervalSeconds,
    baseIntervalSeconds: num(cast[1]),
    durationSeconds: num(cast[2]),
    moves,
    releases,
    recordPercent,
    bonusPercent,
    speedUp: speedUp ? { perSecondPercent: num(speedUp[1]), maxStacks: num(speedUp[2]) } : null,
    sustainedShare: turbulence ? spacetime.sustainedShare : 0,
    turbulence,
    spacetime,
    upheavalPercent: upheaval ? num(upheaval[1]) : 0,
    toMyselfReap:
      reap && dot
        ? {
            source: `To Myself in Another Spacetime (${traits.find((item) => PATTERNS.elapseToMyselfReap.test(item.clean))?.source || "revived affix"})`,
            trigger: "dealing damage over time",
            baseDurationSeconds: num(reap[1]),
            baseRecoverySeconds: num(reap[2]),
            fixedRecovery: true,
            note: `To Myself in Another Spacetime: Reaps ${num(reap[1])} s of Damage Over Time on dealing damage to the dummy in Twisted Spacetime, once per ${num(reap[2])} s (an interval for the same target, not shortened by Reaping Recovery Speed; provisional)`,
          }
        : null,
  };
}

export function illusionBadge(line, module, ctx) {
  const { state, traits, entry, derive, youga } = ctx;
  // Hero trait audit B4 (packages/engine/src/heroes/youga/spacetime-illusion.js): one Illusion state per call; each clause reads it.
  const read = youga.illusion || (youga.illusion = resolveIllusionState(traits, state));
  const neutral = (status, why) => ctx.neutral(line, module, status, why);
  const noIllusion = "no Spacetime Illusion use line in the build";
  const pending = read && !read.measured ? " (held before the hit pass measures the rates)" : "";
  if (PATTERNS.illusionUse.test(line.clean)) {
    ctx.out.illusion = read;
    const frequency = read.castFrequencyPercent;
    entry(
      line,
      module,
      true,
      read.rateBasis === "casting action"
        ? `${round(read.usesPerSecond)} extra Main Skill uses/s: ${read.count} Illusion${read.count > 1 ? "s" : ""} × your Main Skill cast rate (Eeeendless Mana: no Cast Frequency limit, its own casting action; Q-H5, provisional)${read.damageFactor !== 1 ? `, ×${round(read.damageFactor)} Illusion damage` : ""}${read.playerCasts ? "" : "; the player casts no Main Skill"}`
        : `${round(read.usesPerSecond)} extra Main Skill uses/s (${read.count} Illusion${read.count > 1 ? "s" : ""} × (1 + ${frequency}% Cast Frequency) ÷ ${read.intervalSeconds} s)${read.damageFactor !== 1 ? `, ×${round(read.damageFactor)} Illusion damage` : ""}${read.playerCasts ? "" : "; the player casts no Main Skill"}`,
    );
  } else if (!read) entry(line, module, false, noIllusion);
  else if (PATTERNS.illusionOwn.test(line.clean))
    neutral("No DPS effect", "the Illusion itself; its use line carries the extra Main Skill uses");
  else if (PATTERNS.illusionRecall.test(line.clean))
    neutral(
      "No DPS effect",
      "recalling the Illusion moves it; the dummy stays in range (best case), so it changes no dummy damage",
    );
  else if (PATTERNS.illusionMoon.test(line.clean)) {
    const moon = read.moon,
      body = `+${moon.percent}% Cooldown Recovery Speed`;
    const held = `${round(moon.stacks)} of ${moon.maxStacks} stacks held (${moon.castsPerSecond === null ? "at the cap" : `${round(moon.castsPerSecond)} casts/s by you and the Illusion × ${moon.seconds} s`})${pending} × ${moon.perCast}% = ${body}`;
    // A reader of Cooldown Recovery Speed: Me and Myself's Cast Frequency or an active skill with a cooldown.
    const read_ = Boolean(read.meAndMyself) || Boolean(state.cooldownSkillActive);
    if (!(moon.percent > 0)) entry(line, module, false, held);
    else if (read_)
      entry(
        line,
        module,
        true,
        `${held} (${read.meAndMyself ? "Me and Myself's Cast Frequency" : "the cooldown skills' rate"} reads it; provisional)`,
        [body],
      );
    else
      neutral(
        "No DPS effect",
        `${held}; nothing in this build reads Cooldown Recovery Speed (no Me and Myself, no skill with a cooldown)`,
      );
    if (moon.percent > 0) derive(body, line.source, `Spacetime Illusion moon: ${round(moon.stacks)} stacks`);
  } else if (PATTERNS.meAndMyself.test(line.clean)) {
    const me = read.meAndMyself;
    entry(
      line,
      module,
      me.percent > 0,
      me.percent > 0
        ? `${me.steps} step(s) (+${me.increasedPercent}% Cooldown Recovery Speed ÷ 5 = ${me.fromIncreased}${me.additionalPercent ? `, ${me.additionalPercent}% additional ÷ 2.5 = ${me.fromAdditional}` : ""}; whole steps, provisional) × ${me.perStepPercent}% = +${me.percent}% Spacetime Illusion Cast Frequency`
        : `no Cooldown Recovery Speed step (+${me.increasedPercent}% increased, ${me.additionalPercent}% additional)`,
    );
  } else if (PATTERNS.makeItQuick.test(line.clean)) {
    if (read.endlessMana)
      neutral(
        "Not modeled",
        `with Eeeendless Mana as well nothing limits the Illusion's rate (Q-H5): the planner keeps Eeeendless Mana's rate (your Main Skill cast rate) until an in-game count`,
      );
    else
      neutral(
        "No DPS effect",
        `the Illusion's rate is already its Cast Frequency rate (${round(read.usesPerSecond)} uses/s; the casting action is not modeled), so this changes no figure`,
      );
  } else if (PATTERNS.makeItQuickShare.test(line.clean)) {
    const quick = read.makeItQuick;
    entry(
      line,
      module,
      quick.damagePercent > 0,
      quick.damagePercent > 0
        ? `${quick.sharePercent}% × +${quick.castSpeedIncreasedPercent}% Cast Speed (the character's increased Cast Speed${read.measured ? "" : ", stat sheet before the hit pass"}) = +${quick.damagePercent}% additional Spacetime Illusion Damage (cap ${quick.capPercent}%; increased Cast Speed only, provisional)`
        : "no increased Cast Speed",
    );
  } else if (PATTERNS.endlessMana.test(line.clean)) {
    entry(
      line,
      module,
      true,
      `the Illusion casts with its own casting action at your Main Skill cast rate (Q-H5 recommended reading, provisional)${read.measured ? `: ${round(read.usesPerSecond)} uses/s` : pending}${read.openRate ? "; with Make it Quick the rate is an open question" : ""}; ${read.endlessMana.sealPercent}% Max Mana sealed (Mana state)`,
    );
  } else if (PATTERNS.endlessManaDamage.test(line.clean)) {
    const percent = read.endlessMana?.damagePercent || 0;
    entry(
      line,
      module,
      percent > 0,
      percent > 0
        ? `+${read.castFrequencyPercent}% Spacetime Illusion Cast Frequency (whole 4% steps) → +${percent}% additional Spacetime Illusion Damage`
        : "no Spacetime Illusion Cast Frequency",
    );
  } else if (PATTERNS.outOfManaCost.test(line.clean)) {
    neutral(
      "No DPS effect",
      "each Illusion cast costs your Main Skill's Mana; Mana is assumed sufficient (best case), so only I'm Out of Mana's stacks read it",
    );
  } else if (PATTERNS.outOfMana.test(line.clean)) {
    const out = read.outOfMana,
      body = `+${out.percent}% additional damage`;
    entry(
      line,
      module,
      out.percent > 0,
      `${out.stacks} of ${out.maxStacks} stacks (Illusion casts in the last ${ILLUSION_RECENT_SECONDS} s, buff 81520: ${round(read.usesPerSecond)}/s × ${ILLUSION_RECENT_SECONDS} s)${pending} × ${out.perStack}% = ${body} for you and the Illusion (Mana assumed sufficient; provisional)`,
      out.percent > 0 ? [body] : [],
    );
    if (out.percent > 0) derive(body, line.source, `I'm Out of Mana: ${out.stacks} stacks`);
  } else if (PATTERNS.telepathy.test(line.clean)) {
    entry(
      line,
      module,
      Boolean(state.mainCanSpellBurst),
      state.mainCanSpellBurst
        ? "each Spell Burst the Illusion consumes also attempts yours: your activations come from your casts and the Illusion's (packages/engine/src/heroes/youga/spacetime-illusion.js settleIllusionStream; provisional)"
        : "the Main Skill cannot Spell Burst (no Max Spell Burst, or not a Spell that can)",
    );
  } else if (
    PATTERNS.illusionFrequency.test(line.clean) ||
    PATTERNS.illusionDamage.test(line.clean) ||
    PATTERNS.illusionUnableMain.test(line.clean) ||
    PATTERNS.illusionLimit.test(line.clean)
  )
    entry(line, module, true, "read by the Spacetime Illusion stream");
  else entry(line, { ...module, status: "Not modeled" }, false, "this Spacetime Illusion clause is not read");
}

export function elapseBadge(line, module, ctx) {
  const { state, traits, entry, derive, youga } = ctx;
  let match;
  const read = youga.spacetime || (youga.spacetime = resolveSpacetimeState(traits, state));
  const neutral = (status, why) => ctx.neutral(line, module, status, why);
  const noDot =
    "the build deals no damage over time, so Twisted Spacetime has nothing to record (and no DoT to cast it)";
  if (!read) {
    entry(line, module, false, "no Twisted Spacetime cast line in the build");
    return;
  }
  ctx.out.spacetime = read;
  const share = `${round(read.sustainedShare * 100)}% of the DoT and Reaping damage`;
  const cadence = `cast at once and recast every ${read.intervalSeconds} s while DoT ticks; each recast moves it and extends it, so it never ends (uptime 1)`;
  if (PATTERNS.elapseCast.test(line.clean))
    entry(line, module, read.active, read.active ? `${cadence} (Q-H6; provisional)` : noDot);
  else if (PATTERNS.elapseMove.test(line.clean))
    entry(
      line,
      module,
      read.active,
      read.active ? `a move every ${read.intervalSeconds} s releases Turbulence (Q-H6; provisional)` : noDot,
    );
  else if (PATTERNS.elapseRecord.test(line.clean))
    entry(
      line,
      module,
      read.turbulence,
      read.turbulence
        ? `records ${read.recordPercent}% of the DoT and Reaping damage; Turbulence re-deals ${share} (the "to all recorded damage" bonuses included; "Additional Damage" not modeled separately; Q-H6, provisional)`
        : noDot,
    );
  else if (PATTERNS.elapseTurbulence.test(line.clean))
    entry(
      line,
      module,
      read.turbulence,
      read.turbulence
        ? `the dummy is the only enemy within, so it takes the whole record at each move: ${share}, at once (Q-H6; provisional)`
        : noDot,
    );
  else if (PATTERNS.elapseSpeedUp.test(line.clean))
    entry(
      line,
      module,
      read.turbulence,
      read.turbulence
        ? `+${read.speedUp.perSecondPercent}% per whole second the Spacetime has lasted at each release, up to ${read.speedUp.maxStacks} (sustained: +${round(read.speedUp.perSecondPercent * read.speedUp.maxStacks)}%; the windows count from 0; provisional)`
        : noDot,
    );
  else if (PATTERNS.elapseBonus.test(line.clean))
    entry(
      line,
      module,
      read.turbulence,
      read.turbulence ? `+${read.bonusPercent}% to all recorded damage: Turbulence re-deals ${share}` : noDot,
    );
  else if ((match = line.clean.match(PATTERNS.elapseUpheaval))) {
    const body = `+${num(match[1])}% additional Damage Over Time`;
    entry(
      line,
      module,
      read.active,
      read.active
        ? `Twisted Spacetime lasts the whole time the build deals damage over time (${cadence}): ${body}`
        : noDot,
      read.active ? [body] : [],
    );
    if (read.active) derive(body, line.source, "Twisted Spacetime held");
  } else if (PATTERNS.elapseElites.test(line.clean))
    neutral(
      "No DPS effect",
      "the training dummy is a Boss (so an Elite), so Turbulence still lands on it and the records clear as usual",
    );
  else if (PATTERNS.elapseDuration.test(line.clean))
    neutral(
      "No DPS effect",
      `Twisted Spacetime never ends while it is recast every ${read.intervalSeconds} s, and Turbulence settles its record at once (provisional), so a duration changes no dummy damage`,
    );
  else if (PATTERNS.elapseDeemed.test(line.clean))
    neutral("No DPS effect", "the dummy is always within Twisted Spacetime (it never ends; best case)");
  else if (PATTERNS.elapseFollows.test(line.clean))
    neutral(
      "No DPS effect",
      "the Spacetime follows you with the dummy within 10 m inside it; a recast still moves it and releases Turbulence (provisional)",
    );
  else if (PATTERNS.elapseToMyselfInterval.test(line.clean))
    entry(
      line,
      module,
      read.turbulence,
      read.turbulence
        ? `Twisted Spacetime is recast every ${read.intervalSeconds} s: the same share per second, released sooner, so the 5 s / 20 s windows and the recount release more of it`
        : noDot,
    );
  else if (PATTERNS.elapseToMyselfReap.test(line.clean))
    entry(
      line,
      module,
      Boolean(read.toMyselfReap),
      read.toMyselfReap
        ? `a Reaping source: ${read.toMyselfReap.baseDurationSeconds} s of every DoT on the dummy once per ${read.toMyselfReap.baseRecoverySeconds} s (the dummy is always in Twisted Spacetime; the interval is not shortened by Reaping Recovery Speed; Reaping Duration applies; provisional)`
        : noDot,
    );
  else entry(line, { ...module, status: "Not modeled" }, false, "this Twisted Spacetime clause is not read");
}

// Youga – The Ultimate One (packages/engine/src/heroes/youga/the-ultimate-one.js yougaLineStatus): each clause's status and reason from the Clockwork
// Core / trait-skill state (build-level before the hits, settled after them).
export function ultimateOneBadge(line, module, ctx) {
  const { state, entries, entry } = ctx;
  const read = yougaLineStatus(state, yougaClauseKey(line.clean));
  if (!read) {
    entry(line, { ...module, status: "Not modeled" }, false, "this Youga clause is not read");
    return;
  }
  entries.push({
    source: line.source,
    origin: "trait",
    text: line.clean,
    active: read.status === "In calc",
    conditionText: `${module.label}: ${read.reason}`,
    status: read.status,
    provisional: true,
    bodies: [],
    condition: "heroModule",
    group: null,
    module: module.key,
  });
}

/** Youga's hero-exclusive revived lines the Spacetime modules read (packages/engine/src/heroes/hero-exclusive-revivals.js MODULE_LINES). */
export function yougaRevivedLine(heroId, clean) {
  if (heroId === "youga-spacetime-illusion") return PATTERNS.telepathy.test(clean);
  if (heroId === "youga-spacetime-elapse")
    return (
      PATTERNS.elapseToMyselfReap.test(clean) ||
      PATTERNS.elapseToMyselfInterval.test(clean) ||
      PATTERNS.elapseFollows.test(clean) ||
      /^\+\d+(?:\.\d+)?% Spacetime Turbulence Duration$/i.test(clean)
    );
  return false;
}

export const YOUGA_MODULES = Object.freeze([
  {
    key: "illusion",
    heroes: /^youga-spacetime-illusion$/,
    label: "Youga: Spacetime Illusion",
    status: "Provisional",
    rule: "\"The Spacetime Illusion uses your Main Skill once every 1.5 s. The Spacetime Illusion's castings are considered your castings\": an extra stream of Main Skill uses at (1 ÷ 1.5 s) × (1 + Spacetime Illusion Cast Frequency), each a full use of the Main Skill (modeled skill hits only); a Spell Main Skill that can Spell Burst does so on the Illusion's casts with its own charge. Hero trait audit B4 (packages/engine/src/heroes/youga/spacetime-illusion.js; provisional): Me and Myself's Cast Frequency per +5% Cooldown Recovery Speed or 2.5% additional, the moon's Cooldown Recovery Speed stacks per cast (you and the Illusion), Eeeendless Mana's rate (Q-H5: the Illusion's own casting action at your Main Skill cast rate; with Make it Quick as well the rate is an open question) and its damage per 4% Cast Frequency and 25% Mana seal, Make it Quick's Cast Speed share, I'm Out of Mana's stacks (Illusion casts in the last 4 s; Mana assumed sufficient), Telepathy Expert's shared Spell Burst.",
    // "Unable to cast the Main Skill" (I'm an Illusion) is read by the Illusion stream (playerCasts; hero trait audit B1, F6).
    lines: /Spacetime Illusion|^Unable to cast the Main Skill$/i,
    badge: illusionBadge,
  },
  {
    key: "elapse",
    heroes: /^youga-spacetime-elapse$/,
    label: "Youga: Twisted Spacetime",
    status: "Provisional",
    rule: 'Hero trait audit B4 (packages/engine/src/heroes/youga/spacetime-elapse.js; Q-H6 recommended reading, provisional): damage over time on the dummy casts Twisted Spacetime at once and again every casting interval (2 s; To Myself in Another Spacetime: 1 s); each recast moves it and extends it by 2 s, so it never ends (uptime 1, the dummy inside). Each move releases Spacetime Turbulence: the dummy, the only enemy within (a Boss, so an Elite), takes the whole record, record% × (1 + Spacetime Pause\'s and Spacetime Speed-up\'s "to all recorded damage", Speed-up at the whole seconds lasted) of the DoT and Reaping damage dealt since the last move, at once. Turbulence durations change no dummy damage. "Additional Damage" is not modeled separately. Spacetime Upheaval\'s +X% additional Damage Over Time holds whenever the build deals damage over time.',
    // Twisted Spacetime (B4): Spacetime Cutting's "additional damage taken while Twisted Spacetime lasts" (defensive), Speed-up's
    // on-defeat interval and Private Universe's Skill Area stay with the generic readers.
    lines: {
      test: (text) =>
        /Twisted Spacetime|Spacetime Turbulence/i.test(text) &&
        !/additional damage taken while Twisted Spacetime lasts$|on defeat$|Twisted Spacetime Skill Area$/i.test(text),
    },
    badge: elapseBadge,
  },
  // Youga – The Ultimate One (2026-10-17; packages/engine/src/heroes/youga/the-ultimate-one.js settles the clauses, packages/engine/src/planner.js applies them to the skill
  // Clockwork Core supports): plain stat lines (Cooldown Recovery Speed, Skill Effect Duration, Movement Speed) reach the generic
  // readers; the board changes are applied by packages/engine/src/heroes/trait-board-grants.js. Each clause below is read from state.yougaUltimateOne
  // (yougaLineStatus: In calc / Inactive / Not on dummy / No DPS effect, with the reason).
  {
    key: "yougaCore",
    heroes: /^youga-the-ultimate-one$/,
    label: "Youga: Clockwork Core",
    status: "Provisional",
    rule: "I Am the Ultimate One: the Core's additional damage from the Cooldown Recovery Speed and Skill Effect Duration bonuses (180% of the increased pools, capped), Clockwork Core on the Main Skill (every Tangle attached to the Core triggers the skill at its casting interval, user-supplied 2026-10-18; only these Core triggers hit, the player's casts only summon or move the Core: user-decided 2026-10-18 from game-code evidence; the Core's crit cooldown reduction; Core bonuses reach the skill), the non-Main Tangle and Spell Burst blocks, and Artificial Moon (+1 Max Tangle Quantity and +20% additional Core damage per +1 Max Sentry Quantity). Provisional readings: packages/engine/src/heroes/youga/the-ultimate-one.js header.",
    lines: { test: (text) => YOUGA_GROUPS[yougaClauseKey(text)] === "yougaCore" },
    badge: ultimateOneBadge,
  },
  {
    key: "yougaRecall",
    heroes: /^youga-the-ultimate-one$/,
    label: "Youga: Recall",
    status: "Provisional",
    rule: "Recall while Stasis Vault is active: a projectile that passes through the dummy (always Penetrate), touches the vault and is Recalled hits the dummy again, once per Recall at full damage, for Core-triggered casts inside the Vault (the player's casts fire nothing: user-decided 2026-10-18; Max Recall Count: base 1, once per trajectory, + I Will Hunt You Down's +1 per Jump, up to +2: user-supplied 2026-10-18); the Recalled-only damage lines; I Will Hunt You Down's Cast Speed penalty on the Core's triggers only while the Vault is active (user-supplied 2026-10-18). The return path crossing the dummy: provisional (switch \"Recalled projectiles hit the dummy\").",
    lines: { test: (text) => YOUGA_GROUPS[yougaClauseKey(text)] === "yougaRecall" },
    badge: ultimateOneBadge,
  },
  {
    key: "yougaVault",
    heroes: /^youga-the-ultimate-one$/,
    label: "Youga: Stasis Vault",
    status: "Provisional",
    rule: "Stasis Vault pressed on cooldown (Trait Skill switch): uptime min(1, 8 s × Skill Effect Duration ÷ cooldown); I Come to Claim My Due's Centralization (2 per Recall, 4 s each) and its Vault extension at 20+ stacks; I See No Doomsday Today is defensive (No DPS effect).",
    lines: { test: (text) => YOUGA_GROUPS[yougaClauseKey(text)] === "yougaVault" },
    badge: ultimateOneBadge,
  },
  {
    key: "yougaChains",
    heroes: /^youga-the-ultimate-one$/,
    label: "Youga: Chains of Enslavement",
    status: "Provisional",
    rule: "Chains of Enslavement transfer damage between linked enemies (Not on dummy: one enemy); I Command All's Governance from hits on the linked Elite dummy while Supreme Descent is pressed on cooldown (link duration unpublished: held, provisional); Absolute Dominion stops non-Boss enemies only (Not on dummy).",
    lines: { test: (text) => YOUGA_GROUPS[yougaClauseKey(text)] === "yougaChains" },
    badge: ultimateOneBadge,
  },
  {
    key: "yougaSelves",
    heroes: /^youga-the-ultimate-one$/,
    label: "Youga: Selves of All Realms",
    status: "Provisional",
    rule: "Selves of All Realms pressed on cooldown: its Alternate Spacetime Youga effect on the supported skill at its uptime; I Am the Measure of All Time (cooldown extended by Cooldown Recovery Speed, capped at 24 s; +X% effect scales each value and cap; duration increases at 200%); I Need Not Lift a Finger's +X% additional Core damage while active and 4 s after. Provisional.",
    lines: { test: (text) => YOUGA_GROUPS[yougaClauseKey(text)] === "yougaSelves" },
    badge: ultimateOneBadge,
  },
  {
    key: "yougaOther",
    heroes: /^youga-the-ultimate-one$/,
    label: "Youga: other clauses",
    status: "Not modeled",
    rule: "A Youga clause this model has no reader for (a wording that differs from the TLIDB text).",
    lines: {
      test: (text) =>
        !yougaClauseKey(text) &&
        /Clockwork Core|tangled|Tangle|Spell Burst|Recall|Stasis Vault|Supreme Descent|Selves of All Realms|Chains of Enslavement|Governance|Centralization/i.test(
          text,
        ),
    },
    badge: ultimateOneBadge,
  },
]);
