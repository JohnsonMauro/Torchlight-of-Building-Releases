import {
  allHeroTraitsSs13,
  artificialMoonGate,
  auraGainedLineStatus,
  baseTraitDescriptionForLevel,
  cleanGameText,
  collectNormalizedGearModifiers,
  combineStatuses,
  coverageContext,
  dazeStatus,
  endsArtificialMoonSection,
  engineLineStatus,
  heroModuleLineStatus,
  heroTraitSlotLevel,
  intelligenceLineStatus,
  isNameReadCoreClause,
  mainStatLineStatus,
  matchTalentTextClause,
  namedGearAffixLines,
  nameReadCoreGrant,
  nameReadCoreStatus,
  neutralStatuses,
  normalizePercentageText,
  parseBlessingModifier,
  parseBlessingRecovery,
  parseBlockModifier,
  parseReapingSource,
  prismAddedCoreEffect,
  prismMutationDownside,
  readWeapon,
  refineCoverage,
  residualNonDamageStatus,
  resolveHeroModules,
  routeStatus,
  skillLevelLineStatus,
  talentKeyRoute,
  TRAIT_SLOT_GRANTS,
  weaponHands,
  weaponLocalLineKind,
  weaponTypeOf,
  YOUGA_ULTIMATE_ONE_ID,
} from "../../engine/index.ts";

function baseGearLineCoverage(item, text, active, block, lowResources, blurEffects) {
  if (!active) return "Not equipped";
  // A "[Core]" grant of a core the planner applies by name ("[Affliction] +30 Affliction inflicted per second"; core audit
  // batch B1): the core tooltip's rule, as on the panel.
  const nameRead = nameReadCoreGrant(String(text || "").split(/\r?\n/)[0]);
  if (nameRead) return nameReadCoreStatus(nameRead.name);
  if (item.corrosionModifiers?.length && item.implicitModifiers?.includes(text)) return "Replaced by corrosion";
  if (/^\+[\d.]+\s*%\s+(?:damage|Critical Strike Rating) if you have Blocked recently$/i.test(text))
    return block?.recentlyActive ? "In calc" : "Inactive";
  // Movement Speed is summed by the stat sheet; no reader turns it into damage (src/engine/skills/attack-hit-profiles.js: "no Movement
  // Speed total"; survey 2026-10-13 §4.3), and movement-driven buffs are assumed held anyway.
  if (/^(?:Feline Steps: )?\+[\d.]+\s*% Movement Speed$/i.test(text)) return "Counted in stats";
  if (/^Blur gains an additional effect:.*Damage Over Time.*Blur Rating$/i.test(text))
    return blurEffects?.active ? "In calc" : "Inactive";
  // "<Aura> gains an additional effect: <modifiers>" (Pantheon's Elegy): part of that Aura's buff while it is active
  // (src/engine/skills/aura-gained-effects.js; Aura Effect scaling provisional). Partly / Not modeled when a clause has no reader.
  const gainedAura = auraGainedLineStatus(text, coverageContext());
  if (gainedAura) return gainedAura;
  // The refresh itself is planner-only (Blur is assumed held); a trailing "+X% Blur Effect" is in calc.
  // TLIDB writes "+50 %" with a space (Valerie's Night Stroll corroded; survey 2026-10-13 §4.1).
  if (/^Refreshes Blur upon gaining Blur/i.test(text))
    return /[\d.]+ ?% Blur Effect$/i.test(text) ? (blurEffects?.active ? "In calc" : "Inactive") : "Planner only";
  if (/^Grants [\d.]+ Blur Rating per second when equipped in the right Ring slot$/i.test(text))
    return item.slot === "rightRing" ? "In calc" : "Inactive";
  // Folklore of Locking Fingers' left-ring grant: a Blur source (src/engine/combat/blur-sources.js) once the item sits in the left Ring slot.
  if (/^Grants Blur [\d.]+ ?s after losing Blur when equipped in the left Ring slot$/i.test(text))
    return item.slot === "leftRing" && blurEffects?.active ? "In calc" : "Inactive";
  if (/Stealth Stab/.test(text)) return blurEffects?.active || blurEffects?.afterEnd ? "In calc" : "Inactive";
  const conditional = normalizePercentageText(text).match(
    /^([+-][\d.]+)% additional damage taken (?:when |while )?(?:at |on )?Low (Life|Mana)$/i,
  );
  // Own damage taken at Low Life / Mana is defence (src/engine/defense/effective-hp.js sums it): "Counted in stats" while the condition
  // holds, never "In calc" (gear-pact batch chunk 2; it moves no dummy damage).
  if (conditional)
    return lowResources?.[conditional[2].toLowerCase() === "life" ? "lowLife" : "lowMana"]
      ? "Counted in stats"
      : "Inactive";
  if (parseBlessingRecovery(text)) return "In calc";
  if (text === "Poisoned Relief") return "In calc";
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return "Not modeled";
  // Weapon base and weapon-local lines ("6 - 6 Physical Damage", "+64% Gear Physical Damage", "Adds 68–84 Physical Damage to
  // the gear", "+54% gear Attack Speed", "+85% Attack Critical Strike Rating for this gear"): src/engine/skills/weapon-damage-model.js
  // readWeapon applies them on the held weapon, which a modeled attack skill uses (gear-pact batch G1). Off a weapon, or in
  // a build without a modeled attack hit, they change nothing (Inactive).
  if (lines.length === 1 && weaponLocalLineKind(lines[0])) {
    const hands = weaponHands(weaponTypeOf(item));
    if (hands !== "one" && hands !== "two") return "Inactive";
    // A local damage percent needs damage of its kind on the weapon ("Gear Elemental Damage" on a Physical-only sword).
    const damage = readWeapon(item)?.damage || {};
    if (/Gear Physical Damage$/i.test(lines[0]) && !damage.Physical) return "Inactive";
    if (/Gear Elemental Damage$/i.test(lines[0]) && !["Fire", "Cold", "Lightning"].some((type) => damage[type]))
      return "Inactive";
    const planner = coverageContext();
    if (!planner?.activation) return "In calc";
    return (planner.skillHits || []).some((hit) => hit.modeled && hit.rate?.speedType === "attack-speed")
      ? "In calc"
      : "Inactive";
  }
  const recognized = new Set(
    collectNormalizedGearModifiers([{ ...item, modifiers: lines, corrosionModifiers: [] }]).map((entry) => entry.text),
  );
  for (const line of lines)
    if (parseBlockModifier(line) || /^You can (?:cast|inflict) \d+ additional Curses?$/i.test(line))
      recognized.add(line);
  for (const line of lines) {
    // Trauma- / Wilt-only Reaps are left to the engine layer, which checks that the ailment is on the dummy (chunk 3).
    const reap = parseReapingSource(line, item.name);
    if (reap && !reap.dotKeys && !/^inflicting (?:Trauma|Wilt)$/.test(reap.trigger)) recognized.add(line);
    if (effectiveReapingReset(item, line)) recognized.add(line);
  }
  // A recognized stat the build has no engine for: "Inactive" / "Counted in stats" (talent batch T7); defences that no damage
  // reader takes are summed by the stat sheet (survey 2026-10-13 §4.3: they read In calc). Multi-line rows judge each line.
  const lineStatus = (line) => gearStatStatus(item, line) ?? defenceStatStatus(item, line) ?? "In calc";
  if (lines.length === 1 && recognized.has(lines[0])) return lineStatus(lines[0]);
  return lines.every((line) => recognized.has(line))
    ? combineStatuses(lines.map(lineStatus))
    : recognized.size
      ? "Partly modeled"
      : "Not modeled";
}

