// Shape and limits of a stored build (the planner state as saved, shared or imported). The checks run at run time and
// the same definitions give the type: StoredPlannerState is inferred from the schema, so the two cannot drift.
// Every field of a shape is optional (normalizePlannerState fills the gaps); unknown fields are rejected.

/** A run-time check that also carries, as a type only, the type it accepts. */
export interface Check<T> {
  (value: unknown, path: string): void;
  readonly __accepts?: T;
}
export type Checked<C> = C extends Check<infer T> ? T : never;

const check = <T>(run: (value: unknown, path: string) => void): Check<T> => run as Check<T>;
type Fields = Record<string, unknown>;

const fail = (path: string): never => {
  throw new TypeError(`Invalid build field: ${path}`);
};
const text = check<string>((value, path) => {
  if (typeof value !== "string" || value.length > 10000) fail(path);
});
const bool = check<boolean>((value, path) => {
  if (typeof value !== "boolean") fail(path);
});
const conditionMode = check<"auto" | "manual">((value, path) => {
  if (value !== "auto" && value !== "manual") fail(path);
});
const number = (min: number, max: number, integer = false) =>
  check<number>((value, path) => {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < min ||
      value > max ||
      (integer && !Number.isInteger(value))
    )
      fail(path);
  });
const object = check<Fields>((value, path) => {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype)
    fail(path);
  if (
    Object.keys(value as Fields).length > 2000 ||
    Object.keys(value as Fields).some((key) => ["__proto__", "constructor", "prototype"].includes(key))
  )
    fail(path);
});
const list = <T>(item: Check<T>, max = 100) =>
  check<T[]>((value, path) => {
    if (!Array.isArray(value) || value.length > max) fail(path);
    (value as unknown[]).forEach((entry, index) => item(entry, `${path}[${index}]`));
  });
const map = <T>(entry: Check<T>) =>
  check<Record<string, T>>((value, path) => {
    object(value, path);
    for (const [key, field] of Object.entries(value as Fields)) {
      text(key, path);
      entry(field, `${path}.${key}`);
    }
  });
const shape = <F extends Record<string, Check<unknown>>>(fields: F) =>
  check<{ [K in keyof F]?: Checked<F[K]> }>((value, path) => {
    object(value, path);
    for (const [key, field] of Object.entries(value as Fields)) {
      if (!Object.hasOwn(fields, key)) fail(`${path}.${key}`);
      fields[key](field, `${path}.${key}`);
    }
  });
const nullable = <T>(inner: Check<T>) =>
  check<T | null>((value, path) => {
    if (value !== null) inner(value, path);
  });

