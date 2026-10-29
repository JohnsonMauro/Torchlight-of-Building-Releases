// Selena – Dance of the Deep's badge modules (packages/engine/src/heroes/hero-trait-modules.js reads them): each row of the module
// table, the trait lines it reads and its badge handler. The handlers read the planner's settled state
// (packages/engine/src/heroes/selena/dance-of-the-deep.js) and write the line entries through ctx.

const num = (text) => Number(String(text).replace("−", "-"));
const round = (value) => Math.round(value * 10000) / 10000;
const PATTERNS = {
  crimsonCreate: /^Creates a Crimson Tide while the Main Terra Skill lasts$/i,
  crimsonTaken: /^\+(\d+(?:\.\d+)?)% additional damage taken by enemies affected by Crimson Tide$/i,
};

export function crimsonTideBadge(line, module, ctx) {
  const { state, entry, derive } = ctx;
  let match;
  // User-confirmed 2026-10-13: the Crimson Tide is active whenever a Main Terra Skill is active; it does not need movement
  // (before, it followed the Moving vs standing still group).
  const active = Boolean(state.mainIsTerra);
  const why = active ? null : "no active Main Terra Skill";
  if ((match = line.clean.match(PATTERNS.crimsonTaken))) {
    const body = `+${round(num(match[1]))}% additional damage taken`;
    entry(
      line,
      module,
      active,
      active
        ? "the Main Terra Skill is active: the dummy inside it is affected by the Crimson Tide (no movement needed, user-confirmed 2026-10-13)"
        : why,
      [body],
    );
    if (active) derive(body, line.source, "Crimson Tide on the dummy");
  } else if (PATTERNS.crimsonCreate.test(line.clean))
    entry(
      line,
      module,
      active,
      active ? "the Main Terra Skill is active (no movement needed, user-confirmed 2026-10-13)" : why,
    );
  else entry(line, { ...module, status: "Not modeled" }, false, "this Crimson Tide clause is not read");
}

// Activation Medium: Terra (packages/engine/src/heroes/selena/dance-of-the-deep.js resolveActivationMediumTerra; the planner applies it).
export function activationMediumTerraBadge(line, module, ctx) {
  const { state, entry } = ctx;
  const am = state.activationMediumTerra || null;
  const active = Boolean(am?.active);
  const why = am?.granted
    ? "no active Main Terra Skill"
    : "Activation Medium: Terra is not granted (Silencing Severance not selected)";
  if (/^The Main Terra Skill is supported by Activation Medium: Terra$/i.test(line.clean))
    entry(
      line,
      module,
      active,
      active
        ? `+${am.additionalPercent}% additional damage for the Main Terra Skill (hits and its own DoT); triggered when Terra Charge is at max with the dummy within ${am.triggerMeters} m (no use time); seals ${am.sealPercent}% ${am.sealsLife ? "Life (Drenched Hem)" : "Mana"} (TLIDB; provisional readings listed in the module rule)`
        : why,
    );
  else if (/^Main Skills cannot be supported by other Activation Mediums$/i.test(line.clean))
    entry(line, module, active, active ? "other Activation Medium supports on the Main Skill are switched off" : why);
  else if (/^Activation Medium: Terra seals Life instead$/i.test(line.clean))
    entry(
      line,
      module,
      active,
      active ? `the ${am.sealPercent}% seal is Life: it counts toward the Life sealed that Drenched Hem reads` : why,
    );
  else entry(line, { ...module, status: "Not modeled" }, false, "this Activation Medium clause is not read");
}

