import { prismRareAffixes } from "./prism-rare-affixes.js";

export const etherealPrismBases = [
  "Haze",
  "Phantasmagoria",
  "One For All",
  "Unwavering Fortress",
  "Unstoppable Force",
  "Hare's Agility",
  "Sweeping Fury",
  "Keen Intellect",
  "Towering Presence",
  "Spell Ripple",
  "Juggernaut",
  "Adaptive Defense",
  "Unmatched Valor",
  "Self-Delusion",
  "Escalating Affliction",
  "Commander's Gambit",
  "Circle of Life",
  "Miraculous Touch",
  "Dark Advance",
  "Effortless Command",
  "Crushing Blast",
  "Storm's Command",
  "Fire's Allure",
  "Fiery Fantasy",
];

export const inverseImageRolls = {
  micro: { label: "Micro Talent Effect Range", min: -100, max: 200 },
  medium: { label: "Medium Talent Effect Range", min: -100, max: 100 },
  legendary: { label: "Legendary Medium Talent Effect Range", min: -100, max: 50 },
};

export function inverseImageRoll(item, kind) {
  const range = inverseImageRolls[kind];
  const value = Number(item?.inverseRolls?.[kind]);
  return Number.isFinite(value) ? Math.max(range.min, Math.min(range.max, Math.round(value))) : range.min;
}

export const prismAffixes = {
  radius: [
    "The Effect Area expands to 3x3 Rectangle",
    "The Effect Area expands to 3x4 Rectangle",
    "The Effect Area expands to 4x3 Rectangle",
    "The Effect Area expands to 2x2 Rectangle",
    "The Effect Area expands to 7x1 Rectangle",
    "The Effect Area expands to 2x4 Rectangle",
    "The Effect Area expands to 4x2 Rectangle",
  ],
  rare: prismRareAffixes,
  legendary: [
    ...[1, 2, 3].flatMap((count) =>
      ["Micro", "Medium"].map(
        (size) => `Points can be allocated to all ${size} Talent within the area ${count} additional time(s)`,
      ),
    ),
    "All Legendary Medium Talent within the area can ignore prerequisite point requirements",
    "All Legendary Medium Talent within the area can ignore prerequisite point requirements; All Medium Talent within the area can ignore prerequisite point requirements",
    ...[1, 2].flatMap((count) =>
      ["Tenacity", "Agility", "Focus"].map(
        (blessing) =>
          `When activating 2 Legendary Medium Talent within the area, +${count} to Max ${blessing} Blessing Stacks`,
      ),
    ),
    ...[1, 2].map(
      (count) =>
        `When activating 2 Legendary Medium Talent within the area, Gains a stack of Fortitude when using a Melee Skill; Owns ${count} additional stack(s) of Fortitude`,
    ),
    ...[40, 100].flatMap((effect) => [
      `When activating 2 Legendary Medium Talent within the area, Inflicts Frail when dealing Spell Damage; +${effect}% Frail Effect`,
      `When activating 2 Legendary Medium Talent within the area, Gains Attack Aggression when casting an Attack Skill; +${effect}% Attack Aggression Effect`,
      `When activating 2 Legendary Medium Talent within the area, Gains Spell Aggression when casting a Spell Skill; +${effect}% Spell Aggression Effect`,
      `When activating 2 Legendary Medium Talent within the area, Gains a stack of Torment when dealing Damage Over Time; +${effect}% Torment Effect`,
      ...["Cold", "Fire", "Lightning"].map(
        (element) =>
          `When activating 2 Legendary Medium Talent within the area, Inflicts ${element} Infiltration on hit; +${effect}% ${element} Infiltration Effect`,
      ),
    ]),
    ...[100, 120].map(
      (rating) =>
        `When activating 2 Legendary Medium Talent within the area, Has ${rating} point(s) of fixed Blur Rating`,
    ),
    ...[100, 175].map(
      (chance) =>
        `When activating 2 Legendary Medium Talent within the area, +${chance}% chance to gain a Barrier upon casting a Defensive Skill`,
    ),
    "When activating 2 Legendary Medium Talent within the area, You can cast 1 additional Curses; Gains 1 Lv. 1 random curse for 5 s after casting a Curse Skill",
    "When activating 2 Legendary Medium Talent within the area, Immune to crowd control effects; -25% Defense",
    "When activating 2 Legendary Medium Talent within the area, Immune to crowd control effects",
    "When activating 2 Legendary Medium Talent within the area, -100% Curse effect against you",
    "When activating 2 Legendary Medium Talent within the area, Immune to Elemental Ailments; -8% Elemental Resistance",
    "When activating 2 Legendary Medium Talent within the area, Immune to Elemental Ailments",
    ...[1, 2].map((count) => `When activating 2 Legendary Medium Talent within the area, +${count} Max Bond stacks`),
  ],
};