function effectiveReapingReset(item, line) {
  return (
    (item.modifiers || []).some((text) => parseReapingSource(text, item.name)?.trigger === "full Affliction") &&
    /^Reaping removes (?:enemy's Affliction|[\d.]+% Affliction from enemies)$/i.test(normalizePercentageText(line))
  );
}

// Engine-aware status of one parsed clause (talent batch T7): the shared table's route (src/engine/text/talent-text-effects.js)
// against the build in the coverage context. Before 2026-10-12 every parsed key read "In calc" whatever the build:
// Spell crit on an attack build, defensive keys, cast speed on a Minion build. Returns null for an unparsed clause and
// "utility" for a key no damage ledger reads (the engine-line layer decides those).
function parsedClauseStatus(clause, scope) {
  const matched = matchTalentTextClause(normalizePercentageText(String(clause)).trim(), scope);
  if (!matched) return null;
  return routeStatus(matched.route, matched.values[0][0], coverageContext()) ?? "utility";
}

// Per-clause statuses combined: every clause settled by its route → their combination; an unparsed or utility clause
// keeps the old "Partly modeled" / "Not modeled" so refineCoverage asks the engine layer about it.
function combineClauseStatuses(statuses) {
  const known = statuses.filter((status) => status && status !== "utility");
  if (!known.length) return "Not modeled";
  if (known.length < statuses.length) return known.includes("In calc") ? "Partly modeled" : "Not modeled";
  return statuses.length === 1 ? known[0] : combineStatuses(known);
}

function baseTalentLineCoverage(text, active) {
  if (!active) return "Not allocated";
  const clauses = normalizePercentageText(text)
    .split("|")
    .map((line) => line.trim())
    .filter(Boolean);
  return combineClauseStatuses(
    clauses.map((clause) => parsedClauseStatus(clause, "talent") ?? (parseBlockModifier(clause) ? "In calc" : null)),
  );
}

export function talentEffectCoverage(key, value, rank) {
  if (!(rank > 0)) return "Not allocated";
  if (typeof value === "number" || (key === "inflictsFireInfiltrationAgainstIgnited" && value === true))
    return routeStatus(talentKeyRoute(key), key, coverageContext()) ?? "In calc";
  return "Not verified";
}

function baseSlateLineCoverage(text, active) {
  if (!active) return "Not equipped";
  if (/Barrier of Radiance/i.test(text)) return "Quality of life";
  // Daze reads In calc only where it acts: Blur active and an ailment on the dummy (talent batch T4/T7).
  if (/\bDaze\b|additional Ailment Damage while Blur is active/i.test(text)) return dazeStatus(coverageContext());
  const clauses = text.split(/\s+\|\s+|\s+·\s+/);
  const statuses = clauses.map((clause) => {
    const separator = clause.lastIndexOf(": ");
    const status = parsedClauseStatus(separator < 0 ? clause : clause.slice(separator + 2), "slate");
    // Slate-only keys (Dexterity, Attack Speed, Skill Cost, Max Blessing Stacks) keep the old reading: In calc.
    if (status) return status === "utility" ? "In calc" : status;
    return parseBlockModifier(clause) || parseBlessingModifier(clause) ? "In calc" : null;
  });
  return combineClauseStatuses(statuses);
}

// Gear stats by engine family (src/engine/engine.js modifierPatterns), for the engine-aware gear badge (talent batch T7).
// Stats not listed (weapon bases, defences, attributes, skill levels) keep their old "In calc".
const GEAR_STAT_ROUTES = {
  spellCriticalStrikeRating: "crit",
  spellCriticalStrikeRatingPercent: "crit",
  criticalStrikeDamagePercent: "crit",
  castSpeedPercent: "attackAndCastSpeed",
  afflictionPerSecond: "affliction",
  afflictionEffectPercent: "affliction",
  afflictionPerSecondPerAfflictionEffectPercent: "affliction",
  igniteLimit: "ignite",
  igniteDurationPercent: "ignite",
  igniteChancePercent: "ignite",
  additionalIgniteDamagePercent: "ignite",
  baseIgniteDamage: "ignite",
  additionalIgniteStacks: "ignite",
  ailmentDurationPercent: "ailment",
  damagingAilmentChancePercent: "ailment",
  ailmentChancePercent: "ailment",
  ailmentDamageEnhancementPercent: "ailment",
  reapingDurationPercent: "reaping",
  reapingRecoverySpeedPercent: "reaping",
  damageOverTimePercent: "dot",
  damagePercent: "damage",
  additionalFireDamagePercent: "damage",
  elementalDamagePercent: "damage",
};
// Defence stats (survey 2026-10-13 §4.3: 282 armor / Energy Shield / Evasion / Life / resistance lines read In calc with no
// damage effect). They are summed by the stat sheet (src/engine/character-stats.js, src/engine/defense/effective-hp.js): "Counted in stats";
// immunities "No DPS effect". A resistance stays In calc where the build carries a line that scales with that resistance
// ("For every 1% Fire Resistance, +X% Critical Strike Damage"; such a line moved the Trauma build).
const DEFENCE_STATS = new Set([
  "gearArmor",
  "gearEvasion",
  "gearEnergyShield",
  "maxEnergyShield",
  "maxLifePercent",
  "maxEnergyShieldPercent",
  "elementalResistancePercent",
  "fireResistancePercent",
  "coldResistancePercent",
  "lightningResistancePercent",
  "erosionResistancePercent",
  "frostbiteImmunity",
  "elementalAilmentAvoidancePercent",
]);
const RESISTANCE_TYPES = {
  elementalResistancePercent: ["Fire", "Cold", "Lightning", "Elemental"],
  fireResistancePercent: ["Fire", "Elemental"],
  coldResistancePercent: ["Cold", "Elemental"],
  lightningResistancePercent: ["Lightning", "Elemental"],
  erosionResistancePercent: ["Erosion"],
};
function ownResistanceReader(types, planner) {
  const pattern = new RegExp(`(?:for every|per) \\+?[\\d.]*% (?:effective )?(?:${types.join("|")}) Resistance`, "i");
  return (planner?.modifierTexts || []).some((line) => pattern.test(normalizePercentageText(String(line.text ?? ""))));
}
function defenceStatStatus(item, line) {
  const entries = collectNormalizedGearModifiers([{ ...item, modifiers: [line], corrosionModifiers: [] }]);
  if (!entries.length || !entries.every((entry) => DEFENCE_STATS.has(entry.stat))) return null;
  if (
    entries.some(
      (entry) => RESISTANCE_TYPES[entry.stat] && ownResistanceReader(RESISTANCE_TYPES[entry.stat], coverageContext()),
    )
  )
    return "In calc";
  return entries.every((entry) => entry.type === "flag") ? "No DPS effect" : "Counted in stats";
}

function gearStatStatus(item, line) {
  // Skill levels by the build's skill tags (gear-pact batch G9), not a static In calc.
  const level = skillLevelLineStatus(normalizePercentageText(line).trim(), coverageContext());
  if (level) return level;
  // Intelligence / All Stats: main-stat damage only where a ledger takes Intelligence (gear-pact batch chunk 2).
  if (
    collectNormalizedGearModifiers([{ ...item, modifiers: [line], corrosionModifiers: [] }]).some(
      (entry) => entry.stat === "intelligence",
    )
  )
    return (
      mainStatLineStatus(normalizePercentageText(line).trim(), coverageContext()) ??
      intelligenceLineStatus(coverageContext())
    );
  const entries = collectNormalizedGearModifiers([{ ...item, modifiers: [line], corrosionModifiers: [] }]);
  const statuses = entries
    .map((entry) =>
      GEAR_STAT_ROUTES[entry.stat] ? routeStatus(GEAR_STAT_ROUTES[entry.stat], entry.stat, coverageContext()) : null,
    )
    .filter(Boolean);
  return statuses.length && statuses.every((status) => status !== "In calc") ? statuses[0] : null;
}

// One clause of a legendary prism affix (residual batch P5: the affix used to be judged whole, so "-30 to All Stats" or
// "+1 to Max Tenacity Blessing Stacks" read Not modeled on the prism while the same clause read In calc on gear). The
// "When activating 2 Legendary Medium Talent within the area," lead is the activation rule (src/engine/talents/prism-crafting.js
// prismNodeAffixes applies the effect once two are allocated); the body is judged like any other line.
const PRISM_AREA_LEAD =
  /^(?:When activating 2 Legendary Medium Talent within the area,|All (?:Micro|Medium|Legendary Medium) Talent within the area also gain:)\s*/i;
function prismLegendaryClauseStatus(clause) {
  const text = normalizePercentageText(String(clause || "")).trim();
  if (/Mutated Core Talents no longer replace the original talent/i.test(text)) return "In calc";
  if (/^Points can be allocated to all .+ within the area|within the area can ignore prerequisite/i.test(text))
    return "Planner only";
  const body = text.replace(PRISM_AREA_LEAD, "");
  return refineCoverage("Not modeled", body.replace(/;\s*/g, "\n"));
}
const prismLegendaryClauses = (affix) => {
  const text = normalizePercentageText(String(affix || "")).trim();
  if (/Mutated Core Talents/i.test(text))
    return text
      .split(/;\s*(?=Mutated Core Talents)/)
      .map((part) => part.trim())
      .filter(Boolean);
  const lead = text.match(PRISM_AREA_LEAD)?.[0] || "";
  return text
    .slice(lead.length)
    .split(/;\s*/)
    .map((part) => `${lead}${part}`.trim())
    .filter(Boolean);
};

/** Coverage of a prism's base or affix; `clause` (legendary affixes) judges one clause of it. */
export function prismAffixCoverage(prism, kind, clause = null) {
  if (kind === "base" && prism?.type === "ethereal" && ["Fire's Allure", "Fiery Fantasy"].includes(prism.base))
    return "In calc";
  if (kind === "legendaryAffix" && clause) return prismLegendaryClauseStatus(clause);
  if (
    kind === "legendaryAffix" &&
    /Mutated Core Talents no longer replace the original talent/i.test(prism?.legendaryAffix || "")
  )
    return prismMutationDownside(prism) === "-30 to All Stats" ? "Partly modeled" : "In calc";
  if (
    kind === "legendaryAffix" &&
    prism?.legendaryAffix &&
    prism?.type !== "inverse" &&
    !/also gain:|Mutated Core Talents/i.test(prism.legendaryAffix)
  )
    return combineStatuses(prismLegendaryClauses(prism.legendaryAffix).map(prismLegendaryClauseStatus));
  if (kind === "radiusAffix") return "Planner only";
  if (prism?.type === "inverse") return "Partly modeled";
  // Phantasmagoria's +75% is already inside its rare rolls: TLIDB lists each Phantasmagoria rare
  // roll as the ordinary roll x 1.75 (6% -> 10.5%), and its legendary affixes have no amplified
  // variants (user: Torment is not scaled). So the base affix is carried by the roll values.
  if (kind === "base" && prism?.type === "ethereal" && prism.base === "Phantasmagoria") return "In calc";
  // A base affix that adds an effect to the core (Haze's): the status of that effect's clauses.
  if (kind === "base" && prismAddedCoreEffect(prism)) return refineCoverage("Not modeled", prismAddedCoreEffect(prism));
  // Effortless Command (core audit Q12): no affix record in either season's game tables, so there is nothing to model yet.
  if (kind === "base" && prism?.type === "ethereal" && prism.base === "Effortless Command") return "Not modeled";
  // Every other base's text reaches the readers as "[Base] clause" lines (src/engine/text/modifier-texts.js; core audit batch B1): the
  // base affix combines the statuses of those clauses.
  if (kind === "base" && prism?.type === "ethereal") {
    const coreLines = (coverageContext()?.modifierTexts || []).filter(
      (line) => line.grantedCore === prism.base && line.origin === "core",
    );
    if (coreLines.length) return combineStatuses(coreLines.map((line) => refineCoverage("Not modeled", line.text)));
  }
  if (kind === "base") return "Not independently modeled";
  if (kind === "rareAffix" && /Block Ratio/.test(prism?.rareAffix || "")) return "In calc";
  if (
    ["rareAffix", "legendaryAffix"].includes(kind) &&
    /also gain: \+?[\d.]+% (?:Sealed Mana Compensation|Aura Effect)$/i.test(prism?.[kind] || "")
  )
    return "In calc";
  const gained = String(prism?.[kind] || "").match(/also gain:\s*(.+)$/i)?.[1];
  if (!gained) return "Not modeled";
  // Each clause as the calculation got it: the lines the prism gave its covered talents, scaled by their points ("+30% Minion
  // Critical Strike Rating" from a 3-point node, src/engine/text/modifier-texts.js), else the affix's own wording.
  const shape = (text) =>
    normalizePercentageText(String(text))
      .replace(/[+-]?\d+(?:\.\d+)?/g, "#")
      .trim();
  const given = (coverageContext()?.modifierTexts || []).filter(
    (line) => line.origin === "prism" && String(line.source || "").includes(`· ${prism.base || "Prism"} (`),
  );
  return combineStatuses(
    gained.split(/;\s*/).map((clause) => {
      const own = given.filter((line) => shape(line.text) === shape(clause));
      return own.length
        ? combineStatuses(own.map((line) => refineCoverage("Not modeled", line.text)))
        : refineCoverage("Not modeled", clause);
    }),
  );
}

// Badge tooltip for prism affixes whose status needs a reason.
export const EFFORTLESS_COMMAND_REASON =
  "Not modeled: Effortless Command has no affix record in the SS13 or SS14 game tables (TLIDB shows only its id 1204411023), so there is nothing to model yet (core audit Q12).";
export function prismAffixCoverageReason(prism, kind) {
  if (kind === "base" && prism?.type === "ethereal" && prism.base === "Effortless Command")
    return EFFORTLESS_COMMAND_REASON;
  if (kind !== "legendaryAffix") return "";
  const downside = prismMutationDownside(prism);
  if (downside === "-30 to All Stats")
    return "Core kept and added: in calc. -30 to All Stats: the Intelligence part lowers main-stat damage in calc; Strength and Dexterity are not modeled.";
  if (downside === "-5% Elemental Resistance")
    return "Core kept and added: in calc. -5% Elemental Resistance lowers your Fire, Cold and Lightning Resistance (affects Fire Resistance scaling lines).";
  if (downside === "-8% Defense") return "Core kept and added: in calc. -8% Defense has no damage effect.";
  return "";
}

// Artificial Moon (user-corrected 2026-10-13; src/engine/heroes/hero-memory-rules.js artificialMoonGate): an equipped Artificial Moon
// memory opens the base trait slot, and the base trait's lines after "Artificial Moon:" are active only at base trait
// level 5 (src/engine/heroes/hero-memory-model.js heroMemories.artificialMoon / artificialMoonGate; src/engine/character-stats.js
// heroTraitStatLines drops them otherwise), for every hero. A badge receives one line, so the moon section is looked up in
// the base trait's catalog and per-level texts (progression "( a / b / c )" lists match any listed or substituted value).
const squash = (text) => cleanGameText(String(text || ""));
const moonLinePatterns = new Map();
function artificialMoonPatterns(heroId) {
  if (moonLinePatterns.has(heroId)) return moonLinePatterns.get(heroId);
  const base = allHeroTraitsSs13[heroId]?.traits?.find((trait) => trait.level === 1);
  const sources = [base?.description, baseTraitDescriptionForLevel(heroId, "")].filter(Boolean);
  const patterns = [];
  for (const source of sources) {
    const lines = String(source)
      .split("\n")
      .map((part) => part.trim())
      .filter(Boolean);
    const header = lines.findIndex((part) => /^Artificial Moon:$/i.test(part));
    if (header < 0) continue;
    for (const moonLine of lines.slice(header + 1)) {
      if (endsArtificialMoonSection(moonLine)) break; // Sage's Ingredient catalogue (hero trait audit B8, F4)
      const pieces = squash(moonLine).split(/\(\s*[^()]*\/[^()]*\)/);
      const escape = (part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, " ?");
      patterns.push(new RegExp(`^${pieces.map(escape).join("(?:\\([^()]*\\)|[-+]?[\\d.]+)")}$`, "i"));
    }
  }
  moonLinePatterns.set(heroId, patterns);
  return patterns;
}
function isBaseTraitName(heroId, traitName) {
  if (!traitName || traitName === "(base trait)") return true;
  return allHeroTraitsSs13[heroId]?.traits?.find((trait) => trait.level === 1)?.name === traitName;
}
/** Whether `line` is one of the hero's base-trait "Artificial Moon:" lines (the header itself excluded). */
export function isArtificialMoonTraitLine(heroId, traitName, line) {
  if (!isBaseTraitName(heroId, traitName)) return false;
  const text = squash(line);
  if (!text || /^Artificial Moon:?$/i.test(text)) return false;
  return artificialMoonPatterns(heroId).some((pattern) => pattern.test(text));
}
// The gate from the coverage context ({ active, reason }); null when no planner is set (no build to judge, so the line
// keeps its own status).
function artificialMoonState(planner = coverageContext()) {
  if (!planner) return null;
  return planner.heroMemories?.artificialMoonGate ?? artificialMoonGate(planner.state?.hero);
}
const moonGatedOff = (heroId, traitName, line) =>
  artificialMoonState()?.active === false && isArtificialMoonTraitLine(heroId, traitName, line);
// A 45 / 60 / 75 trait with no hero memory in its slot is inactive at level 0 (user-stated rule 2026-10-13;
// src/engine/heroes/hero-memory-rules.js slotTraitLevel). Only judged with a planner whose hero is this hero.
const NO_MEMORY_REASON = "no hero memory installed";
function noMemoryInSlot(heroId, traitName, planner = coverageContext()) {
  if (!planner?.state?.hero || planner.state.hero.selectedHeroId !== heroId) return false;
  return heroTraitSlotLevel(planner.state, traitName)?.level === 0;
}
// Selena (Dance of the Deep) trait lines (badge batch 2026-10-13). The tooltip shows the TLIDB progression text
// ("( +35 / +45 / … )% additional damage taken by enemies affected by Crimson Tide"), which no reader matches; the planner
// carries the levelled copy (src/engine/character-stats.js heroTraitStatLines, source "Hero trait: <name> (Lv N…)") and judges it in
// planner.lineEffects.lines (hero modules, Life sealed, Cursed: the same state src/engine/heroes/selena-dance.js applies). The badge reads
// that levelled line: its line-effects entry when it has one (active → In calc, else Inactive with the condition), else the
// plain readers on the levelled text. Without a planner for this hero the progression collapses to its first value.
const DANCE_OF_THE_DEEP_ID = "selena-dance-of-the-deep";
// Erika (Wind Stalker) batch 2026-10-14: the same levelled-line reading as Dance of the Deep (src/engine/heroes/erika-wind-stalker.js and the
// "stalker" hero module carry the Stalker clauses); an entry's "No DPS effect" / "Not on dummy" status passes through.
const WIND_STALKER_ID = "erika-wind-stalker";
// Thea – Wisdom of The Gods and Youga – The Ultimate One (trait trees, 2026-10-15): their tree traits print TLIDB progressions
// too, so their badges read the levelled line the same way (plain stat lines In calc through the generic readers; lines no
// reader or module models stay Not modeled).
const THEA_WISDOM_ID = "thea-wisdom-of-the-gods",
  YOUGA_ULTIMATE_ID = "youga-the-ultimate-one";
// "Counted in stats": a module's stat line that feeds no damage reader in this build (Rehan – Split Form's Max Life; hero trait audit B10).
const PASS_THROUGH = ["Not modeled", "Partly modeled", "No DPS effect", "Not on dummy", "Counted in stats"];
// The heroes read like Wind Stalker (every levelled line; Dance of the Deep has its own Terra rule below). Hero trait audit
// 2026-10-19 (research/hero-traits-audit-2026-10-19.md F1): every other hero's tooltip prints the TLIDB progressions too, which
// no reader matches ("(+45 / +52 / … ) % additional damage taken …" read Not modeled while the levelled line moved the
// damage), so every hero but Sing with the Tide (own rule; its traits stay out of planner.modifierTexts) reads them this way.
const LEVELLED_GENERIC_HEROES = new Set([
  WIND_STALKER_ID,
  THEA_WISDOM_ID,
  YOUGA_ULTIMATE_ID,
  ...Object.keys(allHeroTraitsSs13).filter((id) => id !== DANCE_OF_THE_DEEP_ID && id !== "selena-sing-with-the-tide"),
]);
const LEVELLED_BADGE_HEROES = new Map([
  [DANCE_OF_THE_DEEP_ID, new Set(["Not modeled", "Partly modeled"])],
  ...[...LEVELLED_GENERIC_HEROES].map((id) => [id, new Set(PASS_THROUGH)]),
]);
const PROGRESSION = /\(\s*[^()]*\/[^()]*\)/g;
function progressionPattern(line) {
  const escape = (part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, " ?");
  return new RegExp(`^${squash(line).split(PROGRESSION).map(escape).join("[-+]?[\\d.]+")}$`, "i");
}
function levelledTraitLine(heroId, traitName, line, planner) {
  if (!planner?.modifierTexts || planner.state?.hero?.selectedHeroId !== heroId) return null;
  const pattern = progressionPattern(line);
  return (
    planner.modifierTexts.find(
      (item) =>
        item.origin === "trait" &&
        String(item.source || "").startsWith(`Hero trait: ${traitName} (`) &&
        pattern.test(squash(item.text)),
    ) || null
  );
}
function levelledLineState(heroId, traitName, line, planner = coverageContext()) {
  const levelled = levelledTraitLine(heroId, traitName, line, planner);
  if (levelled) {
    const entry = (planner.lineEffects?.lines || []).find(
      (item) => item.source === levelled.source && squash(item.text) === squash(levelled.text),
    );
    if (entry) {
      // A line the condition layer leaves unmodeled (its "unmodeled" scope, e.g. "for skills cast by Spell Burst") that an engine
      // reader claims (src/engine/text/line-coverage.js engineLineStatus: the skill-hit Spell Burst model) reads what the engine says, as the
      // same line on gear does (hero trait audit B1, F6: Inspiration Overflow moved the dummy figure while it badged Not modeled).
      if (entry.status === "Not modeled" || entry.status === "Partly modeled") {
        const engine = engineLineStatus(levelled.text, planner);
        if (engine === "In calc" || engine === "Inactive")
          return { status: engine, reason: engine === "Inactive" ? entry.conditionText || "" : "" };
      }
      if (LEVELLED_BADGE_HEROES.get(heroId)?.has(entry.status))
        return { status: entry.status, reason: entry.conditionText || "" };
      return { status: entry.active ? "In calc" : "Inactive", reason: entry.conditionText || "" };
    }
  }
  const text = levelled
    ? levelled.text
    : squash(line).replace(PROGRESSION, (list) => list.slice(1, -1).split("/")[0].trim());
  const status =
    heroModuleLineStatus(heroId, text, planner) ??
    residualNonDamageStatus(normalizePercentageText(String(text)))?.status ??
    refineCoverage("Not modeled", text);
  // A module line the line-effects layer did not carry (an inactive grant): the module's own condition names what is missing.
  const reason =
    status !== "In calc" && planner?.lineEffects?.state
      ? resolveHeroModules([{ text, source: "coverage", origin: "trait", multiplier: 1 }], {
          ...planner.lineEffects.state,
          heroId,
        }).entries[0]?.conditionText || ""
      : "";
  return { status, reason: heroId === DANCE_OF_THE_DEEP_ID && status !== "Inactive" ? "" : reason };
}
const danceLineState = (traitName, line, planner = coverageContext()) =>
  levelledLineState(DANCE_OF_THE_DEEP_ID, traitName, line, planner);

// Trait clauses that change the dummy's damage but wait for a hero engine (hero trait audit 2026-10-19 F5, batch B1): before
// 2026-10-19 they badged No DPS effect / Not on dummy (a word match on "Movement Speed", "Trait Skill", "summoned", ...). They
// read Not modeled and name the engine and the audit batch (§5) that builds it. Keyed by loadout, matched on the tooltip line.
const ENGINE = {
  b12bomb: ["B12", "Bing's bomb engine (Bomb Throwing Speed)"],
  b12whimsy: ["B12", "Bing's Whimsy / Ingenuity Overload engine"],
  b11: ["B11", "Rosa's No Guard / Mercury Pts engine"],
};
const HERO_ENGINE_PENDING = {
  // Carino (Ranger of Glory, Lethal Flash, Zealot of War): modeled by hero trait audit B9 (src/engine/heroes/carino-traits.js, src/engine/heroes/hero-trait-modules.js
  // "ammo" / "specialAmmo" / "heatUp" / "deflection" / "ouroboros").
  // Erika – Lightning Shadow and Vendetta's Sting: modeled by hero trait audit B5 (src/engine/heroes/erika-traits.js, src/engine/heroes/hero-trait-modules.js).
  // Rehan (Anger, Seething Silhouette): modeled by hero trait audit B10 (src/engine/heroes/rehan-traits.js, src/engine/heroes/hero-trait-modules.js "rage" / "burst" /
  // "spirit"); Hysteria's Rage gains (left to B10 by B2) are read there, its Missing Life line by the generic reader (B2).
  "bing-blast-nova": [
    [/^Base Bomb Throwing Speed is/i, "b12bomb"],
    [/additional Bomb Throwing Speed( while moving)?$/i, "b12bomb"],
  ],
  "bing-creative-genius": [
    [/^Gains 2 Inspiration Machines/i, "b12whimsy"],
    [/^Instantly restores 80 Ingenuity Essence/i, "b12whimsy"],
    [/^Effect of Whimsy Signal enhanced to/i, "b12whimsy"],
    [/Whimsy Essence Recovery Speed$/i, "b12whimsy"],
    [/^When casting Ingenuity Overload ?, gains Buff Effect/i, "b12whimsy"],
  ],
  // Thea (Wisdom of The Gods, Incarnation of the Gods, Blasphemer): modeled by hero trait audit B7 (src/engine/heroes/thea-traits.js,
  // src/engine/heroes/hero-trait-modules.js "theaWisdom" / "theaIncarnation" / "theaBlasphemer").
  // Youga – Spacetime Elapse: modeled by hero trait audit B4 (src/engine/heroes/hero-trait-modules.js "elapse").
  // Moto (Order Calling, Charge Calling) and Iris (Growing Breeze, Vigilant Breeze): modeled by hero trait audit B6
  // (src/engine/heroes/moto-iris-traits.js; src/engine/heroes/hero-trait-modules.js "overload" / "chargeCalling" / "irisGrowing" / "irisVigilant").
  "rosa-high-court-chariot": [[/^For every 1 ?% Block Ratio, .*additional No Guard Effect/i, "b11"]],
  "rosa-unsullied-blade": [
    [/^Mana can be consumed via methods other than Mystic Mercury/i, "b11"],
    [/^For every 1000 Max Mana you have, \+10 ?% Max Mercury Pts/i, "b11"],
  ],
  // Sage – Licorice Note: modeled by hero trait audit B8 (src/engine/heroes/sage-traits.js, src/engine/heroes/hero-trait-modules.js "sageScent").
};
/** The engine a hero trait line waits for ({ batch, engine }), or null. */
export function heroTraitPendingEngine(heroId, line) {
  const text = squash(line);
  const hit = (HERO_ENGINE_PENDING[heroId] || []).find(([pattern]) => pattern.test(text));
  return hit ? { batch: ENGINE[hit[1]][0], engine: ENGINE[hit[1]][1] } : null;
}
const pendingReason = (pending) => `Not modeled: needs ${pending.engine} (hero trait audit ${pending.batch})`;

/** Why a base-trait "Artificial Moon:" line is Inactive (what is missing), or "" when it is not gated off. */
// Youga – The Ultimate One's board lines (src/engine/heroes/trait-board-grants.js): what the planner applies. The Clockwork Core line and the
// trait skills' effects are read by src/engine/heroes/youga-ultimate-one.js (the module's badge and the skill badges carry their reasons).
function yougaBoardLineReason(line) {
  const text = squash(line),
    grant = TRAIT_SLOT_GRANTS[text];
  if (grant)
    return `${text}: applied. ${grant.skill} (Lv. 20 trait skill; the skill takes no energy, supports added to it cost energy as usual) takes Active slot ${grant.row + 1}, and the skill placed there is left out of the calculation${text === "Spacetime Conqueror" ? "; -15% Movement Speed is read" : ""}. What ${grant.skill} does on the dummy is on its skill badge (src/engine/heroes/youga-ultimate-one.js).`;
  return "";
}

export function heroTraitLineCoverageReason(heroId, traitName, line, selected) {
  if (selected && noMemoryInSlot(heroId, traitName)) return NO_MEMORY_REASON;
  if (selected && heroId === YOUGA_ULTIMATE_ONE_ID && yougaBoardLineReason(line)) return yougaBoardLineReason(line);
  if (selected && moonGatedOff(heroId, traitName, line)) return `Artificial Moon: ${artificialMoonState().reason}`;
  if (selected && heroTraitPendingEngine(heroId, line)) return pendingReason(heroTraitPendingEngine(heroId, line));
  if (selected && heroId === DANCE_OF_THE_DEEP_ID && !/additional Terra Skill Damage$/i.test(squash(line))) {
    const state = danceLineState(traitName, line);
    if (state.status !== "In calc" && state.reason) return state.reason;
  }
  if (selected && LEVELLED_GENERIC_HEROES.has(heroId) && !/^Artificial Moon:?$/i.test(squash(line))) {
    const state = levelledLineState(heroId, traitName, line);
    if (state.status !== "In calc" && state.reason) return state.reason;
  }
  // Dance of the Deep base trait (user-confirmed 2026-10-13): "+X% additional Terra Skill Damage" reaches Terra skills' hits
  // only, not a Terra skill's own damage over time (Frost Terra, Thornfield).
  if (selected && /additional Terra Skill Damage$/i.test(squash(line)))
    return "Terra Skill Damage reaches Terra skills' hits only, not their own damage over time (user-confirmed 2026-10-13)";
  return "";
}

export function heroTraitLineCoverage(heroId, traitName, line, selected) {
  if (!selected) return "Not selected";
  if (noMemoryInSlot(heroId, traitName)) return "Inactive";
  if (moonGatedOff(heroId, traitName, line)) return "Inactive";
  if (heroTraitPendingEngine(heroId, line)) return "Not modeled";
  // Other heroes (talent batch chunk 4): trait lines are build lines (origin "trait"), so the engine-line layer reads them
  // per engine (In calc, Inactive, No DPS effect, …) and the hero modules (src/engine/heroes/hero-trait-modules.js) give their own status.
  // A line no module claims and that cannot change dummy damage (headers, trait controls: residual batch §6) is neutral.
  if (heroId === DANCE_OF_THE_DEEP_ID)
    return /^Artificial Moon:?$/i.test(squash(line)) ? "No DPS effect" : danceLineState(traitName, line).status;
  // Youga's Spacetime Dictator / Conqueror / Overlord: the slot replacement is applied (src/engine/heroes/trait-board-grants.js).
  if (heroId === YOUGA_ULTIMATE_ONE_ID && TRAIT_SLOT_GRANTS[squash(line)]) return "In calc";
  if (LEVELLED_GENERIC_HEROES.has(heroId))
    return /^Artificial Moon:?$/i.test(squash(line))
      ? "No DPS effect"
      : levelledLineState(heroId, traitName, line).status;
  if (heroId !== "selena-sing-with-the-tide")
    return (
      heroModuleLineStatus(heroId, line, coverageContext()) ??
      residualNonDamageStatus(normalizePercentageText(String(line || "")))?.status ??
      refineCoverage("Not modeled", line)
    );
  return selenaTideLineStatus(line, coverageContext());
}

// Selena (Sing with the Tide) trait lines, keyed by text so the base-trait copy reads like the trait (residual batch P7: a
// fixed list keyed by trait name read 31 of 32 options Not modeled). Statuses follow what src/engine/planner.js and
// src/engine/theoretical-sources.js model: the Bard state (-20% additional Channeled Skill Damage), the Tide effect (+15%), damage
// taken on the Tide, Wave Aria, Idyll stacks and Murmurs' Tide Effect, each In calc while its condition holds in the build.
// Loud Song on its own is not modeled (the planner assumes Bard; Ceaseless Tide holds both).
function selenaTideLineStatus(line, planner) {
  const text = cleanGameText(String(line || ""));
  const conditions = planner?.conditions || null;
  // The Tide entries apply only with Selena (Sing with the Tide) selected (src/engine/theoretical-sources.js checks the hero id).
  const selena = !planner?.state?.hero || planner.state.hero.selectedHeroId === "selena-sing-with-the-tide";
  const held = (key) => (!conditions ? "In calc" : selena && conditions[key] ? "In calc" : "Inactive");
  // Selena traits batch (2026-10-13; src/engine/heroes/selena-tide.js): Loud Song is in calc only through Ceaseless Tide (deemed Loud Song
  // while Bard; the planner keeps the Bard state otherwise), Chantey of Sinking with it, Undersea Ballad's Skill Area share
  // while the Tide holds, Sea Foam's count from the build's channel lines, and the Artificial Moon line while an equipped memory
  // carries the Artificial Moon revived affix (user-confirmed 2026-10-13: no base-trait-level requirement; Inactive without one).
  const tide = planner?.singWithTheTide || null;
  if (/^Artificial Moon:?$/i.test(text) || /^Click the Trait Slot/i.test(text)) return "No DPS effect";
  if (/^In the Loud Song state, /i.test(text)) return tide?.ceaselessTide ? "In calc" : "Not modeled";
  // The base trait's Loud Song form line (-20% additional Attack and Cast Speed, +80% additional Tide Effect): applied with
  // Ceaseless Tide (src/engine/heroes/selena-tide.js, src/engine/planner.js loudSongSpeedLines); before 2026-10-19 it badged No DPS effect
  // (hero trait audit B1, F6).
  if (/^In Loud Song form, /i.test(text)) return tide?.ceaselessTide ? "In calc" : "Not modeled";
  if (/^For every 1 s in the Loud Song state/i.test(text))
    return !tide ? "Not modeled" : tide.chantey.stacks > 0 ? "In calc" : "Inactive";
  if (/Skill Area is also applied to Tide Effect/i.test(text))
    return !tide ? "Not modeled" : tide.undersea.selected && tide.tideUp ? "In calc" : "Inactive";
  if (/Skill Area and .*Skill Effect Duration when on the Tide$/i.test(text))
    return !tide ? "Not modeled" : tide.artificialMoon.lines.length ? "In calc" : "Inactive";
  if (
    /^In the Bard state, it is possible to move while casting Spell Channeled Skills, and .*additional Channeled Skill Damage$/i.test(
      text,
    )
  )
    return "In calc";
  if (
    /^In the Bard state, (?:Attack Channeled Skills and Attack Mobility Skills cannot be used|the Main Skill is auto channeled while moving|the bubble no longer leaves a Tide)/i.test(
      text,
    ) ||
    /^After losing all Tides/i.test(text) ||
    /^Tide ?'s area is no longer affected by Skill Area$/i.test(text)
  )
    return "No DPS effect";
  // Bard Song channel: the planner's Bard residual is a measured stand-in, not a model of the song (src/engine/skills/scorching-beam-delivery.js).
  // User-stated 2026-10-13 (uncertain): Bard Song turns non-channeled skills into channeled ones; its interval and max stacks
  // are unknown, so those skills keep their normal casts (planner.singWithTheTide.bardSong lists them).
  if (/Bard Song/i.test(text)) return "Partly modeled";
  if (/^The bubble leaves a Tide/i.test(text)) return held("tideContact");
  if (/^When contacting a Tide ?, gains the following Tide Effect/i.test(text)) return held("tideContact");
  if (/additional damage taken by enemies on the Tide$/i.test(text)) return held("onTheTide");
  if (/^Tide grants an additional effect:/i.test(text)) return held("waveAria");
  if (/^Tide grants the following additional effects: For every 1 m moved in the Tide/i.test(text))
    return held("idyll");
  if (/^In the Bard state, .*Tide Duration and .*additional Tide Effect$/i.test(text))
    return planner?.murmursTideEffectPercent > 0 || !planner ? "In calc" : "Inactive";
  // Sea Foam Nocturne: the count from the build's Max / Min Channeled Stacks, supports included (user-confirmed 2026-10-13),
  // plus the manual extra fields; the bubble flying speed has no DPS effect.
  if (/^For every \+1 max or min Channeled Stacks/i.test(text))
    return tide && !tide.seaFoamNocturne.applied ? "Inactive" : "In calc";
  if (/Channeled Stacks/i.test(text)) return "Partly modeled";
  return residualNonDamageStatus(text)?.status ?? refineCoverage("Not modeled", text);
}

export function heroTraitCoverage(heroId, traitName, lines, selected) {
  if (!selected) return "Not selected";
  if (noMemoryInSlot(heroId, traitName)) return "Inactive";
  // Idyll of the Tide: its stacks persist while the Tide is up (user-confirmed 2026-10-09) and own buffs start built
  // (prebuiltSelfBuffs), so the planner applies the configured stacks (15, the cap) × per-level value × Tide Effect
  // (src/engine/heroes/selena-tide.js); the line reads In calc while the Idyll condition holds, and the trait follows its lines.
  // Sea Foam's "Min Channeled Stacks takes effect twice on Bard Song" belongs to the Bard Song channel (not modeled).
  if (heroId === "selena-sing-with-the-tide" && traitName === "Sea Foam Nocturne") return "Partly modeled";
  // Undersea Ballad and Chantey of Sinking: user-confirmed readings 2026-10-13 (increased Tide Effect).
  if (
    heroId === "selena-sing-with-the-tide" &&
    [
      "Sing with the Tide",
      "Wave Aria",
      "Murmurs of the Distant Tide",
      "Undersea Ballad",
      "Chantey of Sinking",
    ].includes(traitName)
  )
    return "In calc";
  // Artificial Moon lines that are gated off are Inactive (heroTraitCoverageReason names what is missing); they do not
  // lower the trait's coverage, and the bare header has no badge of its own.
  const counted = lines.filter(
    (line) => !/^Artificial Moon:?$/i.test(squash(line)) && !moonGatedOff(heroId, traitName, line),
  );
  const statuses = counted.map((line) => heroTraitLineCoverage(heroId, traitName, line, true));
  if (lines.length && !statuses.length) return "Inactive";
  if (statuses.length && statuses.every((status) => status === "In calc")) return "In calc";
  // Dance of the Deep: a line whose condition does not hold in this build (Inactive) or that cannot change dummy damage is
  // neutral; the trait is In calc when every other line is, Inactive when no line applies (badge batch 2026-10-13).
  // The same rule reads Idyll of the Tide (its "switch to Bard" line has no DPS effect).
  if (
    (heroId === DANCE_OF_THE_DEEP_ID ||
      LEVELLED_GENERIC_HEROES.has(heroId) ||
      heroId === "selena-sing-with-the-tide") &&
    statuses.every((status) => status === "In calc" || status === "Inactive" || neutralStatuses.has(status))
  ) {
    if (statuses.includes("In calc")) return "In calc";
    if (statuses.includes("Inactive")) return "Inactive";
    return combineStatuses(statuses);
  }
  return statuses.some((status) => status === "In calc" || status === "Partly modeled")
    ? "Partly modeled"
    : "Not modeled";
}

/** Badge tooltip for a trait whose Artificial Moon lines are off for want of the memory; "" otherwise. */
export function heroTraitCoverageReason(heroId, traitName, lines, selected) {
  if (!selected) return "";
  if (noMemoryInSlot(heroId, traitName))
    return `Inactive: ${NO_MEMORY_REASON} (the trait starts at level 0 until a memory is in its slot).`;
  const gated = (lines || []).find((line) => moonGatedOff(heroId, traitName, line));
  if (gated) return `Artificial Moon lines: Inactive. ${artificialMoonState().reason}.`;
  // Lines waiting for a hero engine (HERO_ENGINE_PENDING) name it after the Inactive list (hero trait audit B1).
  const pending = (lines || []).filter(
    (line) => !moonGatedOff(heroId, traitName, line) && heroTraitPendingEngine(heroId, line),
  );
  const pendingText = pending.length
    ? `${pending.map((line) => `${squash(line)} (${pendingReason(heroTraitPendingEngine(heroId, line))})`).join("; ")}.`
    : "";
  if (heroId === DANCE_OF_THE_DEEP_ID || LEVELLED_GENERIC_HEROES.has(heroId)) {
    const inactive = (lines || []).filter(
      (line) =>
        !/^Artificial Moon:?$/i.test(squash(line)) &&
        heroTraitLineCoverage(heroId, traitName, line, true) === "Inactive",
    );
    const inactiveText = inactive.length
      ? `Inactive in this build: ${inactive
          .map((line) => {
            const reason = heroTraitLineCoverageReason(heroId, traitName, line, true);
            return reason ? `${squash(line)} (${reason})` : squash(line);
          })
          .join("; ")}.`
      : "";
    return [inactiveText, pendingText].filter(Boolean).join(" ");
  }
  if (pendingText) return pendingText;
  if (heroId === YOUGA_ULTIMATE_ONE_ID) return (lines || []).map(yougaBoardLineReason).filter(Boolean).join(" ");
  return "";
}

export function gearLineCoverage(item, text, active, block, lowResources, blurEffects) {
  // A named affix line ("Wield My Sword"): its badge summarizes its effect lines (src/engine/text/named-gear-affixes.js), as a Dirge
  // keyword's badge summarizes the effect lines it carries.
  const named = namedGearAffixLines(text);
  if (named.length) return gearLineCoverage(item, named.join("\n"), active, block, lowResources, blurEffects);
  return refineCoverage(
    baseGearLineCoverage(item, text, active, block, lowResources, blurEffects),
    text,
    undefined,
    (clause) => baseGearLineCoverage(item, clause, active, block, lowResources, blurEffects),
  );
}

export function talentLineCoverage(text, active) {
  return refineCoverage(baseTalentLineCoverage(text, active), text, undefined, (clause) =>
    baseTalentLineCoverage(clause, active),
  );
}

export function slateLineCoverage(text, active) {
  // The engine looks lines up by their bare text: strip each clause's "Class: <Talent type>:" prefix before refining
  // (e.g. "Prophet: Legendary Medium Talent: +10% additional damage against Frozen enemies"), and a Pedigree of Gods core's
  // "Name — " lead ("Goddess of Hunting: Lv.2 Core Talent: Rushed — +30% additional damage …"). Before (core audit
  // 2026-10-18 F4) the lead stayed on, so the clause missed its reader's status: 20 core clauses that move read Not modeled /
  // No DPS effect, and 4 unmodeled ones read In calc from the slate table.
  const raw = String(text || "");
  const coreName = raw.match(/Core Talent:\s*([A-Z][^—|·]*?) — /)?.[1]?.trim() || null;
  const body = raw
    .split(/(\s+\|\s+|\s+·\s+)/)
    .map((part) => part.replace(/^[^:|·]+:\s*[^:|·]*Talent[^:|·]*:\s*/i, "").replace(/^[A-Z][^—|·:]*? — /, ""))
    .join("");
  if (coreName && active) {
    // A Pedigree core's clauses read as the same core's on the panel (the core tooltip's per-clause rule): clauses the core
    // applies by name (Affliction, Starfire's Ignite limit …; src/engine/text/granted-core-lines.js) by the core rule, Daze by its Blur
    // state, the rest by their readers over "Not independently modeled" (not the slate-table base, which read Last Stand's
    // "Block Ratio is set to 0%" In calc from the slate while the panel's copy reads No DPS effect).
    const clauses = body
      .split(/\s+\|\s+|\s+·\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (coreName === "Daze") return dazeStatus(coverageContext());
    const statuses = clauses.map((clause) =>
      isNameReadCoreClause(coreName, clause)
        ? nameReadCoreStatus(coreName)
        : refineCoverage("Not independently modeled", clause),
    );
    return statuses.length === 1 ? statuses[0] : combineStatuses(statuses);
  }
  return refineCoverage(baseSlateLineCoverage(body, active), body, undefined, (clause) =>
    baseSlateLineCoverage(clause, active),
  );
}