// The Cycle I Resist (packages/engine/src/heroes/selena/dance-of-the-deep.js resolveCycleResist): a Reaping source at the Main Terra recast; Terra Skill Duration.
export function cycleResistBadge(line, module, ctx) {
  const { state, entry } = ctx;
  const active = Boolean(state.mainIsTerra);
  entry(
    line,
    module,
    active,
    active
      ? /previous Main Terra Skill/i.test(line.clean)
        ? "a Reaping source at the Main Terra recast: roll% × the previous Terra's remaining duration per Reap, Reaping Duration applied (packages/engine/src/heroes/selena/dance-of-the-deep.js resolveCycleResist; provisional)"
        : "25% of the plain Critical Strike Rating increase joins Terra Skill Duration, which sets the remaining duration the Reap reads (provisional)"
      : "no active Main Terra Skill",
  );
}

// Dance of the Deep clauses settled in packages/engine/src/heroes/selena/dance-of-the-deep.js (the planner applies them; these entries carry the badges).
export function danceTerraBadge(line, module, ctx) {
  const { entry } = ctx;
  entry(
    line,
    module,
    true,
    /^Non-Main/i.test(line.clean)
      ? "Terra skills other than the Main Skill are taken off the dummy"
      : "the Main Terra Skill follows you: the dummy stays inside its area (best case)",
  );
}

export function terraChargeBadge(line, module, ctx) {
  const { state, entry } = ctx;
  const terra = state.mainIsTerra || (state.activeTags || new Set()).has("Terra");
  entry(
    line,
    module,
    Boolean(terra),
    terra
      ? "Terra Charge consumption per cast (packages/engine/src/heroes/selena/dance-of-the-deep.js; provisional)"
      : "no active Terra skill",
  );
}

export function paradiseBadge(line, module, ctx) {
  const { state, entry } = ctx;
  const active = Boolean(state.mainIsTerra);
  entry(
    line,
    module,
    active,
    active
      ? "the dummy inside the Main Terra Skill's area is Cursed (Lv. 1 Ominous; Ill Omen counted in the Ill Omen line)"
      : "no active Main Terra Skill",
  );
}