// Mutated Core affixes (TLIDB Ethereal Prism page, Random Affix list, read 2026-10-10;
// SS13 data, no SS14 marker on the page). TLIDB lists them only on the top prism tier
// (modifier ids 1234333xyy) with no Prism Gauge label: every core has three variants,
// each with one downside line (x = 0, 1, 2 below). Haze and Phantasmagoria have none.
// The text after "[Core]" is TLIDB's own copy of the added core's effect; the planner
// applies the core from its talent catalog, not from this text.
export const prismMutationDownsides = ["-5% Elemental Resistance", "-30 to All Stats", "-8% Defense"];
export const prismMutationCoreEffects = new Map([
  ["One For All", "Gains Cold and Lightning Resistance equal to 50% of Fire Resistance"],
  [
    "Unwavering Fortress",
    "Gains Bulwark equal to 1.5% of Armor and reduces 100% Non-True Damage taken every 10s. Bulwark is refreshed when gained again; Your Max Life is set to 100; Your Evasion and Max Energy Shield are fixed at 0",
  ],
  [
    "Unstoppable Force",
    "When a Combo Finisher is in Multistrike, it is guaranteed to deal damage equal to the Max Multistrike Count",
  ],
  [
    "Hare's Agility",
    "When exiting Stand Still, gains 1 stack of buff that lasts for 2s, up to 5 times; +14% additional damage dealt to enemies in proximity for each stack of buff. +8% Attack Speed",
  ],
  [
    "Sweeping Fury",
    "On hit, Main Ranged Horizontal Projectile Skills have a 100% chance to cast an additional Main Skill, whose projectiles fire in a ring and deal -60% additional damage. Interval: 0.03s. Does not affect Sentry Skills, Vertical Skills, and Channeled Skills.; Projectile Quantity Upper limit: 5; +2 Horizontal Projectile Penetration(s)",
  ],
  [
    "Keen Intellect",
    "For every Active Empower Skill equipped, +13% additional Spell Damage (multiplies); For every Active Curse Skill equipped, +6% Elemental and Erosion Resistance Penetration and +6% Armor DMG Mitigation Penetration.; For every Active Defensive Skill equipped, +13% additional Max Mana (multiplies); For every Active Mobility Skill equipped, +13% additional Cast Speed (multiplies)",
  ],
  [
    "Towering Presence",
    "Adds 100% of the Main-Hand Weapon damage to Spells; Adds 75% of Main-Hand Weapon's Critical Strike Rating to the Base Critical Strike Rating of Spell Skills; -99% additional Ailment Damage",
  ],
  [
    "Spell Ripple",
    "Main Spell Skills on hit have a 50% chance to spawn a Pulse, dealing True Damage equal to 150% of Hit Damage. Interval: 0.03s",
  ],
  [
    "Juggernaut",
    "-10% additional Armor and -2% Elemental and Erosion Resistance for enemies on Critical Strike for 8 s. Stacks up to 10 times",
  ],
  [
    "Adaptive Defense",
    "If you haven't been hit recently, +40% Injury Buffer. This effect lasts for another 4s when you are hit; Gains 1 stack(s) of Deflection every 0.5 s if you have been hit recently",
  ],
  ["Unmatched Valor", "Has 130 point(s) of fixed Fervor Rating"],
  [
    "Self-Delusion",
    "+12% additional Erosion Damage to an enemy for each type of Crowd Control Effect they are under; Crowd Control Effects inflicted are reflected back onto you",
  ],
  [
    "Escalating Affliction",
    "Changes the effect of each point of Affliction to: 0.1% - +3% additional Damage Over Time taken. Refreshes every 1s and is affected by Lucky Damage bonuses; 90% of the bonuses and additional bonuses for Max Damage is also applied to Damage Over Time",
  ],
  [
    "Commander's Gambit",
    "-100% additional Tenacity Blessing, Agility Blessing, and Focus Blessing Effect; When gaining any Blessing, Minions within 10m also gain it; Minions' Max Blessing Stacks are three times your own",
  ],
  [
    "Circle of Life",
    "Gains Growth equal to 80% of the nearest Spirit Magus every 1s, and Growth gains Return Speed equal to Command; For every 10 Growth, +1% additional damage for Spirit Magi, 0.1% additional Physique and 0.5% Skill Area for yourself",
  ],
  [
    "Miraculous Touch",
    "Triggers Miraculous Gain when casting an Elixir Skill; Elixir Skills gain 1 Charging Progress every second",
  ],
  [
    "Dark Advance",
    "Moves in the target direction when casting Dark Gate; +3 Max Charges for Dark Gate; +50% additional Cooldown Recovery Speed to Dark Gate; +30% additional Minion Damage if a Dark Gate has been cast recently",
  ],
  ["Effortless Command", ""], // TLIDB shows only the raw id 1204411023 here; Effortless Command by id/base order
  [
    "Crushing Blast",
    "Enemies have a 25% chance to explode when defeated by an Attack or Spell, dealing True Damage equal to 250% of their Max Life to enemies within a 6 m radius; +30% additional damage to Elites",
  ],
  [
    "Storm's Command",
    "+35% additional Attack Damage for each different Warcry cast for 8 s; -99% additional Empower Skill and Defensive Skill Effect",
  ],
  [
    "Fire's Allure",
    "Inflicts Scorch instead of Ignite; Nearby enemies within 10m -10% Fire Resistance for each stack of Scorch on them",
  ],
  [
    "Fiery Fantasy",
    "+3% additional Ignite Damage, up to +150% , for every +1% Ignite Chance above 100%; +3% additional Wilt Damage, up to +150% , for every +1% Wilt Chance above 100%; +3% additional Trauma Damage, up to +150% , for every +1% Trauma Chance above 100%",
  ],
]);
const mutationPrefix =
  "Mutated Core Talents no longer replace the original talent, but add the following to the Core Talent in the current Talent Panel:";
