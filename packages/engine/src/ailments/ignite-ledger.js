// The Ignite ledger: every line of the build that reaches Ignite (base, increased, additional, chance, duration, limit,
// inflicted stacks, Affliction effect, penetration), the combat states every damage over time shares, the passive
// Affliction per second and the Reaping timing. It computes no Ignite damage: the generic ailment model
// (ailment-model.js) reads base, chance, duration, limit and stacks from it, and the shared ailment layers
// (ailment-shared.js) read its lines, for Ignite and for the Trauma / Wilt / skill DoT layers that inherit them.
import { firesAllureDurationSources } from "../skills/fires-allure.js";
import { blessingRecoverySources } from "../defense/blessing-gear-effects.js";
import { normalizePercentageText } from "../text/percentage-text.js";
import { curseEffects } from "../skills/curse-model.js";
import { projectTooltipAfflictionRating } from "../theoretical-damage.js";
import { supportEffect } from "../supports/support-model.js";
import { mainStatParts, mainStatsOf } from "../skills/main-stats.js";
import { effectiveGearModifierTexts, skillLevelDamageMultiplier } from "../engine.js";
import { collectReapingSources } from "./reaping-sources.js";
import {
  averagedResistanceFactor,
  maxAfflictionUptime,
  windowMaxAfflictionFraction,
} from "./max-affliction-resistance.js";

const value = (ledger, stat, type) => ledger[`${stat}:${type}`] || 0;
// The rounding the town tooltip factors always had (four places).
const round = (amount) => Number(amount.toFixed(4));
// `detail` carries what the line does (its tooltip text and/or stat key) so consumers such as
// the shared ailment layers can tell Fire/Elemental-only effects from generic ones.
const entry = (source, value, category, confidence = "documented", detail = {}) => ({
  source,
  value,
  category,
  confidence,
  ...Object.fromEntries(Object.entries(detail).filter(([, item]) => item !== undefined)),
});
// Slate "+X% additional Fire Damage" lines, one factor each (in-game panel: 81.2515% =
// 1.6318375 × 1.068 × 1.04). Falls back to the summed total when the per-line list is absent.
function slateAdditionalFireLines(talentSlate, total) {
  const lines = talentSlate?.candidateSlateAdditionalFirePercents || [];
  const sum = lines.reduce((acc, item) => acc + item, 0);
  return lines.length && Math.abs(sum - total) < 1e-3 ? lines : total ? [total] : [];
}

// Base Ignite an active Aura's buff adds (skill text: Flame Focus and its Precise form "Adds 2 - 2 Base Ignite Damage" at every
// level). No modifier text carries it, so the enemy-ailment model reads it from here too.
export function auraBaseIgnite(activeNames) {
  return ["Flame Focus", "Precise: Flame Focus"]
    .filter((name) => activeNames.has(name))
    .map((name) => ({ source: `Aura: ${name}`, min: 2, max: 2 }));
}