const levels = shape({ baseLevel: number(1, 40, true), addedLevels: number(0, 30, true), manualAddedLevels: bool });
const affixLineConfig = shape({ tier: nullable(number(0, 3, true)), rolls: list(number(-1000, 1000), 10) });
const specialSupportConfig = shape({
  tier: number(0, 3, true),
  roll: number(-1000, 1000),
  rolls: list(number(-1000, 1000), 10),
  lines: list(affixLineConfig, 10),
  rollKind: text,
  secondaryTier: number(0, 3, true),
  secondaryRoll: number(-1000, 1000),
  stars: number(0, 5, true),
  starScaleVersion: number(2, 2, true),
});
const supportShape = shape({
  name: text,
  level: number(1, 40, true),
  manaCostMultiplierPercent: number(1, 1000),
  effects: list(text),
  custom: bool,
});
/** A user-written support: unlike other shapes, its name, effects and `custom: true` are required. */
const support = check<Checked<typeof supportShape> & { name: string; effects: string[]; custom: true }>(
  (value, path) => {
    supportShape(value, path);
    const fields = value as Fields;
    text(fields.name, `${path}.name`);
    list(text)(fields.effects, `${path}.effects`);
    if (fields.custom !== true) fail(`${path}.custom`);
  },
);
const customSetup = shape({
  instanceId: text,
  role: text,
  name: text,
  baseLevel: number(1, 40, true),
  addedLevels: number(0, 30, true),
  sealedManaPercent: number(0, 100),
  supports: list(support, 5),
  enabledSupportSlots: number(0, 5, true),
  source: text,
  custom: bool,
  boardTab: text,
});
const defenses = check<Record<string, number>>((value, path) => {
  map(number(0, 1000000))(value, path);
  if (Object.keys(value as Fields).some((key) => !/^[A-Za-z][A-Za-z0-9]*$/.test(key))) fail(path);
});
const inventoryItem = shape({
  id: text,
  name: text,
  base: text,
  baseId: text,
  beltBlendId: text,
  beltBlendModifiers: list(text, 10),
  towerSequenceId: text,
  implicitModifiers: list(text, 10),
  baseAffixModifiers: list(text, 10),
  baseAffixTierIds: list(text, 2),
  prefixModifiers: list(text, 10),
  suffixModifiers: list(text, 10),
  craftAffixFamilyIds: list(text, 6),
  craftAffixTierIds: list(text, 6),
  craftAffixLegendary: list(bool, 6),
  legendaryModifiers: list(text, 20),
  slot: text,
  level: number(1, 100, true),
  itemLevel: number(1, 100, true),
  energy: number(0, 1000, true),
  affixCount: number(0, 30, true),
  corrupted: bool,
  modifiers: list(text, 30),
  corrodedModifierIndices: list(number(0, 29, true), 30),
  corrosionModifiers: list(text, 10),
  defenses,
  rarity: text,
  icon: text,
  source: text,
});
const placementShape = shape({
  column: number(1, 6, true),
  row: number(1, 6, true),
  rotation: number(0, 270, true),
  flipX: number(-1, 1, true),
  flipY: number(-1, 1, true),
});
/** A slate on the board: unlike other shapes, its column, row and rotation are required. */
const placement = check<Checked<typeof placementShape> & { column: number; row: number; rotation: 0 | 90 | 180 | 270 }>(
  (value, path) => {
    placementShape(value, path);
    const fields = value as Fields;
    number(1, 6, true)(fields.column, path);
    number(1, 6, true)(fields.row, path);
    if (![0, 90, 180, 270].includes(fields.rotation as number)) fail(path);
  },
);
const parkedSlate = shape({
  x: number(0, 100),
  y: number(0, 100),
  rotation: number(0, 270, true),
  flipX: number(-1, 1, true),
  flipY: number(-1, 1, true),
});
const craftedSlate = shape({
  id: text,
  name: text,
  template: text,
  god: text,
  shape: text,
  rotation: number(0, 270, true),
  flipX: number(-1, 1, true),
  flipY: number(-1, 1, true),
  affixes: list(text, 5),
  affixGroups: shape({ fixed: list(text, 2), random: list(text, 3), brand: list(text, 3) }),
  copyRule: text,
  rarity: text,
  icon: text,
});
const craftedMemory = shape({
  id: text,
  name: text,
  type: text,
  rarity: text,
  baseStat: text,
  enhancementLevel: number(1, 50, true),
  revivalMethod: text,
  waxAndWane: bool,
  risingMoon: bool,
  revivedAffix: text,
  revivedTier: number(1, 3, true),
  revivedRoll: nullable(number(-1000, 1000, true)),
  fixedAffixes: list(text, 2),
  randomAffixes: list(text, 2),
  fixedTiers: list(number(0, 3, true), 2),
  randomTiers: list(number(0, 3, true), 2),
  fixedRolls: list(nullable(number(-1000, 1000, true)), 2),
  randomRolls: list(nullable(number(-1000, 1000, true)), 2),
  traitLevelBonus: number(0, 4, true),
});
const craftedPrism = shape({
  id: text,
  type: text,
  base: text,
  radiusAffix: text,
  rareAffix: text,
  legendaryAffix: text,
  inverseRolls: shape({
    micro: number(-100, 200, true),
    medium: number(-100, 100, true),
    legendary: number(-100, 50, true),
  }),
});
const heroLoadout = shape({
  selectedTraits: map(text),
  memories: map(text),
  memoryTraitLevels: map(number(0, 4, true)),
  equippedMemoryIds: map(text),
  baseTraitMemoryId: text,
  baseTraitMemoryRoll: nullable(number(-100, 0, true)),
  sageScent: shape({ elixir: text, damage: text, defense: text, functional: text }),
  carinoSpecialAmmoSupports: list(text, 3),
  heroTraitSupports: map(text),
  heroTraitSupportLevels: map(number(1, 40, true)),
  heroTraitSupportConfigs: map(specialSupportConfig),
  selenaDanceTraits: list(text, 3),
});
// A follower skill slot (src/engine/followers/follower-model.js): a skill name, or { name, tier, affixes } once a tier or support affix is
// stored (2026-10-19; affixes: one per affix slot, { id: game modifier id, rolls? } or null).
const followerSkillAffix = shape({ id: number(0, 4294967295, true), rolls: list(number(-1000000, 1000000), 8) });
const followerSkillShape = shape({ name: text, tier: text, affixes: list(nullable(followerSkillAffix), 6) });
const followerSkillEntry = check<string | Checked<typeof followerSkillShape>>((value, path) => {
  if (typeof value === "string") text(value, path);
  else followerSkillShape(value, path);
});
const equipmentOverride = shape({
  name: text,
  base: text,
  baseId: text,
  beltBlendId: text,
  beltBlendModifiers: list(text, 10),
  towerSequenceId: text,
  implicitModifiers: list(text, 10),
  baseAffixModifiers: list(text, 10),
  baseAffixTierIds: list(text, 2),
  prefixModifiers: list(text, 10),
  suffixModifiers: list(text, 10),
  craftAffixFamilyIds: list(text, 6),
  craftAffixTierIds: list(text, 6),
  craftAffixLegendary: list(bool, 6),
  legendaryModifiers: list(text, 20),
  level: number(1, 100, true),
  itemLevel: number(1, 100, true),
  energy: number(0, 1000, true),
  affixCount: number(0, 30, true),
  corrupted: bool,
  modifiers: list(text),
  corrodedModifierIndices: list(number(0, 29, true), 30),
  corrosionModifiers: list(text, 10),
  defenses,
  sourceInventoryId: text,
  icon: text,
  source: text,
  rarity: text,
});
/**
 * The combat numbers a build stores (the Config tab's Advanced inputs), with their limits. The same table gives the schema
 * and clampCombatNumber, so an input can never store a value the next save would reject.
 */