export function prismMutationAffix(base, downside) {
  const effect = prismMutationCoreEffects.get(base);
  return `${downside}; ${mutationPrefix} [${base}]${effect ? ` ${effect}` : ""}`;
}

// TLIDB lists the 75% amplified Phantasmagoria rolls alongside the ordinary
// Prism Gauge values. Keep those variants out of other base selectors.
export function prismRareAffixesForBase(base) {
  return base === "Phantasmagoria" ? prismRareAffixes.slice(65) : prismRareAffixes.slice(0, 65);
}

export function prismSupportsLegendaryAffix(prism) {
  return prism?.type === "ethereal" && prism.base !== "Haze";
}

export function prismHasMutatedCore(prism) {
  return (
    prismSupportsLegendaryAffix(prism) &&
    /\bMutated Core Talents no longer replace the original talent\b/i.test(prism.legendaryAffix || "")
  );
}

// The downside-free wording below predates the TLIDB list; it stays selectable so saved
// prisms that use it remain valid.
export function prismLegendaryAffixesForBase(base) {
  if (base === "Haze") return [];
  const mutation = `Mutated Core Talents no longer replace the original talent, but add [${base}] to the Core Talent in the current Talent Panel`;
  const variants = prismMutationCoreEffects.has(base)
    ? prismMutationDownsides.map((downside) => prismMutationAffix(base, downside))
    : [];
  return [...prismAffixes.legendary, ...variants, mutation];
}

// The downside line of a mutated-core affix ("-30 to All Stats"), or "" when there is none.
export function prismMutationDownside(prism) {
  if (!prismHasMutatedCore(prism)) return "";
  const lead = String(prism.legendaryAffix).split(";")[0].trim();
  return prismMutationDownsides.includes(lead) ? lead : "";
}

export function prismBaseEffect(type, base, legendaryAffix = "") {
  if (type === "inverse")
    return "Reflects all Talents within the range to the mirrored area. All Talents within the reflected area have no prerequisites.";
  if (base === "Haze")
    return "No fixed core talent effect. The selected Core Talents remain active; this Prism can still have its own random affixes.";
  if (base === "Phantasmagoria") return "+75% to the effects of Random Affixes on this Prism.";
  if (prismHasMutatedCore({ type, base, legendaryAffix }))
    return `Adds ${base} to the selected Core Talent of the Advanced Talent Panel.`;
  return `Replaces the Core Talent of the Advanced Talent Panel with ${base}.`;
}

