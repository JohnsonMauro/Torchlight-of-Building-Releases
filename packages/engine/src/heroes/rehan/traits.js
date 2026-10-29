// Rehan (Anger, Seething Silhouette): hero trait audit batch B10 (2026-10-19; research/hero-traits-audit-2026-10-19.md §5 B10, §8 B10,
// §6 Q-H1 / Q-H15). Pure: reads the build's trait lines (origin "trait"), the hero-exclusive revived lines the module reads
// (packages/engine/src/heroes/hero-exclusive-revivals.js MODULE_LINES: Hero's Resourcefulness, Furious Roar, Ancestral Hate's Life cost, Starfall Wasteland)
// and the rates the planner's hit pass measured (packages/engine/src/planner.js hitRateFacts.rehan), and returns
//   - rehanState: the Rage cycle (Rage gained outside Berserk, Berserk's drain and duration, its uptime), the Rage bonus level in each
//     phase, Burst (Anger) and the Seething Spirit (Seething Silhouette), Disarmed, the best-case switches and the recount assumptions;
//   - rehanPhaseLines: the Rage-driven lines for a phase weighting (the time average for the build, Berserk only for Burst and the
//     Spirit, the player's attacking time under Ritual of Offering's Disarm);
//   - rehanLineRead: one clause's status, reason and derived bodies (packages/engine/src/heroes/hero-trait-modules.js "rage" / "burst" / "spirit").
//
// Sourced:
// - Trait texts (TLIDB, SS14; packages/engine/data/heroes/all-hero-traits.generated.js); game tier records (audit §4.3; SS14 tier data):
//   Fury's Onslaught's second parameter (-33.33 / -36.31 / -39.02 / -41.52 / -43.82) is a Berserk + Seething Spirit additional damage
//   (affix 187841424: attr 5719 with tags 4030001 / 6001190), so the Spirit's casts take the player's +X% and this offset.
// - TLIDB keyword tooltips (Torchlight_Hyperlink_hover, fetched 2026-10-19, research/tlidb/fetch-cache/): Rage (ece24b16: "a
//   Berserker exclusive energy that has a default upper limit of 100"), Berserk (b3645c45: "gains bonuses twice the Max Rage while
//   Berserk is active; Berserk expires when you run out of Rage"), Burst (46230009: "deals … area explosion damage equal to 340% of
//   Weapon Damage to enemies within 3m. While Dual Wielding, the Base Damage is the average damage of both weapons. For every +1 to
//   Skill Level, Burst +10% additional damage (multiplies)"; tags Attack, Melee, Physical, Triggered, Area, Strength, Dexterity), Burst
//   Blast (219965c8: "1166-1944 Spell Physical Damage … The damage effect of this skill is 288%"; tags Spell, Physical, Triggered,
//   Area, Strength, Dexterity), Seething Spirit (bfe0c1e9: "casts your Non-Mobility and Non-Channeled Main Melee Attack Skills when it
//   appears"), Disarm (a54e950b: "unable to use Attack Skills when disarmed").
// - Game data (readable tables): config_skill_damage group 90000 "野蛮人_爆裂" (Barbarian Burst), one Lv. 1 row, 340% Weapon Damage at
//   +0x08 (the attack-row layout of Whirlwind 51 / 52); group 90003 (the same name), Physical 1166–1944 at 288% (Burst Blast). SS14 flat
//   extraction 2026-10-15 (session scratchpad), read only. Burst's trigger (affix 102360002): on hit (trigger 1000033, once per source)
//   while Berserk (state 4030001), cooldown p0 ÷ the Burst Cooldown Recovery attribute 7010 (Rampaging converts Attack Speed 6001 into
//   7010), trigger node 2320 (skill position 3000). config_char_field 2300106 "base Rage cost" 10 (Seething's cost per Melee cast).
//
// Provisional readings (src/app/stats/open-questions.js, shown only for Rehan):
// - Q-H1 (recommended): Max Rage 100 (now the TLIDB Rage keyword) + "+N Max Rage" lines. Berserk is entered at Max Rage and lasts until
//   Rage runs out: Max Rage ÷ the net drain (Anger 15 / s; Seething 10 / s + 10 per Melee Attack cast, halved with Fury's Onslaught);
//   Righteous Fury's generation, Frenzy Furious's Rage on Burst crits, Growing Anger and the other gains in Berserk slow or stop it.
//   Outside Berserk Rage is gained from the uses the hit pass measured (10 per Melee Attack use, 5 per channel stack, Starfall's 15 per
//   Ranged use), × (1 + Rage gained). Uptime = Berserk ÷ (Berserk + the fill time); the 5 s / 20 s windows use the cycle average. Own
//   buffs pre-built (default): Rage full at engagement, so a permanent Berserk holds from t = 0.
// - "Gains bonuses twice the Max Rage" (the Berserk keyword) is read for both loadouts: the per-Rage bonuses read 2 × Max Rage while
//   Berserk is active (Seething Silhouette states it; Anger reads the keyword — its game line 899838 carries no effect node, so the
//   doubling lives in the shared Berserk state). Outside Berserk the Rage fills linearly from 0, so the bonuses read Max ÷ 2.
// - Burst (Anger): triggered on the hits of the player's Attack Skills (once per attack: the trigger is once per source) while
//   Berserk, at most once per cooldown: rate in Berserk = 1 ÷ max(1 ÷ attack uses per second, 0.3 s ÷ (1 + Burst Cooldown Recovery
//   Speed)) (the Activation Medium rule, user-confirmed 2026-10-12), × the Berserk uptime. Burst Cooldown Recovery Speed: the Artificial
//   Moon line at the Berserk Rage level and Rampaging's share of the Attack Speed bonuses (increased → increased, additional →
//   additional); general Cooldown Recovery Speed lines are not read (the cooldown reads its own attribute). Burst's hits do not trigger
//   Burst. Its level: Lv. 1 (its single game row) + the build's "+N <tag> / All Skills' Level" lines that match its tags (not Active /
//   Main Skill lines: it is not on the skill board), each +10% additional damage (multiplies). "+X% additional Burst Damage per 1
//   levels" reads the character level. Burst Blast (Hero's Resourcefulness): the Spell row, can activate Spell Burst.
// - Furious Roar: a second Burst trigger on attack Critical Strikes (uses × crit chance), with its own 0.3 s cooldown.
// - Tunnel Vision (Q-H15, recommended): "-80% additional damage for non-Burst skills" applied to every hit, damage over time and
//   ailment except Burst's hits (best-case switch `rehanTunnelVision`, default applied); Burst's own ailments read it too.
// - Seething Spirit: casts the Main Skill (Melee Attack, not Mobility or Channeled; Starfall: Ranged Projectile, not Channeled or
//   Parabolic) at the player's own use rate for it, × (1 - 30%) with Fury's Onslaught; Ritual of Offering: always while Berserk;
//   Fury's Onslaught: while the Main Skill is used within every 2 s in Berserk. Each Spirit cast is a full use of the Main Skill with
//   the Berserk-phase lines, Ritual's +40% and Fury's offset (game record). Disarmed (Ritual): the player's Attack Skills pause while
//   Berserk (Rage Infusion: for its first 5 s).
// - Hysteria's Rage: damage taken from Ritual of Offering's self-damage (1% of current Life every 0.2 s in Berserk) and Life consumed by
//   Ancestral Hate (30% of current Life per Spirit skill), current Life read as Max Life (an upper bound); the dummy never attacks.
// - Rage Infusion: stacks = min(max, Rage gained per second × 4 s ÷ 25) in each phase (game buff 80204: 4 s).