export const combatNumberLimits = {
  auraAffectedAllies: { min: 0, max: 7, integer: true },
  afflictionAverage: { min: 0, max: 100, integer: false },
  afflictionPeak: { min: 0, max: 100, integer: false },
  targetFireResistancePercent: { min: -200, max: 200, integer: false },
  aimUptimePercent: { min: 0, max: 100, integer: false },
  aimBattleStacks: { min: 0, max: 3, integer: true },
  // The engine also caps the stacks at the build's Ignite limit (src/engine/skills/fires-allure.js).
  firesAllureScorchStacks: { min: 0, max: 100, integer: true },
  idyllStacks: { min: 0, max: 15, integer: true },
  extraMaxChanneledStacks: { min: -20, max: 20, integer: true },
  extraInitialChanneledStacks: { min: -20, max: 20, integer: true },
} as const;
export type CombatNumber = keyof typeof combatNumberLimits;

const combatNumbers = Object.fromEntries(
  Object.entries(combatNumberLimits).map(([key, { min, max, integer }]) => [key, number(min, max, integer)]),
) as Record<CombatNumber, Check<number>>;

/** A typed combat number within its limits: truncated when the field is whole, 0 (or the nearest limit) when not a number. */
export function clampCombatNumber(key: CombatNumber, value: number): number {
  const { min, max, integer } = combatNumberLimits[key];
  const finite = Number.isFinite(value) ? value : 0;
  return Math.max(min, Math.min(max, integer ? Math.trunc(finite) : finite));
}