export const SELENA_MODULES = Object.freeze([
  {
    key: "crimsonTide",
    heroes: /^selena-dance-of-the-deep$/,
    label: "Selena: Crimson Tide",
    status: "Provisional",
    rule: '"Creates a Crimson Tide while the Main Terra Skill lasts": user-confirmed 2026-10-13, the Crimson Tide (and its "+X% additional damage taken by enemies affected by Crimson Tide") is active whenever a Main Terra Skill is active; it does not need movement (keyword 80060\'s "while moving" clause is its knockback / Slow, not the damage taken). The dummy (within 10 m, inside the Main Terra Skill that follows you) is affected the whole time; the line reaches hits and DoTs.',
    lines: /Crimson Tide/i,
    badge: crimsonTideBadge,
  },
  // Selena (Dance of the Deep) path clauses (Selena traits batch 2026-10-13; packages/engine/src/heroes/selena/dance-of-the-deep.js applies the defined ones).
  {
    key: "danceTerra",
    heroes: /^selena-dance-of-the-deep$/,
    label: "Selena: Main Terra Skill",
    status: "Provisional",
    rule: "The Main Terra Skill is centred on you and follows you (the dummy inside its area: best case); Terra skills that are not the Main Skill deal no damage (packages/engine/src/heroes/selena/dance-of-the-deep.js).",
    lines:
      /^The Main Terra Skill is always centered on you and follows you$|^Non-Main Terra Skill cannot deal damage$/i,
    badge: danceTerraBadge,
  },
  {
    key: "terraCharge",
    heroes: /^selena-dance-of-the-deep$/,
    label: "Selena: Terra Charge",
    status: "Provisional",
    rule: "Keyword 151 / manual 1001011320: a Terra cast consumes all its charges, each enhancing the skill. Charges consumed per cast = min(Max Terra Charge Stacks, charges gained over one cast interval) at the planner's recast cadence; Max Terra Charge = 1 + \"Max Terra Charge Stacks +N\" + Layered Hem's share of the Max Spell Burst increase; Terra Charge Recovery Speed shortens the 0.5 s charge interval; Artificial Moon sets 32% per charge (packages/engine/src/heroes/selena/dance-of-the-deep.js).",
    lines: /Terra Charge/i,
    badge: terraChargeBadge,
  },
  {
    key: "paradise",
    heroes: /^selena-dance-of-the-deep$/,
    label: "Selena: The Paradise I Curse",
    status: "Provisional",
    rule: '"Enemies within the Main Terra Skill\'s area are cursed with Lv. 1 Ominous": with an active Main Terra Skill the dummy is Cursed, so "against Cursed enemies" lines hold. Ill Omen is modeled in packages/engine/src/ailments/ill-omen.js (best-case Elite loop). This Ominous does not take a curse slot (user-confirmed 2026-10-13).',
    lines: /are cursed with Lv\. \d+ Ominous/i,
    badge: paradiseBadge,
  },
  {
    key: "danceStep",
    heroes: /^selena-dance-of-the-deep$/,
    label: "Selena: Dance Step",
    status: "Not modeled",
    rule: 'Crimson Endless Dance: "Enters a random Dance Step state when casting a Main Terra Skill" (game text 345425120: Crimson Dash, Agonizing Revival, Eternal Sleep). Left unmodeled by user decision (2026-10-13): the step is random. Only Eternal Sleep would touch damage ("+X% additional damage taken ... Ends after taking damage equal to Y% of Max Life"; X, Y and the stay time are not published).',
    lines: /Dance Step/i,
  },
  {
    key: "crimsonShade",
    heroes: /^selena-dance-of-the-deep$/,
    label: "Selena: Crimson Shade",
    status: "Not modeled",
    rule: "Keyword 80061: a Crimson Shade does not move and casts your Main Terra Skill once centred on itself. Whether its Terra reaches the dummy, whether it consumes or gains Terra Charge, and how many Shades stand at once over a cast cycle are not defined.",
    lines: /Crimson Shade/i,
  },
  {
    key: "cycleResist",
    heroes: /^selena-dance-of-the-deep$/,
    label: "Selena: The Cycle I Resist",
    status: "Provisional",
    rule: "TLIDB / game affixes 480006336, 591569216: 25% of the Critical Strike Rating increase is added to Terra Skill Duration; on a Terra cast while the previous Main Terra Skill lasts, Reap roll% (6–10) of its remaining duration (Reaping Duration applies). Modeled as a Reaping source at the Main Terra recast interval Δt: roll% × (T − Δt) s per Reap, T = 6 s × (1 + Terra Skill Duration % incl. the crit share); no internal cooldown, so every recast Reaps (user, 2026-10-13: the tooltip shows none; no cooldown node in either game record) (packages/engine/src/heroes/selena/dance-of-the-deep.js resolveCycleResist). User-confirmed 2026-10-13: every Critical Strike Rating increase / decrease reaching the Main Terra counts (Minion and other skill types excluded), and the Reap settles every DoT on the dummy. Provisional: a skill-hit Terra's recast policy.",
    lines: /Terra Skill Duration|previous Main Terra Skill/i,
    badge: cycleResistBadge,
  },
  {
    key: "activationMediumTerra",
    heroes: /^selena-dance-of-the-deep$/,
    label: "Selena: Activation Medium: Terra",
    status: "Provisional",
    rule: "TLIDB Activation_Medium_Terra (captured 2026-10-13; user-stated reading confirmed): seals 20% Mana (Life with Drenched Hem); with an enemy within 25 m, triggers the supported Terra skill when Terra Charge reaches max (no use time: a DoT Terra recasts every Max Terra Charge × charge interval and consumes them all), −30% Movement Speed for 2 s; +30% additional damage for the supported skill (hits and its own DoT, the support rule). Silencing Severance also stops other Activation Mediums on the Main Skill. Sealed Mana Compensation does not reduce the 20% seal (user-confirmed 2026-10-13). Provisional: a skill-hit Terra keeps its recast-on-expiry cadence.",
    lines: /Activation Medium/i,
    badge: activationMediumTerraBadge,
  },
]);