import {
  REHAN_HEROES,
  REHAN_PATTERNS,
  TUNNEL_VISION_SWITCH,
  SPIRIT_RETURN_SWITCH,
  ANGER,
  KEYWORDS,
  INFUSION_RECENT_SECONDS,
  EPS,
  round,
  pct,
  fmt,
  cleanRehan,
  rehanClauseKey,
  linesOf,
  all,
  first,
  plainSum,
  MAX_RAGE,
  RAGE_GAINED,
  DOUBLE_DAMAGE,
  L,
} from "./trait-lines.js";
import { burstState, tunnelState, burstCadence, angerRead } from "./anger.js";
import { spiritCasts, spiritState, seethingRead } from "./seething-silhouette.js";

/**
 * @param {object} p
 * @param {string} p.heroId the selected loadout
 * @param {object[]} p.modifierTexts the build's lines (before the derived lines)
 * @param {object} p.requestedConditions the combat conditions (the best-case switches, prebuiltSelfBuffs)
 * @param {object|null} p.facts the hit pass's measured rates (null before it): { meleeCasts, channelStacks, skillUses, rangedUses,
 *   attackUses, attackCritUses, hitUses, mainUses, burstCritChance, attackIncreasedPercent, rageAttackSpeedPercent }
 * @param {object} p.inputs { main: { setupKey, name, tags }, characterLevel: { level, stored }, maxLife, maxEnergyShield,
 *   skillAreaPercent, attackSpeed (the weapon model's attackSpeed: Rampaging) }
 */