const schema = shape({
  schemaVersion: number(1, 1, true),
  disabledEquipmentSlots: list(text, 20),
  disabledSupportNames: list(text),
  removedInventoryItemIds: list(text, 500),
  equippedSlateIds: nullable(list(text, 30)),
  equipmentOverrides: map(equipmentOverride),
  equipmentInventory: list(inventoryItem, 500),
  hero: shape({
    selectedHeroId: text,
    characterLevel: number(1, 100, true),
    selectedTraits: map(text),
    memories: map(text),
    memoryTraitLevels: map(number(0, 4, true)),
    memoryInventory: list(craftedMemory, 200),
    equippedMemoryIds: map(text),
    baseTraitMemoryId: text,
    baseTraitMemoryRoll: nullable(number(-100, 0, true)),
    sageScent: shape({ elixir: text, damage: text, defense: text, functional: text }),
    carinoSpecialAmmoSupports: list(text, 3),
    heroTraitSupports: map(text),
    heroTraitSupportLevels: map(number(1, 40, true)),
    heroTraitSupportConfigs: map(specialSupportConfig),
    selenaDanceTraits: list(text, 3),
    treeTraits: map(list(text, 4)),
    heroLoadouts: map(heroLoadout),
  }),
  skills: shape({
    setupOrder: nullable(list(text, 20)),
    boardSlots: shape({ skills: list(text, 5), auras: list(text, 4) }),
    supportOrder: map(list(text, 5)),
    setupEnabled: map(bool),
    skillLevels: map(levels),
    supportEnabled: map(bool),
    supportLevels: map(number(1, 40, true)),
    specialSupportConfigs: map(specialSupportConfig),
    customSupports: map(list(support, 5)),
    customSetups: list(customSetup, 20),
  }),
  talentRanks: map(number(0, 3, true)),
  talents: shape({
    useCapturedRanks: bool,
    selectedTrees: list(text, 4),
    coreSelections: map(text),
    prismInventory: list(craftedPrism, 200),
    installedPrisms: map(text),
    installedPrismNodes: map(text),
  }),
  slates: shape({
    geometryVersion: number(0, 4, true),
    placements: nullable(map(placement)),
    parked: map(parkedSlate),
    affixOverrides: map(list(text)),
    inventory: list(craftedSlate, 200),
  }),
  pacts: shape({
    activeSpirits: map(bool),
    selectedSpirits: list(text, 3),
    spiritLevels: map(number(1, 6, true)),
    nativeNodeQuantities: map(number(0, 100, true)),
    kismetSlots: map(shape({ name: text, rolls: list(number(-10000, 10000), 12) })),
    fateUnlocks: map(text),
    kismetSlotMode: bool,
    volcanoEnabled: list(bool, 4),
    reapingDurationQuantity: number(0, 5, true),
    spellBlockEnabled: list(bool, 1),
    attackBlockEnabled: list(bool, 2),
  }),
  followers: shape({
    followerId: nullable(text),
    rarity: nullable(text),
    skills: list(nullable(followerSkillEntry), 10),
    rarityScheme: text,
  }),
  combat: shape({
    conditionMode,
    conditions: map(bool),
    bestCaseOverrides: map(bool),
    ...combatNumbers,
  }),
});

/** A build as stored, shared or imported; every field optional. */
export type StoredPlannerState = Checked<typeof schema>;
export type StoredInventoryItem = Checked<typeof inventoryItem>;
export type StoredEquipmentOverride = Checked<typeof equipmentOverride>;
export type StoredCraftedMemory = Checked<typeof craftedMemory>;
export type StoredCraftedSlate = Checked<typeof craftedSlate>;
export type StoredCraftedPrism = Checked<typeof craftedPrism>;
export type StoredCustomSupport = Checked<typeof support>;
export type StoredSlatePlacement = Checked<typeof placement>;

/** Throws a TypeError naming the first invalid field ("Invalid build field: build.hero.characterLevel"). */
export function validatePlannerState(value: unknown): StoredPlannerState {
  schema(value, "build");
  return value as StoredPlannerState;
}