// `main` is the skill the ledger's skill-scoped lines belong to (its supports, its tags, its level past 20).
export function compileIgniteLedger({
  blurEffects,
  blessings = { damageSources: [] },
  block = { damageSources: [] },
  coreTalents = { lines: [] },
  enemyOnTideDamageTakenPercent = 20,
  tideEffectFactor = 1,
  waveAriaPercent = 16,
  idyllPerStackPercent = 1.6,
  heroMemories = { lines: [], totals: {} },
  main,
  setups = [],
  activeNames,
  talentSlate,
  equipment,
  pact,
  pactState = {},
  aura,
  igniteLimit,
  combat,
  conditions,
  heroId,
  mainStatPoints = null,
  extraSources = {},
}) {
  const curses = curseEffects(setups);
  const supports = new Map(
    (main?.supports || []).filter((support) => support.enabled !== false).map((support) => [support.name, support]),
  );
  const talent = talentSlate.candidateTalent;
  const slate = talentSlate.candidateSlate;
  const gear = equipment.candidate;

  const unmodeledBaseIgnite = [];
  const gearBaseRanges = equipment.candidateItems.flatMap((item) =>
    effectiveGearModifierTexts(item)
      .map((text) => {
        // "Base Ailment Damage" adds to Ignite as well as Trauma and Wilt (affix 864619904).
        const match = text.match(/^Adds\s+(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s+Base (?:Ignite|Ailment) Damage$/i);
        if (!match && /Base Ignite Damage/i.test(text)) unmodeledBaseIgnite.push(`${item.name}: ${text}`);
        return match ? { source: item.name, text, min: Number(match[1]), max: Number(match[2]) } : null;
      })
      .filter(Boolean),
  );
  const flameFocusBase = auraBaseIgnite(activeNames).map((line) =>
    entry(line.source, line.min, "Base Ignite", "skill text: Adds 2 - 2 Base Ignite Damage at every level"),
  );
  const baseSources = [
    entry("Talents", talent.baseIgniteDamage || 0, "Base Ignite"),
    entry("Divinity Slates", slate.baseIgniteDamage || 0, "Base Ignite"),
    ...flameFocusBase,
    ...gearBaseRanges.map((range) => ({
      ...entry(range.source, range.min, "Base Ignite", "documented", { text: range.text }),
      max: range.max,
    })),
    // Main-skill scoped lines ("… to the supported skill", "… to this skill"; build-mechanics.js).
    ...(extraSources.base || []).map((line) => ({
      ...entry(line.source, line.min, "Base Ignite", "documented", { text: line.text }),
      max: line.max,
    })),
  ].filter((item) => item.value || item.max);
  const increasedSources = [
    ...heroMemories.lines
      .filter((line) =>
        ["damagePercent", "damageOverTimePercent", "elementalDamagePercent", "firedamage"].includes(line.stat),
      )
      .map((line) =>
        entry(line.source + ": " + line.text, line.value, "Increased damage", "documented", {
          stat: line.stat,
          text: line.text,
        }),
      ),
    entry("Talent: damage", talent.damagePercent || 0, "Increased damage"),
    entry("Talent: damage over time", talent.damageOverTimePercent || 0, "Increased damage"),
    entry("Talent: fire damage over time", talent.fireDamageOverTimePercent || 0, "Increased damage"),
    entry("Equipment: damage", value(gear, "damagePercent", "increased"), "Increased damage"),
    entry("Equipment: damage over time", value(gear, "damageOverTimePercent", "increased"), "Increased damage"),
    entry("Equipment: elemental damage", value(gear, "elementalDamagePercent", "increased"), "Increased damage"),
    entry("Pacts: elemental damage", pact.totals.elementalDamagePercent || 0, "Increased damage"),
    entry("Pacts: fire damage", pact.totals.fireDamagePercent || 0, "Increased damage"),
    entry("Pacts: damage", pact.totals.damagePercent || 0, "Increased damage"),
    entry("Pacts: damage over time", pact.totals.damageOverTimePercent || 0, "Increased damage"),
    // "+X% Area Damage" (attr 5719, skill tag Area) is not here: the user confirmed 2026-10-11 that Area
    // Damage does not boost damage over time (it stays on the skill hits). It was
    // added 2026-10-09 from the Vorax Digits Ignite ratio (1.05000 only with +9% in the pool); that ratio
    // now needs another explanation (research/ignite-attribute-mapping-2026-10-09.md, "Superseded").
    ...(extraSources.increased || []).map((line) =>
      entry(line.source, line.value, "Increased damage", line.condition, { text: line.text }),
    ),
  ].filter((item) => item.value);
  const coreAdditionalSources = coreTalents.lines
    .filter((line) => ["additionalDamagePercent", "additionalDamageOverTimePercent"].includes(line.stat))
    .map((line) => entry("Core talent: " + line.source, line.value, "Additional damage", line.condition));
  // Selena's Bard state "-20% additional Channeled Skill Damage" is not in this ledger. User-confirmed 2026-10-13 (Selena
  // traits batch Q2): it scales only the channeled skill's direct hit damage, never Ignite, Trauma, Wilt, a skill's own DoT or the Reaps, which all read this ledger.
  // Before 2026-10-13 it was an unscoped -20% here (Ignite and Reaps ×0.8).
  const additionalSources = [];
  // The main skill's main stats (main-stats.js; its ailments included): every inflicting skill replaces them with its own
  // (ailment-applications.js), so the line is the main skill's.
  const mainStats = mainStatParts(mainStatsOf(main?.tags || []), mainStatPoints);
  if (mainStats.length)
    additionalSources.push(
      entry(
        `${main.name} main stats (${mainStats.map((part) => part.stat).join(" + ")}; 0.5% per point)`,
        mainStats.reduce((sum, part) => sum + part.value, 0),
        "Additional main-stat damage",
        "stat sheet",
        { mainSkillScoped: true },
      ),
    );
  additionalSources.push(...coreAdditionalSources);
  if (conditions.targetLife !== false) {
    if (talent.additionalDamageToLifePercent)
      additionalSources.push(
        entry(
          "Talents: additional damage applied to Life",
          talent.additionalDamageToLifePercent,
          "Additional damage",
          "Target Life",
        ),
      );
    if (slate.additionalDamageToLifePercent)
      additionalSources.push(
        entry(
          "Slates: additional damage applied to Life",
          slate.additionalDamageToLifePercent,
          "Additional damage",
          "Target Life",
        ),
      );
  }
  // Skill-tag-gated text lines ("+X% additional Ailment Damage dealt by attacks", Great Strength; packages/engine/src/text/damage-line-classifier.js
  // `requiresSkillTag`) follow the Aura rule below: active with `requiresSkillTag` when the inflicting main skill has the tag,
  // otherwise listed in `inactiveSources`; packages/engine/src/ailments/ailment-applications.js re-gates both per inflicting skill.
  const inflictingTags = new Set((main?.tags || []).map((tag) => String(tag).toLowerCase()));
  const inactiveSources = [];
  for (const line of extraSources.additional || []) {
    const tag = line.requiresSkillTag;
    if (tag && !inflictingTags.has(tag.toLowerCase())) {
      inactiveSources.push({
        source: line.source,
        text: line.text,
        value: line.value,
        category: "Additional damage",
        requiresSkillTag: tag,
        reason: `${main?.name || "the skill inflicting the ailment"} is not an ${tag} skill`,
      });
      continue;
    }
    additionalSources.push(
      entry(line.source, line.value, "Additional damage", line.condition, { text: line.text, requiresSkillTag: tag }),
    );
  }
  // Spell-scoped Blessing lines (`skillTags`, e.g. Bunch) are hit-only: never Ignite (Spell Damage never reaches ailments).
  additionalSources.push(
    ...blessings.damageSources
      .filter((line) => !line.skillTags)
      .map((line) =>
        entry(
          line.source,
          line.value,
          "Additional damage",
          "Blessing stacks: the max with a gain source, or as set in Composition",
          line.text ? { text: line.text } : undefined,
        ),
      ),
  );
  increasedSources.push(
    ...(blessings.increasedSources || []).map((line) =>
      entry(
        line.source,
        line.value,
        "Increased damage",
        "Blessing stacks: the max with a gain source, or as set in Composition",
        {
          text: line.text,
        },
      ),
    ),
  );
  increasedSources.push(
    ...block.damageSources.map((line) =>
      entry(line.source + ": Blocked recently", line.value, "Increased damage", "conditional"),
    ),
  );
  for (const line of blurEffects?.damageSources || [])
    (line.additional ? additionalSources : increasedSources).push(
      entry(
        line.source,
        line.value,
        line.additional ? "Additional damage" : "Increased damage",
        "Configured Blur state",
      ),
    );
  // TLIDB Skill Level: past Lv.20 Base Damage stops growing and the skill gains +10% (21–30) /
  // +8% (31+) additional damage per level (multiplies). That bonus covers everything the skill
  // deals, including its ailments. (Levels 1–20 raise Base Damage, which ailments do not use.)
  if (main?.effectiveLevel > 20) {
    additionalSources.push(
      entry(
        `${main.name} level ${main.effectiveLevel}`,
        (skillLevelDamageMultiplier(main.effectiveLevel) - 1) * 100,
        "Additional damage",
        "TLIDB Skill Level: additional damage past Lv.20",
        { mainSkillScoped: true },
      ),
    );
  }
  const ailmentEnhancement = value(gear, "ailmentDamageEnhancementPercent", "increased");
  if (ailmentEnhancement)
    additionalSources.push(
      entry("Equipment: Ailment Damage Enhancement", ailmentEnhancement, "Additional ailment damage"),
    );
  // The main skill's supports reach this ledger through their clauses (build-mechanics.js `extraSources`: "Support: …"
  // lines), and each inflicting skill's own supports through its applier (ailment-applications.js: `scale`, extra stacks,
  // scoped chance). Additional Ignite's "additional Ignite Damage per Ignite stack" has no reader yet (open).
  const inflictedStackSources = [
    entry("Talents", talent.additionalIgniteStacks || 0, "Additional Ignite stacks inflicted"),
    entry(
      "Divinity Slates · including copied talents",
      slate.additionalIgniteStacks || 0,
      "Additional Ignite stacks inflicted",
    ),
    entry("Equipment", value(gear, "additionalIgniteStacks", "flat"), "Additional Ignite stacks inflicted"),
  ].filter((item) => item.value);
  const flatAdditionalStacks = inflictedStackSources.reduce((sum, item) => sum + item.value, 0);
  const chanceSources = [
    entry("Talents: Ignite chance", talent.igniteChancePercent || 0, "Ignite application chance"),
    entry("Talents: damaging ailments", talent.damagingAilmentChancePercent || 0, "Ignite application chance"),
    entry("Talents: ailments", talent.ailmentChancePercent || 0, "Ignite application chance"),
    entry("Divinity Slates: Ignite chance", slate.igniteChancePercent || 0, "Ignite application chance"),
    entry("Divinity Slates: damaging ailments", slate.damagingAilmentChancePercent || 0, "Ignite application chance"),
    entry("Divinity Slates: ailments", slate.ailmentChancePercent || 0, "Ignite application chance"),
    entry("Equipment: Ignite chance", value(gear, "igniteChancePercent", "increased"), "Ignite application chance"),
    entry(
      "Equipment: damaging ailments",
      value(gear, "damagingAilmentChancePercent", "increased"),
      "Ignite application chance",
    ),
    entry("Equipment: ailments", value(gear, "ailmentChancePercent", "increased"), "Ignite application chance"),
    entry("Pacts: Ignite chance", pact.totals.chanceToIgniteTargetsPercent || 0, "Ignite application chance"),
    entry("Pacts: damaging ailments", pact.totals.damagingAilmentChancePercent || 0, "Ignite application chance"),
    ...["Flame Focus", "Precise: Flame Focus"]
      .filter((name) => activeNames.has(name))
      .map((name) =>
        entry(
          `Aura: ${name}`,
          (aura?.entries || []).find((item) => item.name === name)?.effectiveEffects?.igniteChancePercent ??
            (name === "Flame Focus" ? 10 : 15),
          "Ignite application chance",
        ),
      ),
    ...["Ailment Amplification", "Precise: Ailment Amplification"]
      .filter((name) => activeNames.has(name))
      .map((name) =>
        entry(
          `Aura: ${name}`,
          (aura?.entries || []).find((item) => item.name === name)?.effectiveEffects?.ailmentChancePercent || 0,
          "Ignite application chance",
        ),
      ),
    // `skillScoped`: lines of the main skill and its supports only. Every other entry is build-wide and is
    // the Ignite chance every inflicting skill starts from (packages/engine/src/ailments/ailment-applications.js igniteGlobalChanceSources).
    ...(extraSources.chance || []).map((line) =>
      entry(line.source, line.value, "Ignite application chance", "documented", { text: line.text, skillScoped: true }),
    ),
  ].filter((item) => item.value);
  // "+X% Ignite Chance against enemies that haven't been Ignited" (affix 2214789): the same chance
  // field (2006480) gated on the target NOT being Ignited (notOthers 4000130). It is kept out of the
  // summed chance: it only counts for attempts made while the dummy has no active Ignite (the first
  // application on a clean dummy, a re-application after the shared timer expires). Listed only: no Ignite model
  // reads it since the Scorching Beam delivery that applied it was deleted (open).
  const notIgnitedChanceSources = [
    entry(
      "Talents: vs dummy not yet Ignited (5 s / 20 s windows: first application, re-application after expiry)",
      talent.igniteChanceAgainstNotIgnitedPercent || 0,
      "Ignite chance vs not-Ignited dummy",
      "only while the dummy has no active Ignite",
    ),
    entry(
      "Divinity Slates: vs dummy not yet Ignited (5 s / 20 s windows: first application, re-application after expiry)",
      slate.igniteChanceAgainstNotIgnitedPercent || 0,
      "Ignite chance vs not-Ignited dummy",
      "only while the dummy has no active Ignite",
    ),
  ].filter((item) => item.value);
  const additionalIgniteDurationRolls =
    pact.additionalIgniteDurationRolls ??
    (pact.totals.additionalIgniteDurationPercent
      ? [{ source: "Kismet: Volcano", value: pact.totals.additionalIgniteDurationPercent }]
      : []);
  const allDurationSources = [
    entry("Talents: Ignite duration", talent.igniteDurationPercent || 0, "Increased Ignite duration"),
    entry("Talents: ailment duration", talent.ailmentDurationPercent || 0, "Increased Ignite duration"),
    entry("Divinity Slates: Ignite duration", slate.igniteDurationPercent || 0, "Increased Ignite duration"),
    entry("Divinity Slates: ailment duration", slate.ailmentDurationPercent || 0, "Increased Ignite duration"),
    entry("Equipment: Ignite duration", value(gear, "igniteDurationPercent", "increased"), "Increased Ignite duration"),
    entry(
      "Equipment: ailment duration",
      value(gear, "ailmentDurationPercent", "increased"),
      "Increased Ignite duration",
    ),
    entry("Pacts: ailment duration", pact.totals.ailmentDurationPercent || 0, "Increased Ignite duration"),
    ...["Ailment Amplification", "Precise: Ailment Amplification"]
      .filter((name) => activeNames.has(name))
      .map((name) =>
        entry(
          `Aura: ${name}`,
          (aura?.entries || []).find((item) => item.name === name)?.effectiveEffects?.ailmentDurationPercent || 0,
          "Increased Ignite duration",
        ),
      ),
    ...additionalIgniteDurationRolls.map((roll) => ({
      ...entry(
        roll.source,
        roll.value,
        "Additional Ignite duration",
        "Game-file operation 4; equipped-item binding provisional",
      ),
      key: roll.key,
    })),
  ].filter((item) => item.value);
  const durationSources = firesAllureDurationSources(allDurationSources, coreTalents.firesAllure);
  const limitSources = [
    entry("Base Ignite limit", 1, "Active Ignite limit"),
    entry(
      "Talent: Starfire",
      Math.max(
        0,
        igniteLimit -
          1 -
          (pact.totals.igniteLimit || 0) -
          value(gear, "igniteLimit", "flat") -
          (talent.igniteLimit || 0) -
          (slate.igniteLimit || 0),
      ),
      "Active Ignite limit",
    ),
    entry("Talents: Ignite limit", talent.igniteLimit || 0, "Active Ignite limit"),
    entry("Divinity Slates: Ignite limit", slate.igniteLimit || 0, "Active Ignite limit"),
    entry("Equipment: Ignite limit", value(gear, "igniteLimit", "flat"), "Active Ignite limit"),
    entry("Kismet: Volcano", pact.totals.igniteLimit || 0, "Active Ignite limit"),
  ].filter((item) => item.value);
  const slateFireLines = slateAdditionalFireLines(talentSlate, slate.additionalFireDamagePercent || 0);
  for (const percent of slateFireLines)
    additionalSources.push(
      entry(
        slateFireLines.length > 1
          ? `Divinity Slates: additional Fire (+${percent}% line)`
          : "Divinity Slates: additional Fire",
        percent,
        "Additional damage",
      ),
    );
  const gearAdditional = value(gear, "additionalIgniteDamagePercent", "more");
  if (gearAdditional)
    additionalSources.push(entry("Equipment: additional Ignite", gearAdditional, "Additional Ignite damage"));
  const gearAdditionalFire = value(gear, "additionalFireDamagePercent", "more");
  if (gearAdditionalFire)
    additionalSources.push(entry("Equipment: additional Fire", gearAdditionalFire, "Additional damage"));
  // Each pact / kismet "+X% additional damage" line is its own multiplier (game: attr 5719 operation 4, kept apart by the generic
  // collector; packages/engine/src/engine.js calculatePactCandidate outgoingAdditionalDamageLines), as the skill-hit engine already reads them
  // (pact badge audit 2026-10-13; before, they were summed into one entry). One line keeps the aggregate label, as the slates do.
  const pactAdditionalLines = (pact.outgoingAdditionalDamageLines || []).filter((line) => line.value);
  if (pactAdditionalLines.length > 1)
    for (const line of pactAdditionalLines)
      additionalSources.push(
        entry(`Pacts: additional damage (${line.source})`, line.value, "Additional damage", "documented", {
          text: line.text,
        }),
      );
  else if (pact.totals.outgoingAdditionalDamagePercent)
    additionalSources.push(
      entry("Pacts: additional damage", pact.totals.outgoingAdditionalDamagePercent, "Additional damage"),
    );

  if (pact.totals.additionalDamageOverTimePercent)
    additionalSources.push(
      entry("Kismets: additional Damage Over Time", pact.totals.additionalDamageOverTimePercent, "Additional damage"),
    );
  const auraEntries = new Map((aura?.entries || []).map((item) => [item.name, item]));
  const igniteAuraStats = {
    additionalAilmentDamagePercent: "Ailment Damage",
    additionalFireDamagePercent: "Fire Damage",
    additionalDamageOverTimePercent: "Damage Over Time",
    additionalAreaAilmentDamagePercent: "Area Ailment Damage",
  };
  // "+X% additional Ailment Damage dealt by Area Skills" (Domain Expansion, affix 183965584: attr 3604 {Area})
  // needs the Area tag on the skill that inflicts the ailment (user decision 2026-10-11). Ignite, and the
  // Trauma / Wilt layers that inherit this ledger (packages/engine/src/ailments/ailment-shared.js), are inflicted by `main`. Without the tag the line is listed in
  // `inactiveSources` with the reason; skill DoTs are not ailments and never read ailment lines.
  const igniteAuraSkillTags = { additionalAreaAilmentDamagePercent: "Area" };
  for (const [name, auraEntry] of auraEntries) {
    if (!activeNames.has(name)) continue;
    for (const [stat, label] of Object.entries(igniteAuraStats)) {
      const amount = auraEntry.effectiveEffects?.[stat];
      if (!Number.isFinite(amount) || amount === 0) continue;
      const tag = igniteAuraSkillTags[stat];
      if (tag && !inflictingTags.has(tag.toLowerCase())) {
        inactiveSources.push({
          source: "Aura: " + name + " / " + label,
          value: amount,
          category: "Additional damage",
          requiresSkillTag: tag,
          reason: `${main?.name || "the skill inflicting the ailment"} is not an ${tag} skill`,
        });
        continue;
      }
      additionalSources.push(
        entry(
          "Aura: " + name + " / " + label,
          amount,
          "Additional damage",
          "level and Aura Effect",
          tag ? { requiresSkillTag: tag } : {},
        ),
      );
    }
  }

  const nonGearBase =
    (talent.baseIgniteDamage || 0) +
    (slate.baseIgniteDamage || 0) +
    flameFocusBase.reduce((sum, item) => sum + item.value, 0);
  const baseRange = {
    min: nonGearBase + gearBaseRanges.reduce((sum, item) => sum + item.min, 0),
    max: nonGearBase + gearBaseRanges.reduce((sum, item) => sum + item.max, 0),
  };
  for (const line of extraSources.base || []) {
    baseRange.min += line.min;
    baseRange.max += line.max;
  }
  const afflictionEffectSources = [
    ...heroMemories.lines
      .filter((line) => ["afflictionEffectPercent"].includes(line.stat))
      .map((line) => entry(line.source + ": " + line.text, line.value, "Affliction effect")),
    entry("Talents", talent.afflictionEffectPercent || 0, "Affliction effect"),
    // Slate "+X% Affliction Effect" (talent batch T2: the slate parser had no key, so these were dropped).
    entry("Slates", slate.afflictionEffectPercent || 0, "Affliction effect"),
    entry("Equipment", value(gear, "afflictionEffectPercent", "increased"), "Affliction effect"),
    entry("Pacts", pact.totals.afflictionEffectPercent || 0, "Affliction effect"),
  ].filter((item) => item.value);
  // An installed Cataclysm and an item-granted one ("Main Skill is supported by Lv. N Cataclysm",
  // build-mechanics.js grantedSupports) are one support on the skill: the higher level applies.
  const grantedCataclysm = (extraSources.grantedSupports || [])
    .filter((support) => support.name === "Cataclysm")
    .sort((a, b) => b.level - a.level)[0];
  const installedCataclysm = supports.get("Cataclysm");
  const cataclysm =
    grantedCataclysm && !(installedCataclysm?.level >= grantedCataclysm.level) ? grantedCataclysm : installedCataclysm;
  const cataclysmEffect = cataclysm ? supportEffect("Cataclysm", cataclysm.level) : null;
  const additionalAfflictionEffectSources = cataclysmEffect
    ? [
        entry(
          cataclysm === grantedCataclysm
            ? `Support: Cataclysm (Lv.${cataclysm.level}, ${cataclysm.source})`
            : "Support: Cataclysm",
          cataclysmEffect.additionalAfflictionEffectPercent,
          "Additional Affliction effect",
          "supported skill only",
        ),
      ]
    : [];
  additionalAfflictionEffectSources.push(
    ...coreTalents.lines
      .filter((line) => line.stat === "additionalAfflictionEffectPercent")
      .map((line) => entry("Core talent: " + line.source, line.value, "Additional Affliction effect")),
  );
  // Gear / kismet / pact / memory "+X% additional Affliction effect" (build-mechanics.js, gear-pact batch G8).
  additionalAfflictionEffectSources.push(
    ...(extraSources.additionalAfflictionEffect || []).map((line) =>
      entry(line.source, line.value, "Additional Affliction effect", undefined, { text: line.text }),
    ),
  );
  const coreAfflictionRateSources = coreTalents.lines
    .filter((line) => line.stat === "afflictionPerSecond")
    .map((line) => entry("Core talent: " + line.source, line.value, "Affliction per second"));
  const penetrationSources = [
    entry(
      "Talents vs Ignited enemies",
      talent.firePenetrationAgainstIgnitedPercent || 0,
      "Fire penetration",
      "conditional",
    ),
    entry(
      "Slates vs Ignited enemies",
      slate.firePenetrationAgainstIgnitedPercent || 0,
      "Fire penetration",
      "conditional",
    ),
    // "+X% Fire Penetration" / "+X% Elemental and Erosion Resistance Penetration" from any source (build-mechanics.js, shared classifier).
    ...(extraSources.penetration || []).map((line) =>
      entry(line.source, line.value, "Fire penetration", "documented", { text: line.text }),
    ),
  ].filter((item) => item.value);
  // "For every +2% Ignite, Wilt, and Trauma Chance, +1% Ignite, Wilt, and Trauma Damage respectively" (Warlock [5,4],
  // talent batch chunk 3): increased Ignite damage from the raw (uncapped) Ignite chance, whole steps (provisional).
  for (const line of extraSources.chanceToDamage || []) {
    const match = String(line.text)
      .trim()
      .match(
        /^For every \+(\d+(?:\.\d+)?)% Ignite, Wilt, and Trauma Chance, \+(\d+(?:\.\d+)?)% Ignite, Wilt, and Trauma Damage respectively$/i,
      );
    const rawIgniteChance = chanceSources.reduce((sum, item) => sum + item.value, 0);
    const value = match
      ? Math.floor(Math.max(0, rawIgniteChance) / Number(match[1])) * Number(match[2]) * (line.multiplier ?? 1)
      : 0;
    if (value)
      increasedSources.push(
        entry(line.source, value, "Increased damage", `${Math.round(rawIgniteChance * 100) / 100}% Ignite chance`, {
          text: line.text,
          stat: "igniteDamagePercent",
        }),
      );
  }
  if (extraSources.fieryFantasy) {
    const rawIgniteChance = chanceSources.reduce((sum, item) => sum + item.value, 0);
    if (rawIgniteChance > 100)
      additionalSources.push(
        entry(
          "Core talent: Fiery Fantasy",
          Math.min(150, 3 * (rawIgniteChance - 100)),
          "Additional Ignite damage",
          `${Math.round(rawIgniteChance * 100) / 100}% Ignite chance`,
        ),
      );
  }
  const ledger = [
    ...coreAfflictionRateSources,
    ...baseSources,
    ...increasedSources,
    ...additionalSources,
    ...chanceSources,
    ...notIgnitedChanceSources,
    ...durationSources,
    ...limitSources,
    ...inflictedStackSources,
    ...afflictionEffectSources,
    ...additionalAfflictionEffectSources,
    ...penetrationSources,
  ];
  const increasedDurationPercent = durationSources
    .filter((item) => item.category === "Increased Ignite duration")
    .reduce((sum, item) => sum + item.value, 0);
  // SS13 operation-4 duration records are retained and reduced as separate factors.
  const additionalDurationFactor = durationSources
    .filter((item) => item.category === "Additional Ignite duration")
    .reduce((factor, item) => factor * Math.max(0, 1 + item.value / 100), 1);
  const durationSeconds = Math.max(0, 4 * Math.max(0, 1 + increasedDurationPercent / 100) * additionalDurationFactor);
  // A build-wide "Cannot inflict Ignite" (gear, kismet; residual batch) stops every application (packages/engine/src/ailments/ailment-applications.js).
  const applicationChancePercent = extraSources.igniteBlocked
    ? 0
    : Math.min(
        100,
        Math.max(
          0,
          chanceSources.reduce((sum, item) => sum + item.value, 0),
        ),
      );
  const totalAfflictionEffectPercent = afflictionEffectSources.reduce((sum, item) => sum + item.value, 0);
  const gearAfflictionFromEffect =
    value(gear, "afflictionPerSecondPerAfflictionEffectPercent", "ratio") * totalAfflictionEffectPercent;
  // A negative line (Magmaskull's "-6 Affliction Per Second for every +10% Affliction Effect") can push the summed rate
  // below zero on builds with high Affliction Effect. The build then inflicts no Affliction per second; the rate is never
  // negative (provisional: whether the game lets it drain an existing rating is open).
  const rawPassiveAfflictionPerSecond =
    (talent.afflictionPerSecond || 0) +
    (slate.afflictionPerSecond || 0) +
    value(gear, "afflictionPerSecond", "flat") +
    (pact.totals.afflictionPerSecond || 0) +
    [...auraEntries.values()].reduce((sum, item) => sum + (item.effectiveEffects.afflictionPerSecond || 0), 0) +
    gearAfflictionFromEffect +
    coreAfflictionRateSources.reduce((sum, line) => sum + line.value, 0);
  const passiveAfflictionPerSecond = Math.max(0, rawPassiveAfflictionPerSecond);
  const projectedTooltipAffliction = projectTooltipAfflictionRating(passiveAfflictionPerSecond);
  const active = (id) => conditions[id] !== false;
  const tideActive = heroId === "selena-sing-with-the-tide" && active("tideContact");
  const idyllStacks = Math.max(0, Math.min(15, combat.idyllStacks || 0));
  const fixedCombatSources = [
    tideActive &&
      entry("Tide effect", 15 * tideEffectFactor, "Additional damage", "SS13 buff 82304; stored status map"),
    tideActive &&
      active("onTheTide") &&
      active("waveAria") &&
      entry("Wave Aria", waveAriaPercent * tideEffectFactor, "Additional damage", "SS13 buff 82304; target Tide state"),
    tideActive &&
      active("idyll") &&
      entry(
        `Idyll of the Tide (${idyllStacks} stacks)`,
        idyllStacks * idyllPerStackPercent * tideEffectFactor,
        "Additional damage",
        "SS13 buff 82304; movement stacks",
      ),
    heroId === "selena-sing-with-the-tide" &&
      active("onTheTide") &&
      entry(
        "Enemy On the Tide",
        enemyOnTideDamageTakenPercent,
        "Additional damage taken",
        "SS13 target attribute 5720",
      ),
    active("entangledPain") &&
      entry("Entangled Pain", curses.entangledPainDamagePercent, "Additional damage taken", "selected skill level"),
    active("scorch") && entry("Scorch", curses.scorchDamagePercent, "Additional damage taken", "selected skill level"),
    ...(extraSources.combatAdditional || []).map((line) =>
      entry(line.source, line.value, "Additional damage", line.condition, { text: line.text }),
    ),
    ...(extraSources.combatTaken || []).map((line) =>
      entry(line.source, line.value, "Additional damage taken", line.condition, { text: line.text }),
    ),
  ].filter(Boolean);
  const aimAverage = active("aim") ? ((combat.aimDamagePercent ?? 38.5) * combat.aimUptimePercent) / 100 : 0;
  const reapingSources = collectReapingSources(equipment, pactState, applicationChancePercent);
  const reapingGearSources = (stat, label) => {
    const pattern = new RegExp(`^\\+([\\d.]+)% ${label}$`, "i");
    const listed = equipment.candidateItems.flatMap((item) =>
      effectiveGearModifierTexts(item)
        .map((text) => {
          const match = normalizePercentageText(text).match(pattern);
          return match ? entry(`${item.name}: ${text}`, Number(match[1]), label) : null;
        })
        .filter(Boolean),
    );
    const total = value(gear, stat, "increased");
    return Math.abs(listed.reduce((sum, item) => sum + item.value, 0) - total) < 0.001
      ? listed
      : total
        ? [entry("Equipped gear", total, label)]
        : [];
  };
  const reapingRecoverySources = [
    ...blessingRecoverySources(equipment, blessings).map((line) =>
      entry(
        `${line.source}: ${line.perStack}% × ${line.stacks} Blessing stacks (cap ${line.cap})`,
        line.value,
        "Reaping Recovery Speed",
      ),
    ),
    ...heroMemories.lines
      .filter((line) => ["reapingRecoverySpeedPercent"].includes(line.stat))
      .map((line) => entry(line.source + ": " + line.text, line.value, "Reaping Recovery Speed")),
    ...reapingGearSources("reapingRecoverySpeedPercent", "Reaping Recovery Speed"),
    entry("Pacts", pact.totals.reapingRecoverySpeedPercent || 0, "Reaping Recovery Speed"),
    // Talent and slate "+X% Reaping Recovery Speed" write the same attribute (6009 mod 3) as the gear line.
    entry("Talents", talent.reapingRecoverySpeedPercent || 0, "Reaping Recovery Speed"),
    entry("Divinity Slates", slate.reapingRecoverySpeedPercent || 0, "Reaping Recovery Speed"),
  ].filter((item) => item.value);
  // "+X% additional Reaping Recovery Speed" (affix 4110, 6009 mod 4) multiplies; reaping-model.js does the same.
  const reapingAdditionalRecoverySources = [
    entry(
      "Pacts: additional Reaping Recovery Speed (multiplies)",
      pact.totals.additionalReapingRecoverySpeedPercent || 0,
      "Additional Reaping Recovery Speed",
    ),
  ].filter((item) => item.value);
  const reapingRecoverySpeedPercent = reapingRecoverySources.reduce((sum, item) => sum + item.value, 0);
  const reapingAdditionalRecoverySpeedPercents = reapingAdditionalRecoverySources.map((item) => item.value);
  ledger.push(...reapingAdditionalRecoverySources);
  // "−X% All Resistance when the enemy has max Affliction" (affix 371197; game: enemy-side 5101–5103/5401
  // mod 1 while the enemy has state 4000900). Applied to the dummy's Fire Resistance only for the share of
  // time the dummy sits at 100 Affliction (max-affliction-resistance.js): the reduction
  // changes target resistance before penetration; negative resistance is allowed there.
  const maxAfflictionReductionSources =
    coreTalents.fixesFireResistance || coreTalents.fixedFireResistancePercent != null
      ? []
      : [
          entry("Talents", talent.enemyAllResistanceAtMaxAfflictionPercent || 0, "Resistance at max Affliction"),
          entry("Divinity Slates", slate.enemyAllResistanceAtMaxAfflictionPercent || 0, "Resistance at max Affliction"),
        ].filter((item) => item.value);
  const maxAfflictionReductionPercent = maxAfflictionReductionSources.reduce((sum, item) => sum + item.value, 0);
  const afflictionRemovers = reapingSources
    .filter((source) => source.trigger === "full Affliction" && source.afflictionRemovedPercent > 0)
    .map((source) => ({
      source: source.source,
      afflictionRemovedPercent: source.afflictionRemovedPercent,
      recoverySeconds:
        source.baseRecoverySeconds /
        ((1 + reapingRecoverySpeedPercent / 100) *
          reapingAdditionalRecoverySpeedPercents.reduce((factor, value) => factor * (1 + value / 100), 1)),
    }));
  // The reduction is a flat 5101 write, so Sun's Embrace's multiplier (combat.ignitedFireResistance, packages/engine/src/ailments/ignited-fire-resistance.js)
  // scales it with the rest of the flat sum: the applied change is the multiplied sum's change.
  const maxAffliction =
    maxAfflictionReductionPercent && active("affliction")
      ? {
          ...maxAfflictionUptime({ afflictionPerSecond: passiveAfflictionPerSecond, removers: afflictionRemovers }),
          reductionPercent: combat.ignitedFireResistance?.applies
            ? combat.ignitedFireResistance.dotFlatChange(maxAfflictionReductionPercent)
            : maxAfflictionReductionPercent,
          resistancePercent: combat.targetFireResistancePercent,
          penetrationPercent: penetrationSources.reduce((sum, item) => sum + item.value, 0),
          sources: maxAfflictionReductionSources,
        }
      : null;
  // Resistance whose factor equals the time-weighted factor (exact even if a factor clamps at 0).
  const resistanceAtMaxAfflictionShare = (fraction) => {
    if (!maxAffliction || !(fraction > 0)) return combat.targetFireResistancePercent;
    const factor = averagedResistanceFactor({
      resistancePercent: maxAffliction.resistancePercent,
      penetrationPercent: maxAffliction.penetrationPercent,
      reductionPercent: maxAffliction.reductionPercent,
      fraction,
    });
    return maxAffliction.penetrationPercent + 100 * (1 - factor);
  };
  const steadyMaxAfflictionFraction = maxAffliction ? windowMaxAfflictionFraction(maxAffliction, 0) : 0;
  const combatLedger = [...fixedCombatSources];
  if (aimAverage)
    combatLedger.push(
      entry(
        `Aim Ailment Damage (${combat.aimUptimeLabel || `${combat.aimUptimePercent}% uptime`})`,
        aimAverage,
        "Additional damage",
        "Aim with linked support effects",
      ),
    );
  if (active("affliction"))
    combatLedger.push(
      entry(
        combat.afflictionDerivation ? `Affliction average — ${combat.afflictionDerivation}` : "Affliction average",
        combat.afflictionAverage,
        "Affliction rating",
        combat.afflictionDerivation ? "derived" : "configured",
      ),
    );
  combatLedger.push(entry("Target Fire Resistance", combat.targetFireResistancePercent, "Resistance", "configured"));
  if (maxAffliction) {
    const percent = (fraction) => `${Math.round(fraction * 1000) / 10}%`;
    const timing = `while dummy at max Affliction, from ${Math.round(maxAffliction.firstMaxSeconds * 100) / 100} s; at max ${percent(steadyMaxAfflictionFraction)} of steady state, ${percent(windowMaxAfflictionFraction(maxAffliction, 5))} of 5 s, ${percent(windowMaxAfflictionFraction(maxAffliction, 20))} of 20 s`;
    combatLedger.push(
      entry(
        `Target Fire Resistance with the max-Affliction share (steady state)`,
        Math.round(resistanceAtMaxAfflictionShare(steadyMaxAfflictionFraction) * 10000) / 10000,
        "Time-weighted resistance",
        "configured + max-Affliction share",
      ),
    );
    combatLedger.push(
      ...maxAfflictionReductionSources.map((item) =>
        entry(
          `${item.source}: ${item.value}% All Resistance ${timing}`,
          item.value,
          "Resistance at max Affliction",
          maxAffliction.limitingRemover
            ? `Affliction refills in ${Math.round(maxAffliction.limitingRemover.fillSeconds * 1000) / 1000} s per ${maxAffliction.limitingRemover.source} Reap every ${Math.round(maxAffliction.limitingRemover.intervalSeconds * 1000) / 1000} s`
            : "Affliction stays at max once reached",
        ),
      ),
    );
  }
  // The reduction is listed in the Ignite ledger rows too (the combat ledger feeds only fixed UI steps).
  ledger.push(...combatLedger.filter((item) => item.category === "Resistance at max Affliction"));
  combatLedger.push(...penetrationSources);
  const warnings = [];
  for (const text of unmodeledBaseIgnite)
    warnings.push(`${text} — Base Ignite is not included; choose numeric rolls or resolve the condition.`);
  if (equipment.unrecognized.length)
    warnings.push(
      `${equipment.unrecognized.length} equipped modifier line(s) are not translated into the theoretical calculation.`,
    );
  warnings.push(
    "Aura base effects use selected skill-level records; Aura Amplification and equipped Aura Effect are recalculated from selected sources.",
  );
  if (rawPassiveAfflictionPerSecond < 0)
    warnings.push(
      `Affliction per second sums to ${Math.round(rawPassiveAfflictionPerSecond * 100) / 100} (a negative line such as "Affliction Per Second for every +X% Affliction Effect"); the build inflicts no Affliction per second (provisional floor at 0).`,
    );
  return {
    // The character panel's Ignite tooltip: its pooled factors and the Affliction the passive rate projects there.
    townTooltip: {
      factors: {
        increasedDamagePercent: round(increasedSources.reduce((sum, item) => sum + item.value, 0)),
        additionalDamage: round(additionalSources.reduce((factor, item) => factor * (1 + item.value / 100), 1)),
        additionalAfflictionEffect: round(
          additionalAfflictionEffectSources.reduce((factor, item) => factor * (1 + item.value / 100), 1),
        ),
      },
      passiveAfflictionPerSecond,
      projectedAfflictionRating: projectedTooltipAffliction,
    },
    combat: {
      maxAffliction,
      afflictionRemovers,
      ledger: combatLedger,
    },
    ledger,
    inactiveSources,
    totals: {
      baseIgniteDamage: baseRange,
      increasedDamagePercent: increasedSources.reduce((sum, item) => sum + item.value, 0),
      additionalInflictedStacks: Math.max(0, flatAdditionalStacks),
      applicationChancePercent,
      igniteDurationSeconds: durationSeconds,
    },
    warnings,
  };
}