export function rehanState({
  heroId = "",
  modifierTexts = [],
  requestedConditions = {},
  facts = null,
  inputs = {},
} = {}) {
  if (!REHAN_HEROES.has(heroId)) return null;
  const lines = linesOf(modifierTexts, heroId);
  const one = (key) => first(lines, key);
  const has = (key) => Boolean(one(key));
  const anger = heroId === ANGER;
  const measured = Boolean(facts);
  const prebuilt = requestedConditions.prebuiltSelfBuffs !== false;
  const maxRage = KEYWORDS.rage.maxRage + plainSum(modifierTexts, MAX_RAGE);
  const enters = has("enter");
  // The Berserk keyword's doubling: Seething Silhouette's own line; Anger through the keyword (provisional).
  const doubled = has("twice") || (anger && enters);
  const berserkLevel = doubled ? KEYWORDS.berserk.bonusFactor * maxRage : maxRage / 2;
  const outLevel = maxRage / 2;

  // ---- Rage gained (+%): Split Form per 40 Max Life, Rage Infusion, plain lines ----
  const maxLife = Math.max(0, Number(inputs.maxLife) || 0),
    maxEnergyShield = Math.max(0, Number(inputs.maxEnergyShield) || 0);
  const split = one("splitForm");
  const splitPercent = split ? Number(split.match[1]) * Math.floor(maxLife / Number(split.match[2]) + EPS) : 0;
  const infusionDisarm = one("infusionDisarm");
  const infusionGained = infusionDisarm ? Number(infusionDisarm.match[2]) : 0;
  const plainGained = plainSum(modifierTexts, RAGE_GAINED);
  const gainedPercent = round(splitPercent + infusionGained + plainGained);
  const G = Math.max(0, 1 + gainedPercent / 100);

  // ---- The measured rates, corrected for each phase's Rage Attack Speed (Seething Silhouette: +1% per 5 Rage) ----
  const asLine = one("attackSpeedPerRage");
  const asPer = asLine ? Number(asLine.match[1]) / Number(asLine.match[2]) : 0;
  const attackInc = Number(facts?.attackIncreasedPercent) || 0,
    measuredRageAs = Number(facts?.rageAttackSpeedPercent) || 0;
  const asFactor = (level) =>
    asPer
      ? Math.max(0, 1 + (attackInc - measuredRageAs + asPer * level) / 100) / Math.max(EPS, 1 + attackInc / 100)
      : 1;
  const fact = (key) => Math.max(0, Number(facts?.[key]) || 0);
  const ratesAt = (level) => {
    const k = asFactor(level),
      attackExtra = fact("attackUses") * (k - 1);
    return {
      melee: fact("meleeCasts") * k,
      stacks: fact("channelStacks") * k,
      ranged: fact("rangedUses") * k,
      attack: fact("attackUses") * k,
      attackCrit: fact("attackCritUses") * k,
      main: fact("mainUses") * k,
      skill: fact("skillUses") + attackExtra,
      hits: fact("hitUses") + attackExtra,
    };
  };
  const out = ratesAt(outLevel),
    inside = ratesAt(berserkLevel);

  // ---- Rage outside Berserk ----
  const melee = one("rageMelee"),
    channel = one("rageChannel"),
    starfallRage = one("starfallRage");
  const resource = has("skillUse");
  const perMelee = melee ? Number(melee.match[1]) : 0,
    perStack = channel ? Number(channel.match[1]) : 0,
    perRanged = starfallRage ? Number(starfallRage.match[1]) : 0;
  const outParts = {
    melee: G * perMelee * (resource ? out.skill : out.melee),
    channel: G * perStack * out.stacks,
    ranged: G * perRanged * out.ranged,
  };
  const outGain = outParts.melee + outParts.channel + outParts.ranged;
  // Outside Berserk the Rage fills linearly from 0 (its bonuses read Max ÷ 2); with no Rage gained it stays at 0.
  const outBonusLevel = outGain > EPS || !measured ? maxRage / 2 : 0;

  // ---- Seething Spirit: its casts in Berserk (for Growing Anger / Hysteria) ----
  const { starfall, spiritSource, eligible, spiritSpeedFactor, onslaughtSeconds, spiritPresence, spiritUsesIn } =
    spiritCasts({
      one,
      has,
      inputs,
      measured,
      inside,
    });

  // ---- Burst (Anger): its triggers in Berserk (Righteous Fury's cost, Frenzy Furious's gain read them) ----
  const skillArea = Math.max(0, Number(inputs.skillAreaPercent) || 0);
  const { trigger, roar, burst, burstRateIn, burstCrit } = burstState({
    one,
    has,
    all,
    lines,
    inputs,
    berserkLevel,
    inside,
    fact,
    measured,
    skillArea,
  });

  // ---- Berserk: the net Rage change per second (phase A: disarmed, phase B: attacking) ----
  const drain = one("drain"),
    furyGen = one("furyGen"),
    furyCost = one("furyCost"),
    frenzy = one("frenzyGain");
  const castCost = one("castCost"),
    onslaughtRage = one("onslaughtRage");
  const disarmLine = has("disarmed");
  const disarmSeconds = !disarmLine ? 0 : infusionDisarm ? Number(infusionDisarm.match[1]) : Infinity;
  const natural = furyGen ? G * Number(furyGen.match[1]) : onslaughtRage ? 0 : drain ? -Number(drain.match[1]) : 0;
  const furyCostRate = furyCost && trigger ? Number(furyCost.match[1]) * burstRateIn : 0;
  const frenzyRate =
    frenzy && (trigger || roar)
      ? G * Number(frenzy.match[1]) * Math.min(burstRateIn * burstCrit, 1 / Math.max(EPS, Number(frenzy.match[2])))
      : 0;
  const ddLine = one("doubleDamage");
  const ddPer = ddLine ? Number(ddLine.match[1]) / Number(ddLine.match[2]) : 0;
  const spiritDoubleChance = Math.min(1, (ddPer * berserkLevel + plainSum(modifierTexts, DOUBLE_DAMAGE)) / 100);
  const growing = one("growing");
  const growingUses = growing ? Math.min(spiritUsesIn, 1 / Math.max(EPS, Number(growing.match[2]))) : 0;
  const growingRate = growing ? G * Number(growing.match[1]) * (1 + spiritDoubleChance) * growingUses : 0;
  const selfDamage = one("ritualSelfDamage"),
    hysteriaTaken = one("hysteriaTaken");
  const lifeShare = maxLife > 0 ? maxLife / (maxLife + maxEnergyShield) : 0;
  const takenRate =
    selfDamage && hysteriaTaken
      ? ((G * Number(hysteriaTaken.match[1]) * (Number(selfDamage.match[1]) / Number(selfDamage.match[2]))) /
          Number(hysteriaTaken.match[2])) *
        lifeShare
      : 0;
  const consumed = one("hysteriaConsumed"),
    hate = one("hateConsume");
  const consumedRate =
    consumed && hate
      ? (G * Number(consumed.match[1]) * spiritUsesIn * Number(hate.match[1])) / Number(consumed.match[2])
      : 0;
  const castCostPerUse = castCost ? Number(castCost.match[1]) * (onslaughtRage ? 0.5 : 1) : 0;
  const castCostRate = castCostPerUse * inside.melee;
  const rangedRateIn = G * perRanged * inside.ranged;
  // The Rage cycle for a set of rates (the build's, or one clause left out: the badges' leave-one-out reading).
  const infusion = one("infusion");
  const stacksFor = (gainRate) =>
    infusion
      ? Math.min(Number(infusion.match[3]), (gainRate * INFUSION_RECENT_SECONDS) / Number(infusion.match[2]))
      : 0;
  const cycleFor = ({
    out = outGain,
    nat = natural,
    cost = furyCostRate,
    frenzyGain = frenzyRate,
    grow = growingRate,
    taken = takenRate,
    consumedGain = consumedRate,
    cast = castCostRate,
    ranged = rangedRateIn,
    disarmFor = disarmSeconds,
  } = {}) => {
    const gainsA = Math.max(0, nat) + frenzyGain + grow + taken + consumedGain,
      gainsB = gainsA + ranged;
    const netA = nat - cost + frenzyGain + grow + taken + consumedGain,
      netB = netA - cast + ranged;
    const fill = out > EPS ? maxRage / out : Infinity;
    // How long Berserk lasts from Max Rage (Infinity: Rage never runs out).
    let seconds;
    if (!enters) seconds = 0;
    else if (disarmFor === Infinity) seconds = netA >= -EPS ? Infinity : maxRage / -netA;
    else if (disarmFor > 0) {
      const after = netA >= 0 ? maxRage : maxRage + netA * disarmFor;
      seconds = after <= EPS ? maxRage / -netA : netB >= -EPS ? Infinity : disarmFor + after / -netB;
    } else seconds = netB >= -EPS ? Infinity : maxRage / -netB;
    // Uptime: a permanent Berserk holds once entered (pre-built Rage: from t = 0); otherwise Berserk ÷ (Berserk + fill).
    const up = !enters
      ? 0
      : !measured
        ? 1
        : seconds === Infinity
          ? out > EPS || prebuilt
            ? 1
            : 0
          : Number.isFinite(fill)
            ? seconds / (seconds + fill)
            : 0;
    const disarm =
      !disarmLine || !(up > 0)
        ? 0
        : disarmFor === Infinity
          ? 1
          : seconds === Infinity
            ? 0
            : Math.min(1, disarmFor / seconds);
    // Rage gained recently (Rage Infusion): capped at max Rage (a permanent Berserk), the gains only refill what is consumed.
    const gainedIn = seconds === Infinity ? Math.max(0, gainsB - Math.max(0, netB)) : gainsB;
    const stacks = { out: stacksFor(out), in: stacksFor(disarm === 1 ? gainsA : gainedIn) };
    return { gainsA, gainsB, netA, netB, fill, seconds, uptime: up, disarm, stacks };
  };
  const cycle = cycleFor();
  const { netA, netB, uptime } = cycle;
  const fillSeconds = cycle.fill,
    berserkSeconds = cycle.seconds,
    disarmShare = cycle.disarm,
    infusionStacks = cycle.stacks;
  // Whether leaving a rate out changes the cycle (the uptime, the Disarm share or the Rage Infusion stacks).
  const changes = (patch) => {
    const other = cycleFor(patch);
    return (
      Math.abs(other.uptime - uptime) > EPS ||
      Math.abs(other.disarm - disarmShare) > EPS ||
      Math.abs(other.stacks.out - infusionStacks.out) > EPS ||
      Math.abs(other.stacks.in - infusionStacks.in) > EPS
    );
  };
  // The Rage-gained multiplier left out (Split Form's or Rage Infusion's share): every gain scales by k.
  const scaled = (percent) => {
    const k = Math.max(0, 1 + (gainedPercent - percent) / 100) / Math.max(EPS, G);
    return {
      out: outGain * k,
      nat: furyGen ? natural * k : natural,
      frenzyGain: frenzyRate * k,
      grow: growingRate * k,
      taken: takenRate * k,
      consumedGain: consumedRate * k,
      ranged: rangedRateIn * k,
    };
  };
  const matters = {
    melee: changes({ out: outGain - outParts.melee }),
    channel: changes({ out: outGain - outParts.channel }),
    ranged: changes({ out: outGain - outParts.ranged, ranged: 0 }),
    furyCost: changes({ cost: 0 }),
    frenzy: changes({ frenzyGain: 0 }),
    cast: changes({ cast: 0 }),
    growing: changes({ grow: 0 }),
    taken: changes({ taken: 0 }),
    consumed: changes({ consumedGain: 0 }),
    split: splitPercent > 0 && changes(scaled(splitPercent)),
    infusionGained: infusionGained > 0 && changes(scaled(infusionGained)),
    // Hero's Resourcefulness: Rage from every skill use instead of the Melee Attack uses only; Rage Infusion's end of the Disarm.
    resource: resource && changes({ out: outGain - G * perMelee * Math.max(0, out.skill - out.melee) }),
    disarmEnd: disarmLine && Boolean(infusionDisarm) && changes({ disarmFor: Infinity }),
  };
  // The player's attacking time (Disarmed: no Attack Skills during that share of Berserk).
  const playerOut = 1 - uptime,
    playerIn = uptime * (1 - disarmShare);
  const playerShare = playerOut + playerIn;

  const weights = {
    average: { out: 1 - uptime, in: uptime },
    berserk: { out: 0, in: 1 },
    player:
      playerShare > EPS
        ? { out: playerOut / playerShare, in: playerIn / playerShare }
        : { out: 1 - uptime, in: uptime },
  };
  const rage = {
    maxRage,
    enters,
    doubled,
    berserkLevel,
    outLevel: outBonusLevel,
    gainedPercent,
    splitPercent,
    infusionGained,
    plainGained,
    G: round(G),
    resource,
    outParts: { melee: round(outParts.melee), channel: round(outParts.channel), ranged: round(outParts.ranged) },
    outGain: round(outGain),
    fillSeconds: Number.isFinite(fillSeconds) ? round(fillSeconds) : Infinity,
    natural: round(natural),
    furyGen: Boolean(furyGen),
    noNaturalDrain: Boolean(onslaughtRage),
    furyCostRate: round(furyCostRate),
    frenzyRate: round(frenzyRate),
    growingRate: round(growingRate),
    takenRate: round(takenRate),
    consumedRate: round(consumedRate),
    castCostRate: round(castCostRate),
    rangedRateIn: round(rangedRateIn),
    netA: round(netA),
    netB: round(netB),
    disarmSeconds,
    berserkSeconds: Number.isFinite(berserkSeconds) ? round(berserkSeconds) : Infinity,
    uptime: round(uptime),
    disarmShare: round(disarmShare),
    playerShare: round(playerShare),
    infusionStacks: { out: round(infusionStacks.out), in: round(infusionStacks.in) },
    measured,
    prebuilt,
    // Leave-one-out readings for the badges: does leaving the clause's rate out change the cycle?
    matters,
  };

  // ---- Seething Spirit ----
  const spirit = spiritState({
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
  });

  // ---- Tunnel Vision ----
  const tunnel = tunnelState(one, requestedConditions);

  const state = {
    heroId,
    anger,
    measured,
    facts: facts || null,
    inputs: {
      maxLife,
      maxEnergyShield,
      skillAreaPercent: skillArea,
      characterLevel: inputs.characterLevel || null,
      main: inputs.main || null,
    },
    rage,
    weights,
    burst,
    spirit,
    tunnel,
    burstHit: null,
    spiritHit: null,
    needsRates: Boolean(enters || trigger || roar || spiritSource),
  };
  state.bodiesSource = phaseSources(lines, state);
  state.averageBodies = rehanPhaseBodies(state, "average");
  state.cadence = burstCadence(state, inputs.attackSpeed || null);
  return withAssumptions(state);
}