const addedCoreEffectPrefix = "Adds an additional effect to the Core Talent on the Any Advanced Talent Panel:";
// The effects a Haze rolls as its base affix: the game's base affixes 1204200101–1204200114, worded as the upstream id
// map (src/data/game-id-map-ss14.generated.js) writes them, so a prism from "Import from game" holds one of these.
const hazeAddedCoreEffects = [
  "+12% additional Attack Damage when holding a One-Handed Weapon\n+12% additional Base Damage for Two-Handed Weapons",
  "While standing still, +12% additional Attack Damage and Ailment Damage dealt by attacks. -5% additional damage taken",
  "+1% additional Damage per +5% Movement Speed, up to +12%",
  "+12% additional Attack Damage and Ailment Damage dealt by attacks when there are Elites within 10m nearby\n+50% Skill Area when there are no Elites within 10m nearby",
  "+30 Affliction inflicted per second\n+10% additional Damage Over Time",
  "When channeling Harmonious Field, triggers the Sentry Main Skill if there are no Sentries within 10m. Interval: 1s\n+30% Empower Skill Effect for Harmonious Field",
  "Blinds enemies within 15 m when casting Dazzling Bloom\n+12% additional damage for Spirit Magi against Blinded enemies",
  "For every stack of Max Spell Burst, +4% additional Spell Damage, up to +16% additional Spell Damage",
  "+2.5% additional Minion Damage per Synthetic Troop Minion you own",
  "+12% additional Spell Damage when you have Spell Aggression",
];
// The base affixes a base can roll (only Haze has a choice; every other base's is its fixed effect).
export function prismBaseAffixesForBase(base) {
  return base === "Haze" ? hazeAddedCoreEffects.map((effect) => `${addedCoreEffectPrefix}\n${effect}`) : [];
}

// An Ethereal Prism base affix that adds an effect to its panel's core ("Adds an additional effect to the Core Talent on the
// Any Advanced Talent Panel:" then the effect; TLIDB Base Affix rows 12042001xx, the game's Haze, 2026-10-22 log): the effect,
// or "" for another base affix or none.
export function prismAddedCoreEffect(prism) {
  const match = /^Adds an additional effect to the Core Talent on the .+? Advanced Talent Panel:\s*([\s\S]+)$/i.exec(
    String(prism?.baseAffix || "").trim(),
  );
  return prism?.type === "ethereal" && match ? match[1].trim() : "";
}

export function prismReplacesCore(prism) {
  return prism?.type === "ethereal" && !["Haze", "Phantasmagoria"].includes(prism.base) && !prismHasMutatedCore(prism);
}

export function prismArea(prismOrRadiusAffix) {
  if (prismOrRadiusAffix?.type === "inverse") return "3x3";
  const radiusAffix = typeof prismOrRadiusAffix === "string" ? prismOrRadiusAffix : prismOrRadiusAffix?.radiusAffix;
  return radiusAffix?.match(/\d+x\d+/)?.[0] || "1x1";
}

export function prismAreaBounds(prismOrRadiusAffix, coordinate, columns = 7, rows = 5) {
  const [areaWidth, areaHeight] = prismArea(prismOrRadiusAffix).split("x").map(Number);
  const [column, row] = coordinate.split(",").map(Number);
  if (prismOrRadiusAffix?.type === "inverse") {
    const left = Math.max(0, column - 1),
      top = Math.max(0, row - 1);
    return {
      left,
      top,
      width: Math.min(columns - 1, column + 1) - left + 1,
      height: Math.min(rows - 1, row + 1) - top + 1,
    };
  }
  // The prism sits in the area's middle column and row (the 2nd of a 4- or 3-wide side, as TLIDB's "The Prism is located in
  // the 2nd row, 2nd column"); the part past the panel's edge is cut off, never moved inside: a 4x3 Haze in the Lich panel's
  // top row covers that row and the one under it only (the game's lit area, owner's screenshot 2026-10-22).
  const left = column - Math.floor((areaWidth - 1) / 2),
    top = row - Math.floor((areaHeight - 1) / 2);
  const clippedLeft = Math.max(0, left),
    clippedTop = Math.max(0, top);
  return {
    left: clippedLeft,
    top: clippedTop,
    width: Math.min(columns, left + areaWidth) - clippedLeft,
    height: Math.min(rows, top + areaHeight) - clippedTop,
  };
}

export function inverseImageReflectedBounds(prism, coordinate, columns = 7, rows = 5) {
  if (prism?.type !== "inverse" || !coordinate) return null;
  const source = prismAreaBounds(prism, coordinate, columns, rows);
  return {
    left: columns - source.left - source.width,
    top: rows - source.top - source.height,
    width: source.width,
    height: source.height,
  };
}

