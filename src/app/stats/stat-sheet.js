import {
  blessingRecoverySources,
  characterStatTotals,
  collectNormalizedGearModifiers,
  curseSlotSummary,
  effectiveHpModel,
  level85DummyDefenses,
} from "#engine";
import { hasActiveReaping } from "./damage-path-views.js";
const number = (value) => (Number.isFinite(value) ? value : null);

// What the Stats page's stat sheet shows (apps/web/src/features/stats, through src/app/bridge/stats-view-model.ts): the
// picked skill's mechanic cards, its damage figures, the defence cards, the stat totals and the Effective HP model.

export function statSheetSkillOptions(planner) {
  return planner.activation.setups.filter(
    (setup) => setup.enabled && !["aura", "passive", "support"].includes(setup.role),
  );
}

const sustainedModeledDps = ({ hitDps, dotDps, reapingDps }) => hitDps + dotDps + reapingDps;

export function statSheetModel(planner, selectedKey) {
  const options = statSheetSkillOptions(planner);
  // Without a saved choice, open on the skill that deals the build's modeled damage (not simply the first setup).
  const modeledNames = new Set(
    (planner.damageSources || []).filter((source) => source.status === "modeled").map((source) => source.name),
  );
  const skill =
    options.find((setup) => setup.setupKey === selectedKey || setup.name === selectedKey) ||
    options.find((setup) => modeledNames.has(setup.name)) ||
    options[0];
  const active = Boolean(skill && planner.activation.activeNames.has(skill.name));
  // A main skill whose own damage over time is modeled (packages/engine/src/skills/skill-dot-model.js, e.g. Wilting Beam).
  const skillDot = active
    ? (planner.skillDots || []).find((dot) => dot.setupKey === skill?.setupKey && dot.modeled) || null
    : null;
  // A skill whose hits the generic spell-hit engine models (packages/engine/src/skills/skill-hit-model.js, e.g. Fire Burst).
  const skillHit = active
    ? (planner.skillHits || []).find((hit) => hit.setupKey === skill?.setupKey && hit.modeled) || null
    : null;
  // A Minion skill (packages/engine/src/minions/minion-damage-model.js, e.g. a Module's Overstrike): the Minion that the setup activates.
  const minion = active
    ? (planner.minions || []).find((item) => item.modeled && item.setupKeys.includes(skill?.setupKey)) || null
    : null;
  // The build's damage paths (every modeled hit, DoT, Reaping source and Minion) back the stat sheet's figures when the
  // picked skill is one the planner models.
  const paths = skillDot || skillHit || minion ? planner.damagePaths : null;
  const stats = skill?.databaseLevel20 || {};
  const cards = [];
  // `tab` places the card in the Character stats panel (src/app/stats/stat-sheet-panel.js): offense (default),
  // dot, utility, target, skill (merged into the Skill section) or weapon (merged into Weapon).
  const card = (title, rows, tab = "offense") => {
    const valid = rows.filter((row) => row.value !== null && row.value !== undefined);
    if (valid.length) cards.push({ title, rows: valid, tab });
  };
  if (planner.firesAllure?.active)
    card(
      "Fire's Allure · Scorch",
      [
        { label: "Ailment inflicted", value: "Scorch instead of Ignite" },
        { label: "Active Scorch stacks · resistance assumption", value: planner.firesAllure.activeStacks },
        { label: "Stack uptime", value: planner.firesAllure.stackAssumption },
        { label: "Enemy within 10m", value: planner.firesAllure.nearby, indicator: true },
        {
          label: "Enemy Fire Resistance reduction",
          value: -planner.firesAllure.resistanceReductionPercent,
          suffix: "%",
        },
        {
          label: "Effective target Fire Resistance",
          value: planner.firesAllure.effectiveResistancePercent,
          suffix: "%",
        },
        { label: "Negative Ignite Duration modifiers", value: "Applied · immunity contradicted by on/off test" },
        { label: "Duration assumption · pending test", value: planner.firesAllure.durationAssumption },
      ],
      "dot",
    );
  for (const item of planner.equipment?.candidateItems || []) {
    const base = collectNormalizedGearModifiers([item]).filter((modifier) => modifier.type === "base");
    if (base.length)
      card(
        `${item.name} · ${item.slot}`,
        base.map((modifier) => ({
          label:
            modifier.stat === "weaponAttackSpeed"
              ? "Base attack speed · attacks/s"
              : "Base weapon Critical Strike Rating",
          value: modifier.value,
        })),
        "weapon",
      );
  }
  if (minion) {
    card(
      `${minion.name} · Minion Lv.${minion.level}`,
      [
        { label: "Minion Base Damage", value: minion.baseDamage },
        { label: "Minions summoned", value: minion.count },
        { label: "Minion crit chance", value: number(minion.crit.chancePercent), suffix: "%" },
        { label: "Minion crit damage", value: number(minion.crit.damagePercent), suffix: "%" },
        ...minion.skills.map((item) => ({
          label: `${item.name} · ${item.role} · ${item.converted ? `${item.baseType} → ` : ""}${item.type}`,
          value: `${item.percent}% × ${minion.baseDamage} = ${Math.round(item.base)} → ${Math.round(item.perHitNoBuff)} to the dummy${item.perHitBuffed ? ` (${Math.round(item.perHitBuffed)} buffed)` : ""} · ${Math.round(item.steadyDps)} DPS`,
        })),
        { label: "Minion DPS to the dummy (steady)", value: Math.round(minion.combat.dps) },
        { label: "Town panel", value: "0 (the panel reads 0 for summon skills)" },
      ],
      "skill",
    );
  }
  if (skillDot || skillHit) {
    if (skillHit) {
      const primary = skillHit.primary;
      card("Use rate", [
        { label: "Uses per second", value: number(skillHit.rate.usesPerSecond) },
        {
          label: `Use time · ${skillHit.rate.speedType}`,
          value: `${skillHit.rate.useTimeSeconds} s → ${Math.round((skillHit.rate.effectiveUseTimeSeconds || 0) * 1000) / 1000} s`,
        },
        ...(skillHit.rate.cooldownSeconds > 0
          ? [{ label: "Cooldown", value: skillHit.rate.effectiveCooldownSeconds, suffix: "s" }]
          : []),
        { label: `Hits per use · ${skillHit.rate.hitsPerUseBasis}`, value: skillHit.rate.hitsPerUse },
      ]);
      card("Critical strikes", [
        { label: "Crit chance", value: number(skillHit.crit.chancePercent), suffix: "%" },
        { label: "Crit multiplier", value: number(skillHit.crit.combatDamagePercent), suffix: "%" },
        { label: "Expected crit factor", value: number(skillHit.crit.factor) },
      ]);
      if (primary)
        card(`${primary.type} hit · Lv.${skillHit.level}`, [
          { label: "Base roll", value: `${primary.base.min}–${primary.base.max}` },
          {
            label: `Added ${primary.type} (× ${skillHit.effectiveness ?? 100}% effectiveness)`,
            value: `${Math.round(primary.added.min)}–${Math.round(primary.added.max)}`,
          },
          { label: "Increased damage", value: `×${Math.round(primary.increasedFactor * 1000) / 1000}` },
          { label: "Additional damage", value: `×${Math.round(primary.additionalFactor * 1000) / 1000}` },
          { label: "Damage per use to the dummy", value: Math.round(skillHit.combat.perUse) },
          { label: "Town panel DPS (hypothesis, no crit)", value: Math.round(skillHit.town.dpsNoCrit) },
          { label: "Town DPS with crit expectation", value: Math.round(skillHit.town.dps) },
          { label: "Hit DPS to the dummy", value: Math.round(skillHit.combat.dps) },
        ]);
    }
    if (skillDot)
      card("Use rate", [
        { label: "Uses per second", value: number(skillDot.applicationsPerSecond) },
        { label: `${skillDot.name} damage per second · Lv.${skillDot.level}`, value: skillDot.base.max },
        { label: "Status duration", value: skillDot.durationSeconds, suffix: "s" },
      ]);
    if (paths) {
      card(
        "Damage paths · 20-second average",
        [
          ...(paths.twentySeconds.hits || []).map((hit) => ({ label: hit.name, value: hit.dps })),
          ...paths.twentySeconds.dots.map((dot) => ({ label: dot.name, value: dot.dps })),
          ...paths.twentySeconds.reaping.sources.map((source) => ({
            label: `Reaping · ${source.source}`,
            value: source.reapingDps,
          })),
          { label: "Total", value: paths.twentySeconds.totalDps },
        ],
        "offense",
      ); // The build's damage breakdown, hits included: Offense for every build (2026-10-14).
      for (const ailment of Object.values(planner.ailments || {}).filter((item) => item.modeled))
        card(
          `${ailment.name} · ${ailment.damageType} damage over time`,
          [
            { label: "Base damage", value: `${ailment.base.min}–${ailment.base.max}` },
            { label: "Application chance", value: number(ailment.chancePercent), suffix: "%" },
            { label: "Duration", value: number(ailment.durationSeconds), suffix: "s" },
            { label: "Applications per second", value: number(ailment.applicationsPerSecond) },
            // Which skills apply it (packages/engine/src/ailments/ailment-applications.js): rate × chance, share of successes, own layers vs the main skill's.
            ...(ailment.appliers || [])
              .filter((applier) => applier.applicationsPerSecond > 0 || applier.blocked)
              .map((applier) => ({
                label: `Applied by · ${applier.name}`,
                value: applier.blocked
                  ? `cannot inflict ${ailment.name} (${applier.blocked.source})`
                  : `${Math.round(applier.applicationsPerSecond * 1000) / 1000}/s × ${Math.round(applier.chancePercent * 100) / 100}% → ${Math.round(applier.share * 1000) / 10}% of applications${Math.abs(applier.scale - 1) > 1e-9 ? ` · ×${Math.round(applier.scale * 1000) / 1000} own skill layers` : ""}`,
              })),
            {
              label: "Panel-style DPS (no target, no recent crits)",
              value: `${Math.round(ailment.town.minimumDps).toLocaleString("en-US")}–${Math.round(ailment.town.maximumDps).toLocaleString("en-US")}`,
            },
            {
              label: 'Crit-only multiplier · "dealt by Critical Strikes"',
              value: number(ailment.combat.critOnlyFactor),
            },
            ...ailment.combat.recentCritStacks.map((line) => ({
              label: `${line.source} · expected recent crits`,
              value: `${line.stacks.toFixed(2)} stacks · ×${line.factor.toFixed(3)}`,
            })),
            { label: "Strongest-application DPS · steady", value: ailment.combat.steadyDps },
            { label: "Average DPS · first 5 s", value: ailment.combat.fiveSecondAverageDps },
            { label: "Average DPS · first 20 s", value: ailment.combat.twentySecondAverageDps },
          ],
          "dot",
        );
      const multi = paths.twentySeconds.reaping;
      if (hasActiveReaping(planner))
        card(
          "Reaping · all damage over time",
          [
            { label: "Reaping Duration bonus", value: multi.durationPercent, suffix: "%" },
            { label: "Recent Reaping stacks bonus", value: multi.recentReapPercent, suffix: "%" },
            { label: "Reaping Recovery Speed", value: multi.recoveryPercent, suffix: "%" },
            { label: "Additional Recovery Speed factor", value: number(multi.additionalRecoveryFactor) },
            { label: "Additional duration · damaging ailment types", value: number(multi.additionalDurationFactor) },
            ...multi.sources.flatMap((source) => [
              { label: `${source.source} · trigger`, value: source.trigger },
              {
                label: `${source.source} · between Reaps`,
                value: Number.isFinite(source.intervalSeconds)
                  ? `${source.intervalSeconds.toFixed(3)}s`
                  : "Not triggered",
              },
              {
                label: `${source.source} · reaped`,
                value: source.perDot.map((item) => `${item.name} ${item.seconds.toFixed(2)}s`).join(", ") || "—",
              },
              { label: `${source.source} · DPS (20 s)`, value: source.reapingDps },
            ]),
          ],
          "dot",
        );
    }
  } else if (skill) {
    card(
      "Skill effects",
      [
        { label: "Mana cost", value: number(stats.manaCost ?? skill.observed?.manaCost) },
        { label: "Cooldown", value: number(stats.cooldownSeconds), suffix: "s" },
        { label: "Duration", value: number(stats.durationSeconds), suffix: "s" },
        {
          label: "Movement speed",
          value: number(stats.movementSpeedPercent ?? skill.observed?.movementSpeedPercent),
          suffix: "%",
        },
      ],
      "skill",
    );
  }
  card(
    "Active aura buffs",
    (planner.aura?.entries || []).flatMap((aura) =>
      Object.entries(aura.effectiveEffects).map(([stat, value]) => ({
        label:
          aura.name +
          " · Lv " +
          aura.effectiveLevel +
          " · " +
          stat.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/ Percent$/, ""),
        value,
        suffix: stat.endsWith("Percent") ? "%" : null,
      })),
    ),
  );
  if (planner.conditions?.idyll)
    card("Damage assumptions", [{ label: "Idyll of the Tide", value: "15 stacks · best case" }], "target");
  if (planner.murmursTideEffectPercent)
    card("Murmurs of the Distant Tide", [
      { label: "Additional Tide Effect", value: planner.murmursTideEffectPercent, suffix: "%" },
      { label: "Duration reduction", value: "Ignored · Bard state assumed" },
    ]);
  if (planner.seaFoamNocturne?.selected)
    card("Sea Foam Nocturne", [
      { label: "Extra max Channeled Stacks", value: planner.state.combat.extraMaxChanneledStacks },
      { label: "Extra min/initial Channeled Stacks", value: planner.state.combat.extraInitialChanneledStacks },
      { label: "Qualifying extra max + min stacks · cap 5", value: planner.seaFoamNocturne.stacks },
      { label: "Tide Effect per qualifying stack", value: planner.seaFoamNocturne.perStackPercent, suffix: "%" },
      { label: "Additional Tide Effect", value: planner.seaFoamNocturne.tideEffectPercent, suffix: "%" },
      {
        label: "Applied to Tide damage",
        value: planner.seaFoamNocturne.applied
          ? "Yes · Tide Contact"
          : "No · Tide Contact inactive or zero extra stacks",
      },
    ]);
  if (planner.heroMemories?.ceaselessTide)
    card("Ceaseless Tide", [
      { label: "Additional Tide Effect", value: 80, suffix: "%" },
      { label: "Loud Song cast speed", value: "×0.8" },
      { label: "Assumed state", value: "Bard and Loud Song" },
    ]);
  card(
    "Blur",
    [
      {
        label: "Source in build",
        value: Boolean(planner.blurSources?.some((source) => source.available)),
        indicator: true,
      },
      { label: "Applied to calculation", value: planner.conditions?.blur ? "Yes · conditional uptime assumed" : "No" },
      ...(planner.blurSources || []).map((source) => ({
        label: source.source + " · " + source.text,
        value: source.available ? source.trigger : source.reason,
      })),
    ],
    "utility",
  );
  card("Core talents", [
    ...(planner.coreTalents?.lines || []).map((line) => ({
      label: line.source + " · " + line.condition,
      value: line.stat === "afflictionPerSecond" ? "+" + line.value + " Affliction/s" : "+" + line.value + "%",
    })),
    ...(planner.coreTalents?.fixesFireResistance
      ? [{ label: "Fueling · nearby enemy assumed", value: "Fire Resistance fixed at 0%" }]
      : []),
  ]);
  card(
    "Hero memories",
    [
      ...(planner.heroMemories?.lines || []).map((line) => ({
        label: line.source + " · " + line.text,
        value:
          ["strength", "dexterity", "movementspeed"].includes(line.stat) ||
          (line.stat.startsWith("max") && line.stat.endsWith("resistance"))
            ? "Counted in stats"
            : "In calc",
      })),
      ...(planner.heroMemories?.unsupported || []).map((line) => ({
        label: line.source + " · " + line.text,
        value: "Not modeled",
      })),
    ],
    "utility",
  );
  card("Slate attributes", [
    { label: "Dexterity", value: planner.talentSlate?.candidateSlate?.dexterity || 0 },
    { label: "Attack Speed bonus", value: planner.talentSlate?.candidateSlate?.attackSpeedPercent || 0, suffix: "%" },
    { label: "Attack Skill Cost adjustment", value: planner.talentSlate?.candidateSlate?.attackSkillCostFlat || 0 },
    {
      label: "Daze · Crowd Control Effect while Blur active",
      value: planner.blurEffects?.crowdControlEffectPercent || 0,
      suffix: "%",
    },
  ]);
  card(
    "Skill setup",
    [
      { label: "Effective level", value: number(skill?.effectiveLevel) },
      { label: "Enabled supports", value: skill ? skill.supports.filter((support) => support.enabled).length : null },
      { label: "Energy cost", value: number(skill?.energyCost) },
    ],
    "skill",
  );
  if (planner.aim?.active)
    card("Aim", [
      { label: "Base damage bonus", value: planner.aim.baseDamagePercent, suffix: "%" },
      ...planner.aim.sources.map((source) => ({ label: source.source, value: source.value, suffix: "% effect" })),
      { label: "Damage bonus with supports", value: planner.aim.damagePercent, suffix: "%" },
      { label: "Average damage bonus", value: planner.aim.averageDamagePercent, suffix: "%" },
      { label: "Supported duration", value: planner.aim.durationSeconds, suffix: "s" },
      ...(Number.isFinite(planner.aim.maxCharges)
        ? [
            {
              label:
                "Max Charges" +
                (planner.aim.chargesSource === "manual" ? " · manual override " + planner.aim.charges : ""),
              value: planner.aim.maxCharges,
            },
          ]
        : []),
      ...(planner.aim.uptimeLabel
        ? [{ label: planner.aim.uptimeLabel, value: planner.aim.uptimePercent, suffix: "%" }]
        : []),
    ]);
  for (const blessing of planner.blessings?.entries || [])
    card(`${blessing.name} Blessing`, [
      { label: "Base maximum stacks", value: blessing.baseMax },
      ...blessing.capSources.map((source) => ({ label: source.source + " · " + source.text, value: source.value })),
      { label: "Maximum stacks", value: blessing.maxStacks },
      {
        label: `Stacks in calc · ${blessing.stacksSetByUser ? "set in Composition" : blessing.gainSources.length ? "max: the build has a gain source" : "no gain source"}`,
        value: blessing.stacks,
      },
      ...blessing.gainSources.map((source) => ({
        label: source.source + " · " + source.text,
        value: source.condition,
      })),
      ...blessing.unsupported.map((source) => ({ label: source.source + " · " + source.text, value: "Not modeled" })),
    ]);
  const ehp = effectiveHpModel(planner);
  const defense = [
    {
      title: "Target · level 85 dummy · confirmed",
      tab: "target",
      rows: [
        { label: "Physical armour reduction", value: level85DummyDefenses.armourPercent, suffix: "%" },
        { label: "Non-physical armour reduction", value: level85DummyDefenses.nonPhysicalArmourPercent, suffix: "%" },
        { label: "Armour reduction against DoT", value: level85DummyDefenses.damageOverTimeArmourPercent, suffix: "%" },
        ...["Fire", "Cold", "Lightning", "Erosion"].map((element) => ({
          label: element + " resistance · base",
          value: level85DummyDefenses[element.toLowerCase() + "ResistancePercent"],
          suffix: "%",
        })),
        {
          label: "Fire resistance · effective target setting",
          value: planner.effectiveTargetFireResistancePercent ?? planner.state.combat.targetFireResistancePercent,
          suffix: "%",
        },
      ],
    },
    // Pools from the Effective HP model (base by assumed level + every recognized line) rather than the
    // Selena captured baseline, which read 0 Energy Shield for other builds.
    {
      title: "Life & resources",
      rows: [
        { label: `Max Life · level ${ehp.characterLevel} assumed`, value: Math.round(ehp.pools.life.value) },
        { label: "Life after sealing", value: Math.round(ehp.pools.usableLife) },
        { label: "Max Energy Shield", value: Math.round(ehp.pools.energyShield.value) },
        { label: `Max Mana · level ${ehp.characterLevel} assumed`, value: Math.round(ehp.pools.mana.value) },
        {
          label: "Energy allocated",
          value: `${planner.activation.allocation.knownAllocated}/${planner.activation.energy.available}`,
        },
      ],
    },
    {
      title: "Resistances",
      rows: (planner.resistances?.entries || []).flatMap((entry) => [
        { label: entry.element + " · effective", value: entry.effective, suffix: "%" },
        { label: entry.element + " · uncapped total", value: entry.total, suffix: "%" },
        { label: entry.element + " · maximum", value: entry.maximum, suffix: "%" },
      ]),
    },
  ];
  if (planner.resistances)
    defense.push({
      title: "Resistance sources",
      rows: [
        ...planner.resistances.sources.map((line) => ({
          label: line.source + " · " + line.text,
          value: line.value,
          suffix: "%",
        })),
        ...planner.resistances.unsupported.map((line) => ({
          label: line.source + " · " + line.text,
          value: "Not modeled",
        })),
      ],
    });
  defense.push({
    title: "Gear attributes and immunity",
    rows: [
      { label: "Dexterity from gear", value: planner.equipment?.candidate?.["dexterity:flat"] || 0 },
      {
        label: "Immune to Frostbite",
        value: Boolean(planner.equipment?.candidate?.["frostbiteImmunity:flag"]),
        indicator: true,
      },
      {
        label: "Chance to avoid Elemental Ailments · gear",
        value: Math.min(100, planner.equipment?.candidate?.["elementalAilmentAvoidancePercent:increased"] || 0),
        suffix: "%",
      },
    ],
  });
  const injuryBuffer =
    planner.lowResources?.injuryBufferPercent ??
    Math.min(80, Math.max(0, planner.equipment?.candidate?.["injuryBufferPercent:increased"] || 0));
  defense.push({
    title: "Injury Buffer",
    rows: [
      { label: "Hit damage delayed", value: injuryBuffer, suffix: "%" },
      { label: "Hit damage deducted immediately", value: 100 - injuryBuffer, suffix: "%" },
      { label: "Delayed deduction duration", value: "4s · total damage unchanged" },
    ],
  });
  if (planner.lowResources)
    defense.push({
      title: "Low Life / Low Mana",
      rows: [
        { label: "Life available after sealing", value: planner.lowResources.lifePercent, suffix: "% of Max Life" },
        { label: "Low Life · below 35%", value: planner.lowResources.lowLife, indicator: true },
        { label: "Mana available after sealing", value: planner.lowResources.manaPercent, suffix: "% of Max Mana" },
        { label: "Low Mana · below 35%", value: planner.lowResources.lowMana, indicator: true },
        {
          label: "Conditional damage taken multiplier",
          value: "×" + planner.lowResources.damageTakenFactor.toFixed(4),
        },
        ...planner.lowResources.sources.map((line) => ({
          label: line.source + " · " + line.text,
          value: line.active ? "In calc" : "Inactive",
        })),
        ...planner.lowResources.unsupported.map((line) => ({
          label: line.source + " · " + line.text,
          value: "Not modeled",
        })),
      ],
    });
  if (planner.blurEffects)
    defense.push({
      title: "Blur effects",
      rows: [
        { label: "Blur Rating · best case", value: planner.blurEffects.rating },
        { label: "Blur Effect bonus", value: planner.blurEffects.effectPercent, suffix: "%" },
        { label: "Blur Rating gained per second", value: planner.blurEffects.ratingGainPerSecond },
        { label: "Blur Rating lost per second", value: planner.blurEffects.ratingDecayPerSecond },
        { label: "Net Rating change while Blur active", value: planner.blurEffects.netRatingPerSecond, suffix: "/s" },
        { label: "Chance to avoid damage from Blur", value: planner.blurEffects.avoidancePercent, suffix: "%" },
        { label: "Stealth Stab damage taken", value: "×" + planner.blurEffects.damageTakenFactor },
        ...planner.blurEffects.damageSources.map((line) => ({ label: line.source, value: line.value, suffix: "%" })),
        ...planner.blurEffects.movementSources.map((line) => ({
          label: line.source + " · Movement Speed",
          value: line.value,
          suffix: "%",
        })),
        {
          label: "Refresh on gaining Blur",
          value: planner.blurEffects.refresh ? "1s interval · upkeep not simulated" : "None",
        },
      ],
    });
  const blessingRecovery = blessingRecoverySources(planner.equipment, planner.blessings);
  if (blessingRecovery.length)
    defense.push({
      title: "Blessing gear bonuses",
      tab: "dot",
      rows: blessingRecovery.flatMap((line) => [
        { label: line.source + " · available Blessing stacks", value: line.totalStacks },
        { label: "Stacks counted / affix cap", value: `${line.stacks}/${line.cap}` },
        { label: "Reaping Recovery Speed", value: line.value, suffix: "%" },
      ]),
    });
  if (planner.curseLimit)
    defense.push({
      title: "Curse limit",
      tab: "offense",
      rows: [
        { label: "Maximum active curses", value: planner.curseLimit.maximum },
        // Slot order (user-confirmed 2026-10-19): skill bar curses in bar order, then gear, then pacts and other triggers.
        {
          label: "Applied curses (slot order)",
          value:
            curseSlotSummary(planner)
              .applied.map((curse) => (curse.kind === "skill" ? curse.name : `${curse.name} (${curse.source})`))
              .join(", ") || "None",
        },
        ...planner.curseLimit.sources.map((source) => ({
          label: source.source + " · " + source.text,
          value: "+" + source.value,
        })),
        ...curseSlotSummary(planner).leftOut.map((curse) => ({
          label: curse.kind === "skill" ? curse.name : `${curse.name} (${curse.source})`,
          value: "Not applied · curse limit",
        })),
      ],
    });
  if (planner.pact)
    defense.push({
      title: "Pactspirit defenses",
      rows: [
        { label: "Elemental Resistance", value: planner.pact.totals.elementalResistancePercent, suffix: "%" },
        { label: "Chance to avoid damage", value: planner.pact.totals.damageAvoidanceChancePercent, suffix: "%" },
        { label: "General damage mitigation", value: (1 - planner.pact.generalDamageTakenFactor) * 100, suffix: "%" },
        {
          label: "Physical mitigation · exactly one nearby enemy",
          value: (1 - planner.pact.singleEnemyPhysicalDamageTakenFactor) * 100,
          suffix: "%",
        },
      ],
    });
  if (planner.blessings)
    defense.push({
      title: "Tenacity Blessing",
      rows: [
        { label: "Additional damage mitigation", value: planner.blessings.tenacityMitigationPercent, suffix: "%" },
      ],
    });
  if (planner.block)
    defense.push({
      title: "Block · hits and reflected damage",
      rows: [
        { label: "Attack Block Chance", value: planner.block.attackChance, suffix: "%" },
        { label: "Spell Block Chance", value: planner.block.spellChance, suffix: "%" },
        { label: "Block Ratio", value: planner.block.ratio, suffix: "%" },
        { label: "Block Ratio cap", value: planner.block.ratioCap, suffix: "%" },
        { label: "Mitigation on successful block", value: planner.block.blockedHitMitigationPercent, suffix: "%" },
        { label: "Average Attack hit mitigation", value: planner.block.averageAttackMitigationPercent, suffix: "%" },
        { label: "Average Spell hit mitigation", value: planner.block.averageSpellMitigationPercent, suffix: "%" },
        ...planner.block.sources.map((line) => ({ label: line.source + " · " + line.text, value: "In calc" })),
        ...(planner.block.conditionalSources || []).map((line) => ({
          label: line.source + " · " + line.text,
          value: "Effective HP (Aegis of Fire active)",
        })),
        ...planner.block.unsupported.map((line) => ({ label: line.source + " · " + line.text, value: "Not modeled" })),
      ],
    });
  if (planner.barrierSources?.length)
    defense.push({
      title: "Barrier source",
      rows: planner.barrierSources.map((source) => ({ label: source.source, value: source.trigger })),
    });
  // Defense-side cards default to the Defense tab of the Character stats panel.
  for (const entry of defense) entry.tab ??= "defense";
  // Every summed stat line, damage or not (packages/engine/src/character-stats.js); rows are built at render time. The Legendary base-item
  // defence lines (packages/engine/src/gear/legendary-base-lines.js) are listed with the Effective HP pools they feed.
  const statTotals = characterStatTotals(planner, { legendaryBaseLines: true });
  return {
    options,
    skill,
    active,
    statTotals,
    ehp,
    // "Total modeled DPS" (research/damage-path-switch-2026-10-12.md §4): the sustained hit figure plus every DoT and
    // Reaping as dealt to the target (mitigated), as damagePaths.sustained sums it, and Ill Omen.
    totalDps: paths
      ? sustainedModeledDps({
          hitDps: paths.sustained.hits.reduce((sum, hit) => sum + hit.dps, 0),
          dotDps: paths.sustained.dots.reduce((sum, dot) => sum + dot.dps, 0),
          reapingDps: paths.sustained.reaping.reapingDps,
        }) + (paths.sustained.illOmen?.dps || 0)
      : null,
    cards,
    defense,
  };
}