// The per-clause phase readers: perRage, frenzyCrit, attackSpeedPerRage, doubleDamage, berserkDamage, onslaughtRage, infusion. Each
// value is linear in the phase values, so a weighting is their weighted mean (expected-value reading).
const signed = (value, unit) => `${value >= 0 ? "+" : ""}${round(value)}% ${unit}`;
function phaseSources(lines, state) {
  const one = (key) => first(lines, key);
  const sources = [];
  const perRage = (key, unit, perIndex) => {
    const item = one(key);
    if (!item) return;
    const percent = Number(item.match[1]),
      every = Number(item.match[perIndex]);
    sources.push({ key, source: item.line.source, value: (level) => (percent * level) / every, unit });
  };
  perRage("perRage", "additional damage", 3);
  perRage("frenzyCrit", "Critical Strike Rating", 2);
  perRage("attackSpeedPerRage", "Attack Speed", 2);
  const dd = one("doubleDamage");
  if (dd)
    sources.push({
      key: "doubleDamage",
      source: dd.line.source,
      value: (level) => (Number(dd.match[1]) * level) / Number(dd.match[2]),
      text: (value) => `+${round(value)}% chance to deal Double Damage`,
    });
  for (const key of ["berserkDamage", "onslaughtRage"]) {
    const item = one(key);
    if (item)
      sources.push({
        key,
        source: item.line.source,
        value: (_, w) => Number(item.match[1]) * w.in,
        unit: "additional damage",
      });
  }
  const infusion = one("infusion");
  if (infusion)
    sources.push({
      key: "infusion",
      source: infusion.line.source,
      value: (_, w) =>
        Number(infusion.match[1]) * (w.out * state.rage.infusionStacks.out + w.in * state.rage.infusionStacks.in),
      unit: "additional damage",
    });
  return sources;
}