export function inverseImageReflectionMap(nodes, prism, coordinate, columns = 7, rows = 5) {
  const reflected = new Map();
  if (prism?.type !== "inverse" || !coordinate) return reflected;
  const source = prismAreaBounds(prism, coordinate, columns, rows);
  for (const node of nodes) {
    const [x, y] = node.coordinate;
    if (x < source.left || x >= source.left + source.width || y < source.top || y >= source.top + source.height)
      continue;
    const target = [columns - 1 - x, rows - 1 - y];
    reflected.set(target.join(","), { source: node, sourceCoordinate: node.coordinate.join(","), coordinate: target });
  }
  return reflected;
}

export function inverseImageReflectedCoordinates(prism, coordinate, columns = 7, rows = 5) {
  const bounds = inverseImageReflectedBounds(prism, coordinate, columns, rows);
  const coordinates = new Set();
  if (!bounds) return coordinates;
  for (let y = bounds.top; y < bounds.top + bounds.height; y++) {
    for (let x = bounds.left; x < bounds.left + bounds.width; x++) coordinates.add(`${x},${y}`);
  }
  return coordinates;
}

export function inverseImageTalentNodes(nodes, prism, coordinate, columns = 7, rows = 5) {
  const reflections = inverseImageReflectionMap(nodes, prism, coordinate, columns, rows);
  if (!reflections.size) return nodes;
  const occupied = new Set(nodes.map((node) => node.coordinate.join(",")));
  const reflectedNode = (reflection) => ({
    ...reflection.source,
    coordinate: reflection.coordinate,
    reflectedFrom: reflection.sourceCoordinate,
  });
  return [
    ...nodes.map((node) => {
      const reflection = reflections.get(node.coordinate.join(","));
      return reflection ? reflectedNode(reflection) : node;
    }),
    ...[...reflections].filter(([target]) => !occupied.has(target)).map(([, reflection]) => reflectedNode(reflection)),
  ];
}

export function inverseImageEffectMultiplier(prism, nodeType) {
  if (prism?.type !== "inverse") return 1;
  const kind = nodeType === "legendary" ? "legendary" : nodeType === "medium" ? "medium" : "micro";
  return 1 + inverseImageRoll(prism, kind) / 100;
}

export function prismNodeAffixes(prism, nodeType, rank, activeLegendaryCount = 0) {
  const typeLabel = { micro: "Micro", medium: "Medium", legendary: "Legendary Medium" }[nodeType];
  if (!typeLabel || !prism) return [];
  const result = [];
  for (const [tier, affix] of [
    ["Rare", prism.rareAffix],
    ["Legendary", prism.legendaryAffix],
  ]) {
    if (!affix) continue;
    for (const clause of affix.split(
      /;\s*(?=All (?:Micro|Medium|Legendary Medium) Talent within the area can ignore)/,
    )) {
      const applies =
        clause.startsWith(`All ${typeLabel} Talent within the area also gain:`) ||
        clause.startsWith(`All ${typeLabel} Talent within the area can ignore`) ||
        clause.startsWith(`Points can be allocated to all ${typeLabel} Talent within the area`) ||
        (nodeType === "legendary" && clause.startsWith("When activating 2 Legendary Medium Talent within the area,"));
      if (!applies) continue;
      const needsTwo = clause.startsWith("When activating 2 Legendary Medium Talent within the area,");
      const effect = clause.replace(/^All (?:Micro|Medium|Legendary Medium) Talent within the area also gain:\s*/, "");
      const perPoint =
        clause.startsWith(`All ${typeLabel} Talent within the area also gain:`) && nodeType !== "legendary";
      const scaledEffect =
        perPoint && rank > 1
          ? effect.replace(
              /(?<![\w.])([+-]?\d+(?:\.\d+)?)(?=%|\s+[A-Za-z])/g,
              (_, amount) => `${amount.startsWith("+") ? "+" : ""}${Number((Number(amount) * rank).toFixed(4))}`,
            )
          : effect;
      result.push({
        tier,
        effect: scaledEffect,
        active: rank > 0 && (!needsTwo || activeLegendaryCount >= 2),
        reason:
          rank <= 0
            ? "Allocate this talent to activate"
            : needsTwo && activeLegendaryCount < 2
              ? `${activeLegendaryCount}/2 Legendary Medium talents allocated in area`
              : "Active",
      });
    }
  }
  return result;
}