/** The Rage-driven bodies for a weighting ("average": the time average; "berserk": Berserk only; "player": the player's attacking time). */
export function rehanPhaseBodies(state, weighting = "average") {
  if (!state) return [];
  const w = state.weights[weighting] || state.weights.average;
  const level = w.out * state.rage.outLevel + w.in * state.rage.berserkLevel;
  return (state.bodiesSource || []).flatMap((item) => {
    const value = item.value(level, w);
    if (!(Math.abs(value) > EPS)) return [];
    return [
      {
        key: item.key,
        value: round(value),
        source: item.source,
        text: item.text ? item.text(value) : signed(value, item.unit),
      },
    ];
  });
}

/** The derived line objects for a weighting (packages/engine/src/planner.js swaps them in for Burst, the Spirit and the disarmed player). */
export function rehanPhaseLines(state, weighting = "average") {
  return rehanPhaseBodies(state, weighting).map((item) => ({
    text: item.text,
    source: item.source,
    origin: "trait",
    multiplier: 1,
    derivedFrom: item.source,
    rehanPhase: weighting,
    lineEffect: {
      conditional: true,
      key: "heroModule",
      conditionText: `Rehan: Rage bonuses (${weighting === "berserk" ? "while Berserk is active" : weighting === "player" ? "the player's attacking time" : "time-averaged"})`,
      provisional: true,
    },
  }));
}
/** The state with the settled Burst cadence (the final weapon model) and the computed Burst / Spirit hits, for the badges. */
export function withRehanHits(
  state,
  { attackSpeed = null, burstHit = null, spiritHit = null, spiritReturning = null } = {},
) {
  if (!state) return state;
  const spirit =
    state.spirit && spiritReturning && state.spirit.returning
      ? { ...state.spirit, returning: { ...state.spirit.returning, ...spiritReturning } }
      : state.spirit;
  return withAssumptions({
    ...state,
    spirit,
    cadence: attackSpeed ? burstCadence(state, attackSpeed) : state.cadence,
    burstHit: burstHit || state.burstHit,
    spiritHit: spiritHit || state.spiritHit,
  });
}

function withAssumptions(state) {
  const { rage, burst, spirit, tunnel, cadence } = state;
  const switches = [];
  if (tunnel)
    switches.push({
      id: TUNNEL_VISION_SWITCH,
      label: "Tunnel Vision: -80% additional damage for non-Burst skills (applied)",
      enabled: tunnel.on,
      active: tunnel.on,
      summary: tunnel.on
        ? `every skill but Burst deals -${tunnel.percent}% additional damage`
        : "the penalty is switched off: the non-Burst skills keep their damage",
      reason: tunnel.on
        ? "applied so the build does not read stronger than it is (Q-H15, provisional)"
        : "switched off",
    });
  if (spirit?.returning)
    switches.push({
      id: SPIRIT_RETURN_SWITCH,
      label: "Starfall Wasteland: the Spirit's returning projectiles hit the dummy",
      enabled: spirit.returning.on,
      active: spirit.returning.on && spirit.returning.active,
      summary: `${spirit.returning.percent}% of the Spirit's penetrating projectiles return through the dummy`,
      reason: spirit.returning.on ? "best-case assumption (the dummy on the return path)" : "switched off",
    });
  const assumptions = [];
  if (rage.enters)
    assumptions.push({
      id: "rehan:rage",
      value: rage.uptime,
      text: `Rehan – Rage / Berserk (Q-H1, provisional): Max Rage ${rage.maxRage} (TLIDB Rage keyword); ${!rage.measured ? "Berserk held before the hit pass measures the rates" : `outside Berserk ${fmt(rage.outGain)} Rage/s${rage.gainedPercent ? ` (×${rage.G} Rage gained)` : ""} → fills in ${fmt(rage.fillSeconds)} s; in Berserk ${fmt(rage.disarmShare === 1 ? rage.netA : rage.netB)} Rage/s net → lasts ${fmt(rage.berserkSeconds)} s; uptime ${pct(rage.uptime)}%`}; the per-Rage bonuses read ${rage.berserkLevel} Rage in Berserk${rage.doubled ? " (twice Max Rage: the Berserk keyword)" : ""} and ${rage.outLevel} outside (a linear fill); the 5 s / 20 s windows use the cycle average.`,
    });
  if (burst && cadence)
    assumptions.push({
      id: "rehan:burst",
      value: cadence.usesPerSecond,
      text: `Rehan – Burst (Q-H1, provisional): ${burst.blast ? "Burst Blast (game row 90003, 1166–1944 Spell Physical at 288%)" : "340% Weapon Damage (game row 90000, TLIDB keyword)"}; ${cadence.usesPerSecond > 0 ? `${fmt(cadence.inBerserk)} per second in Berserk = ${cadence.measured ? `1 ÷ max(1 ÷ ${fmt(cadence.eventsPerSecond)} ${cadence.eventKind}/s, cooldown ${fmt(cadence.cooldownSeconds)} s)` : `1 ÷ cooldown ${fmt(cadence.cooldownSeconds)} s (before the hit pass measures the attack rate)`}${burst.roar ? ` + Furious Roar's ${fmt(cadence.roarRate)} on attack crits` : ""}, × ${pct(rage.uptime)}% uptime = ${fmt(cadence.usesPerSecond)}/s` : "no trigger on the dummy"}; "per 1 levels" reads the character level (${burst.perLevel?.level ?? "—"}).`,
    });
  if (tunnel)
    assumptions.push({
      id: "rehan:tunnelVision",
      value: tunnel.on,
      text: `Rehan – Tunnel Vision (Q-H15, provisional): ${tunnel.on ? `-${tunnel.percent}% additional damage on every skill but Burst (hits, damage over time and ailments; Burst's own ailments read it too)` : "switched off: the non-Burst skills keep their damage"}.`,
    });
  if (spirit)
    assumptions.push({
      id: "rehan:spirit",
      value: spirit.active ? spirit.usesInBerserk : 0,
      text: `Rehan – Seething Spirit (provisional): ${!spirit.eligible ? spirit.reason : `casts ${spirit.mainName} at your use rate${spirit.speedFactor !== 1 ? ` × ${spirit.speedFactor}` : ""}${spirit.source === "ritual" ? " for the whole Berserk" : ` while you use it within every ${spirit.onslaughtSeconds} s in Berserk (${pct(spirit.presence)}%)`}, each a full use with the Berserk lines${spirit.additional.length ? ` and ${spirit.additional.map((line) => `${line.value >= 0 ? "+" : ""}${line.value}%`).join(", ")} additional` : ""}`}.`,
    });
  if (rage.disarmShare > 0)
    assumptions.push({
      id: "rehan:disarm",
      value: rage.disarmShare,
      text: `Rehan – Disarmed (Ritual of Offering): the player's Attack Skills pause for ${pct(rage.disarmShare)}% of each Berserk${rage.disarmSeconds !== Infinity ? ` (Rage Infusion: the first ${rage.disarmSeconds} s)` : ""}; their per-Rage bonuses read the attacking time only.`,
    });
  return { ...state, switches, assumptions };
}

/** One Rehan clause: { key, status, reason, bodies }, or null when the line is not a Rehan clause. */
export function rehanLineRead(heroId, text, state, { revived = false } = {}) {
  if (!REHAN_HEROES.has(heroId)) return null;
  const key = rehanClauseKey(text, { revived });
  if (!key) return null;
  return { key, bodies: [], ...lineRead(key, cleanRehan(text), state) };
}

function lineRead(key, text, state) {
  if (!state) return L("Inactive", "Rehan's lines are not in the build");
  const { rage, burst, cadence } = state;
  const measured = state.measured;
  const pending = measured ? "" : " (held before the hit pass measures the rates)";
  const cycle = !rage.enters
    ? 'no "Enter Berserk automatically at Max Rage" line, so Berserk is never entered'
    : !measured
      ? "Berserk held before the hit pass measures the rates"
      : rage.berserkSeconds === Infinity
        ? rage.uptime > 0
          ? `Berserk never ends once entered${rage.prebuilt ? " (pre-built Rage: from t = 0)" : ""}: uptime ${pct(rage.uptime)}%`
          : "no Rage is gained, so Berserk is never entered (own buffs not pre-built)"
        : rage.uptime > 0
          ? `Rage fills in ${fmt(rage.fillSeconds)} s (${fmt(rage.outGain)} Rage/s) and Berserk lasts ${fmt(rage.berserkSeconds)} s: uptime ${pct(rage.uptime)}% (Q-H1, provisional)`
          : "no Rage is gained outside Berserk, so Berserk is not re-entered (uptime 0)";
  const bodyFor = (clauseKey) => (state.averageBodies || []).find((item) => item.key === clauseKey) || null;
  const derived = (clauseKey, why) => {
    const item = bodyFor(clauseKey);
    return item
      ? L("In calc", `${why}: ${item.text} (time-averaged over the Rage cycle; ${cycle})`, { bodies: [item.text] })
      : L("Inactive", `${why}: no bonus (${cycle})`);
  };
  const burstUses = cadence?.usesPerSecond || 0;
  const noBurst = !burst
    ? "no Burst trigger line"
    : !(rage.uptime > 0)
      ? cycle
      : !(burstUses > 0)
        ? burst.onHit
          ? "no skill hits the dummy"
          : "no Attack Skill hits the dummy, so nothing triggers Burst"
        : "";
  const burstHit = state.burstHit;
  const burstDealt = burstHit ? Boolean(burstHit.modeled) : burstUses > 0;
  const burstIdle =
    noBurst || (!burstDealt ? burstHit?.inactiveReason || "Burst deals no damage here (no weapon damage)" : "");
  switch (key) {
    // ---- Rage gained outside Berserk ----
    case "rageMelee":
      if (!rage.enters) return L("Inactive", cycle);
      if (!measured)
        return L(
          "In calc",
          `+${text.match(REHAN_PATTERNS.rageMelee)[1]} Rage per ${rage.resource ? "skill" : "Melee Attack"} use outside Berserk${pending}`,
        );
      if (!(rage.outParts.melee > EPS))
        return L(
          "Inactive",
          rage.resource ? "no skill is used on the dummy" : "no Melee Attack skill is used on the dummy",
        );
      return rage.matters.melee
        ? L(
            "In calc",
            `${fmt(rage.outParts.melee)} Rage/s from ${rage.resource ? "every skill use (Hero's Resourcefulness)" : "the Melee Attack uses"} outside Berserk (${cycle})`,
          )
        : L(
            "No DPS effect",
            "Berserk never ends once entered and Rage is full at engagement (own buffs pre-built), so this Rage changes nothing",
          );
    case "rageChannel":
      if (!rage.enters) return L("Inactive", cycle);
      if (!(rage.outParts.channel > EPS)) return L("Inactive", `no channeled Melee Attack skill${pending}`);
      return rage.matters.channel
        ? L(
            "In calc",
            `${fmt(rage.outParts.channel)} Rage/s from channeled stacks (one stack per channel interval: provisional; ${cycle})`,
          )
        : L(
            "No DPS effect",
            "Berserk never ends once entered and Rage is full at engagement (own buffs pre-built), so this Rage changes nothing",
          );
    case "starfallRage":
      if (!rage.enters) return L("Inactive", cycle);
      if (!(rage.outParts.ranged + rage.rangedRateIn > EPS))
        return L("Inactive", `no Ranged Skill is used on the dummy${pending}`);
      return rage.matters.ranged
        ? L(
            "In calc",
            `+${text.match(REHAN_PATTERNS.starfallRage)[1]} Rage per Ranged Skill use: ${fmt(rage.outParts.ranged)} Rage/s outside Berserk, ${fmt(rage.rangedRateIn)} in it (${cycle})`,
          )
        : L(
            "No DPS effect",
            "Berserk never ends once entered and Rage is full at engagement (own buffs pre-built), so this Rage changes nothing",
          );
    case "skillUse": {
      if (!rage.enters) return L("Inactive", cycle);
      const melee = Number(state.facts?.meleeCasts) || 0,
        skill = Number(state.facts?.skillUses) || 0;
      if (!(measured && skill > melee + EPS))
        return L("Inactive", `every skill used here is a Melee Attack Skill, so the change adds no Rage${pending}`);
      return rage.matters.resource
        ? L(
            "In calc",
            `Rage from every skill use (${round(skill)} uses/s, of which ${round(melee)} Melee Attack) (${cycle})`,
          )
        : L(
            "No DPS effect",
            "Berserk never ends once entered and Rage is full at engagement (own buffs pre-built), so this Rage changes nothing",
          );
    }
    case "enter":
      return rage.enters && rage.uptime > 0 ? L("In calc", cycle) : L("Inactive", cycle);
    case "drain":
      if (!rage.enters) return L("Inactive", cycle);
      if (rage.furyGen)
        return L("No DPS effect", "Righteous Fury generates Rage instead of consuming it while Berserk is active");
      if (rage.noNaturalDrain)
        return L("No DPS effect", "Fury's Onslaught: Rage is no longer naturally consumed while Berserk is active");
      return rage.uptime > 0 ? L("In calc", cycle) : L("Inactive", cycle);
    case "twice":
      return rage.uptime > 0
        ? L("In calc", `the per-Rage bonuses read ${rage.berserkLevel} Rage while Berserk is active (${cycle})`)
        : L("Inactive", cycle);
    case "castCost":
      if (!(rage.uptime > 0)) return L("Inactive", cycle);
      if (rage.disarmShare === 1)
        return L(
          "No DPS effect",
          "Disarmed for the whole Berserk (Ritual of Offering): no Melee Attack casts, so nothing consumes Rage",
        );
      if (!measured) return L("In calc", `Melee Attack casts consume Rage in Berserk${pending}`);
      return rage.matters.cast
        ? L("In calc", `${fmt(rage.castCostRate)} Rage/s consumed by Melee Attack casts in Berserk (${cycle})`)
        : rage.castCostRate > EPS
          ? L(
              "No DPS effect",
              `Berserk never ends: the gains outweigh the ${fmt(rage.castCostRate)} Rage/s the casts consume`,
            )
          : L("Inactive", "no Melee Attack cast in Berserk");
    case "furyGen":
      return rage.enters
        ? L("In calc", `+${text.match(REHAN_PATTERNS.furyGen)[1]} Rage/s in Berserk instead of the drain (${cycle})`)
        : L("Inactive", cycle);
    case "onslaughtRage":
      return derived(
        "onslaughtRage",
        "no natural consumption and half-cost Melee casts; +X% additional damage while Berserk (game record: the Berserk state)",
      );
    case "disarmed":
      if (!(rage.uptime > 0)) return L("Inactive", cycle);
      return rage.disarmShare > 0
        ? L(
            "In calc",
            `the player's Attack Skills pause for ${pct(rage.disarmShare)}% of each Berserk (TLIDB keyword Disarm); the Seething Spirit attacks instead (provisional)`,
          )
        : L("No DPS effect", "Rage Infusion ends the Disarm after its first seconds and Berserk never ends");
    case "infusionDisarm": {
      if (!measured) return L("In calc", `+${rage.infusionGained}% Rage gained${pending}`);
      const parts = [
        rage.matters.infusionGained ? `Rage gained ×${rage.G}` : "",
        rage.matters.disarmEnd ? `Disarmed only for the first ${rage.disarmSeconds} s of Berserk` : "",
      ].filter(Boolean);
      return parts.length
        ? L("In calc", `${parts.join("; ")} (${cycle})`)
        : L(
            "No DPS effect",
            rage.outGain > EPS || rage.disarmSeconds !== 0
              ? "neither the extra Rage nor the end of the Disarm changes the cycle here (Berserk never ends, Rage full at engagement)"
              : "no Rage is gained and no Disarm",
          );
    }
    case "splitLife":
      return rage.splitPercent > 0 && rage.matters.split
        ? L(
            "In calc",
            `Max Life feeds Split Form's +${round(rage.splitPercent)}% Rage gained (Max Life ${Math.round(state.inputs.maxLife)}; the stat sheet counts it too)`,
          )
        : L("Counted in stats", "Max Life (the stat sheet)");
    case "splitForm":
      if (!(rage.splitPercent > 0)) return L("Inactive", "Max Life below 40");
      if (!measured) return L("In calc", `+${round(rage.splitPercent)}% Rage gained${pending}`);
      return rage.matters.split
        ? L(
            "In calc",
            `+${round(rage.splitPercent)}% Rage gained (Max Life ${Math.round(state.inputs.maxLife)}; ${cycle})`,
          )
        : L("No DPS effect", "the extra Rage changes nothing here (Berserk never ends, Rage full at engagement)");
    case "hysteriaTaken":
      if (!(rage.takenRate > EPS))
        return L("Inactive", "the dummy never attacks, and no self-damage source (Ritual of Offering) is in the build");
      return rage.matters.taken
        ? L(
            "In calc",
            `${fmt(rage.takenRate)} Rage/s in Berserk from Ritual of Offering's self-damage (current Life read as Max Life: an upper bound, provisional)`,
          )
        : L("No DPS effect", "Berserk never ends without it");
    case "hysteriaConsumed":
      if (!(rage.consumedRate > EPS))
        return L("Inactive", "no Life is consumed (Ancestral Hate with an active Seething Spirit)");
      return rage.matters.consumed
        ? L(
            "In calc",
            `${fmt(rage.consumedRate)} Rage/s in Berserk from the Life Ancestral Hate's Spirit consumes (current Life read as Max Life: an upper bound, provisional)`,
          )
        : L("No DPS effect", "Berserk never ends without it");
    case "ritualSelfDamage":
      return rage.takenRate > EPS && rage.matters.taken
        ? L("In calc", `Hysteria: the self-damage generates ${fmt(rage.takenRate)} Rage/s in Berserk (provisional)`)
        : L(
            "No DPS effect",
            rage.takenRate > EPS
              ? "self-damage: Berserk never ends without its Rage"
              : "self-damage (Hysteria would turn it into Rage)",
          );
    // ---- Rage bonuses (time-averaged over the cycle) ----
    case "perRage":
      return derived("perRage", "per Rage you have (the Movement Speed part has no DPS effect)");
    case "frenzyCrit":
      return derived("frenzyCrit", "per Rage you have");
    case "attackSpeedPerRage":
      return derived("attackSpeedPerRage", "per Rage you have");
    case "doubleDamage":
      return derived("doubleDamage", "per 5 Rage you have");
    case "berserkDamage":
      return derived("berserkDamage", "while Berserk is active");
    case "infusion":
      return derived(
        "infusion",
        `Rage gained in the last ${INFUSION_RECENT_SECONDS} s: ${rage.infusionStacks.out} stacks outside Berserk, ${rage.infusionStacks.in} in it`,
      );
    case "berserkMove":
      return L("No DPS effect", "Movement Speed");
    case "berserkArea":
      return L("No DPS effect", "Skill Area: the dummy stands within the area");
    default:
      return (
        angerRead(key, state, { cycle, pending, measured, burstUses, burstDealt, burstIdle }) ??
        seethingRead(key, state, { cycle, pending }) ??
        L("Not modeled", "this Rehan clause is not read")
      );
  }
}
