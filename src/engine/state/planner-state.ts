// The planner state: what a build holds (src/engine/state/state-validation.ts checks the stored shape), its defaults, and the
// normalization every stored, imported or shared build goes through; build codes and the diff between two builds. Pure (no
// storage): the calculation imports it. The saved-build library lives in src/app/storage/build-library.ts.
import { normalizeTalentTreeSelection } from "../talents/talent-selection-rules.js";
import { validatePlannerState } from "./state-validation.ts";
import type { StoredCraftedMemory, StoredPlannerState } from "./state-validation.ts";
import { migrateTreeTraits } from "../heroes/hero-trait-tree.js";
import { clampMemoryEnhancement, traitLevelBonusForEnhancement } from "../heroes/hero-memory-rules.js";
import { defaultPactspiritSlots } from "../pacts/pactspirit-selection.js";
import { AIM_UPTIME_AUTO_SENTINEL } from "../skills/aim-model.js";
import { migrateLegendaryEquipment } from "./legendary-text-migrations.js";
import { migrateChangedEquipment } from "./changed-item-migrations.js";
import { migrateCustomSupports } from "./support-text-migrations.js";
import { defaultFollowerState, normalizeFollowerState } from "../followers/follower-model.js";

// ---- Types ----------------------------------------------------------------------------------------------------------

type Defaults = typeof defaultPlannerState;
type Section<K extends keyof StoredPlannerState> = NonNullable<StoredPlannerState[K]>;
/** A stored section after normalization: every field the defaults (D) give is present; the others stay optional. */
type Filled<T, D> = Omit<T, keyof D> & { [K in keyof D & keyof T]-?: Exclude<T[K], undefined> };

type StoredHero = Section<"hero">;
/** A crafted memory after normalization: named after its type, enhancement clamped to its rarity, trait bonus derived. */
export type PlannerMemory = Omit<StoredCraftedMemory, "name" | "enhancementLevel" | "traitLevelBonus"> & {
  name: string | undefined;
  enhancementLevel: number;
  traitLevelBonus: number;
};
/** Selena's selenaDanceTraits is migrated into treeTraits and dropped, from the hero and from each saved loadout. */
export type PlannerHero = Omit<
  Filled<StoredHero, Defaults["hero"]>,
  "selenaDanceTraits" | "memories" | "memoryInventory" | "heroLoadouts" | "sageScent"
> & {
  /** Undefined in a slot whose equipped memory has neither a type nor a name. */
  memories: Record<string, string | undefined>;
  memoryInventory: PlannerMemory[];
  heroLoadouts: Record<string, Omit<NonNullable<StoredHero["heroLoadouts"]>[string], "selenaDanceTraits">>;
  sageScent: Required<NonNullable<StoredHero["sageScent"]>>;
};
export type PlannerSkills = Omit<Filled<Section<"skills">, Defaults["skills"]>, "boardSlots"> & {
  boardSlots: Required<NonNullable<Section<"skills">["boardSlots"]>>;
};

/**
 * A build as normalizePlannerState returns it: the stored shape (src/engine/state/state-validation.ts) with every field that has a
 * default present. Fields without a default (hero.characterLevel, combat.bestCaseOverrides, slates.affixOverrides)
 * stay optional.
 */
export type PlannerState = Omit<
  Filled<StoredPlannerState, Defaults>,
  "hero" | "skills" | "slates" | "talents" | "pacts" | "combat" | "followers"
> & {
  hero: PlannerHero;
  skills: PlannerSkills;
  slates: Filled<Section<"slates">, Defaults["slates"]>;
  talents: Filled<Section<"talents">, Defaults["talents"]>;
  pacts: Filled<Section<"pacts">, Defaults["pacts"]>;
  combat: Filled<Section<"combat">, Defaults["combat"]>;
  followers: Filled<Section<"followers">, Defaults["followers"]>;
};

export type PlannerStateDiff = Record<
  "hero" | "equipment" | "skills" | "talents" | "slates" | "pacts" | "followers" | "combat",
  number
>;

// Fields that src/engine/heroes/hero-trait-tree.js migrateTreeTraits has moved into hero.treeTraits. Heroes and loadouts reach here
// validated, so always as objects.
function withoutLegacyTreeFields<T extends { selenaDanceTraits?: unknown }>(hero: T): Omit<T, "selenaDanceTraits"> {
  const rest = { ...hero };
  delete rest.selenaDanceTraits;
  return rest;
}

export const defaultPlannerState = {
  schemaVersion: 1,
  disabledEquipmentSlots: [],
  disabledSupportNames: [],
  removedInventoryItemIds: [],
  equipmentOverrides: {},
  equipmentInventory: [],
  hero: {
    selectedHeroId: "selena-sing-with-the-tide",
    selectedTraits: { level45: "Wave Aria", level60: "Idyll of the Tide", level75: "Murmurs of the Distant Tide" },
    memories: { level45: "Ceaseless Tide", level60: "", level75: "" },
    memoryTraitLevels: { level45: 0, level60: 0, level75: 0 },
    memoryInventory: [],
    equippedMemoryIds: {},
    baseTraitMemoryId: "",
    baseTraitMemoryRoll: null,
    sageScent: { elixir: "", damage: "", defense: "", functional: "" },
    carinoSpecialAmmoSupports: ["", "", ""],
    heroTraitSupports: {},
    heroTraitSupportLevels: {},
    heroTraitSupportConfigs: {},
    // Trait-tree picks per tree hero (src/engine/heroes/hero-trait-tree.js; replaces Selena's selenaDanceTraits, 2026-10-15).
    treeTraits: {},
    heroLoadouts: {},
  },
  skills: {
    setupOrder: null,
    boardSlots: { skills: [], auras: [] },
    supportOrder: {},
    setupEnabled: {},
    skillLevels: {},
    supportEnabled: {},
    supportLevels: {},
    specialSupportConfigs: {},
    customSupports: {},
    customSetups: [],
  },
  equippedSlateIds: null,
  slates: { geometryVersion: 4, placements: null, parked: {}, inventory: [] },
  // The build's one follower (2026-10-15; src/engine/followers/follower-model.js): its id, rarity and one Tartarus Skill per unlocked slot (its
  // name, or { name, tier, affixes } once support affixes are chosen, 2026-10-19; null when empty). Not part of the hero
  // loadouts: the follower stays when the hero changes.
  followers: defaultFollowerState(),
  talentRanks: {},
  talents: {
    useCapturedRanks: true,
    selectedTrees: ["Goddess of Deception", "Psychic", "Warlord", "Lich"],
    coreSelections: {
      "Goddess of Deception:12": "Affliction",
      "Goddess of Deception:24": "Subtle Impact",
      "Warlord:24": "Starfire",
      "Lich:24": "Off The Beaten Track",
    },
    prismInventory: [],
    installedPrisms: {},
    installedPrismNodes: {},
  },
  pacts: {
    activeSpirits: {},
    selectedSpirits: [...defaultPactspiritSlots],
    spiritLevels: {},
    nativeNodeQuantities: {},
    kismetSlots: {},
    fateUnlocks: {},
    kismetSlotMode: false,
    volcanoEnabled: [true, true, true, true],
    reapingDurationQuantity: 5,
    spellBlockEnabled: [true],
    attackBlockEnabled: [true, true],
  },
  combat: {
    conditionMode: "auto",
    conditions: {
      prebuiltSelfBuffs: true,
      blurRecentlyEnded: false,
      nearbyElite: true,
      targetLife: true,
      blockedRecently: true,
      blur: true,
      tideContact: true,
      onTheTide: true,
      waveAria: true,
      idyll: true,
      fireInfiltration: true,
      entangledPain: true,
      scorch: true,
      affliction: true,
      aim: true,
    },
    afflictionAverage: 50,
    afflictionPeak: 100,
    targetFireResistancePercent: 30,
    // Auto: Aim uptime is derived from the build (aim-model.js). Any other saved value is a manual override.
    aimUptimePercent: AIM_UPTIME_AUTO_SENTINEL,
    auraAffectedAllies: 1,
    idyllStacks: 15,
    extraMaxChanneledStacks: 0,
    extraInitialChanneledStacks: 0,
  },
} satisfies StoredPlannerState;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** Validates a stored build (throws a TypeError naming the first invalid field) and fills in and migrates the rest. */
export function normalizePlannerState(input: unknown = {}): PlannerState {
  const value = validatePlannerState(input);
  const defaults = clone(defaultPlannerState);
  // Older New Build saves lack this flag; removed captured gear identifies
  // the blank template, whose talent ranks must start at zero.
  const emptyTemplate =
    Array.isArray(value.skills?.setupOrder) &&
    Array.isArray(value.removedInventoryItemIds) &&
    value.removedInventoryItemIds.length >= 10;
  const memoryInventory = Array.isArray(value.hero?.memoryInventory)
    ? value.hero.memoryInventory.map((memory) => {
        const enhancementLevel = clampMemoryEnhancement(memory.enhancementLevel, memory.rarity);
        return {
          ...memory,
          name: memory.type || memory.name,
          enhancementLevel,
          traitLevelBonus: traitLevelBonusForEnhancement(enhancementLevel),
        };
      })
    : [];
  const defaultHeroSelected = !value.hero?.selectedHeroId || value.hero.selectedHeroId === defaults.hero.selectedHeroId;
  const memoryTraitLevels: Record<string, number> =
    value.hero?.memoryTraitLevels && !Object.keys(value.hero.memoryTraitLevels).length
      ? {}
      : { ...(defaultHeroSelected ? defaults.hero.memoryTraitLevels : {}), ...(value.hero?.memoryTraitLevels || {}) };
  const memoryNames: Record<string, string | undefined> =
    value.hero?.memories && !Object.keys(value.hero.memories).length
      ? {}
      : { ...(defaultHeroSelected ? defaults.hero.memories : {}), ...(value.hero?.memories || {}) };
  for (const [tier, id] of Object.entries(value.hero?.equippedMemoryIds || {})) {
    const memory = memoryInventory.find((item) => item.id === id);
    if (memory) {
      memoryTraitLevels[tier] = memory.traitLevelBonus;
      memoryNames[tier] = memory.name;
    }
  }
  // Game objects changed in place (TOWER Sequence ids with a new affix, Truth → I Am Truth): src/engine/state/changed-item-migrations.js.
  const changedEquipment = migrateChangedEquipment(
    value.equipmentOverrides && typeof value.equipmentOverrides === "object" ? value.equipmentOverrides : {},
    Array.isArray(value.equipmentInventory) ? value.equipmentInventory : [],
  );
  const legendaryEquipment = migrateLegendaryEquipment(changedEquipment.overrides, changedEquipment.inventory);
  const selectedSpirits = value.pacts?.selectedSpirits;
  return {
    ...defaults,
    ...value,
    disabledEquipmentSlots: Array.isArray(value.disabledEquipmentSlots) ? value.disabledEquipmentSlots : [],
    disabledSupportNames: Array.isArray(value.disabledSupportNames) ? value.disabledSupportNames : [],
    removedInventoryItemIds: Array.isArray(value.removedInventoryItemIds) ? value.removedInventoryItemIds : [],
    equippedSlateIds: Array.isArray(value.equippedSlateIds) ? value.equippedSlateIds : null,
    slates: {
      ...defaults.slates,
      ...(value.slates || {}),
      // A save without a geometry version predates the current slate board (4): src/app/app.js then ignores its placements
      // and lays out the captured slates.
      geometryVersion: Number(value.slates?.geometryVersion || 0),
      placements:
        value.slates?.placements && typeof value.slates.placements === "object" ? value.slates.placements : null,
      parked: value.slates?.parked && typeof value.slates.parked === "object" ? value.slates.parked : {},
      inventory: Array.isArray(value.slates?.inventory) ? value.slates.inventory : [],
    },
    talentRanks: value.talentRanks && typeof value.talentRanks === "object" ? value.talentRanks : {},
    talents: {
      ...defaults.talents,
      ...(value.talents || {}),
      useCapturedRanks: value.talents?.useCapturedRanks ?? !emptyTemplate,
      selectedTrees: normalizeTalentTreeSelection(value.talents?.selectedTrees, defaults.talents.selectedTrees),
      coreSelections: { ...(value.talents?.coreSelections ?? defaults.talents.coreSelections) },
      prismInventory: Array.isArray(value.talents?.prismInventory)
        ? value.talents.prismInventory.map((item) => ({ ...item }))
        : [],
      installedPrisms: { ...(value.talents?.installedPrisms || {}) },
      installedPrismNodes: { ...(value.talents?.installedPrismNodes || {}) },
    },
    // Saved legendary lines with an unsigned positive roll get their "+" on read (src/engine/state/legendary-text-migrations.js).
    equipmentOverrides: legendaryEquipment.overrides,
    equipmentInventory: legendaryEquipment.inventory,
    // Trait trees (2026-10-15): hero.treeTraits holds every tree hero's picks; Selena's earlier selenaDanceTraits (top level
    // and in her loadout) and a revamped tree hero's one-per-level picks migrate into it (src/engine/heroes/hero-trait-tree.js
    // migrateTreeTraits) and the old field is dropped.
    hero: {
      ...defaults.hero,
      ...withoutLegacyTreeFields(value.hero || {}),
      selectedHeroId:
        typeof value.hero?.selectedHeroId === "string" ? value.hero.selectedHeroId : defaults.hero.selectedHeroId,
      selectedTraits: {
        ...(value.hero?.selectedTraits ??
          (value.hero?.selectedHeroId && value.hero.selectedHeroId !== defaults.hero.selectedHeroId
            ? {}
            : defaults.hero.selectedTraits)),
      },
      memories: memoryNames,
      memoryInventory,
      memoryTraitLevels,
      sageScent: { ...defaults.hero.sageScent, ...(value.hero?.sageScent || {}) },
      carinoSpecialAmmoSupports: Array.from({ length: 3 }, (_, index) =>
        typeof value.hero?.carinoSpecialAmmoSupports?.[index] === "string"
          ? value.hero.carinoSpecialAmmoSupports[index]
          : "",
      ),
      heroTraitSupports: Object.fromEntries(
        Object.entries(value.hero?.heroTraitSupports || {}).filter(([, support]) => typeof support === "string"),
      ),
      heroTraitSupportLevels: Object.fromEntries(
        Object.entries(value.hero?.heroTraitSupportLevels || {}).map(([id, level]) => [
          id,
          Math.max(1, Math.min(40, Number(level) || 20)),
        ]),
      ),
      heroTraitSupportConfigs: Object.fromEntries(
        Object.entries(value.hero?.heroTraitSupportConfigs || {}).map(([id, config]) => [id, { ...config }]),
      ),
      treeTraits: migrateTreeTraits(value.hero || {}),
      heroLoadouts: Object.fromEntries(
        Object.entries(value.hero?.heroLoadouts || {}).map(([id, loadout]) => [
          id,
          withoutLegacyTreeFields(structuredClone(loadout)),
        ]),
      ),
    },
    skills: {
      ...defaults.skills,
      ...(value.skills || {}),
      boardSlots: {
        skills: Array.isArray(value.skills?.boardSlots?.skills) ? value.skills.boardSlots.skills : [],
        auras: Array.isArray(value.skills?.boardSlots?.auras) ? value.skills.boardSlots.auras : [],
      },
      supportOrder: { ...(value.skills?.supportOrder || {}) },
      setupEnabled: { ...(value.skills?.setupEnabled || {}) },
      skillLevels: { ...(value.skills?.skillLevels || {}) },
      supportEnabled: { ...(value.skills?.supportEnabled || {}) },
      supportLevels: { ...(value.skills?.supportLevels || {}) },
      specialSupportConfigs: Object.fromEntries(
        Object.entries(value.skills?.specialSupportConfigs || {}).map(([key, config]) => [
          key,
          config.stars == null
            ? { ...config }
            : {
                ...config,
                stars: Math.max(1, Math.min(5, (Number(config.stars) || 0) + (config.starScaleVersion === 2 ? 0 : 1))),
                starScaleVersion: 2,
              },
        ]),
      ),
      customSupports: migrateCustomSupports(value.skills?.customSupports || {}),
      customSetups: Array.isArray(value.skills?.customSetups) ? value.skills.customSetups : [],
    },
    combat: {
      ...defaults.combat,
      ...(value.combat || {}),
      conditions: { ...defaults.combat.conditions, ...(value.combat?.conditions || {}) },
    },
    // An unknown follower clears the slot; the rarity is one the follower comes in; skills fit its slots, each eligible once.
    followers: normalizeFollowerState(value.followers),
    pacts: {
      ...defaults.pacts,
      ...(value.pacts || {}),
      activeSpirits: { ...(value.pacts?.activeSpirits || {}) },
      selectedSpirits: Array.isArray(selectedSpirits)
        ? Array.from({ length: 3 }, (_, index) =>
            typeof selectedSpirits[index] === "string" ? selectedSpirits[index] : "",
          )
        : defaultPactspiritSlots.filter((name) => value.pacts?.activeSpirits?.[name] !== false),
      spiritLevels: { ...(value.pacts?.spiritLevels || {}) },
      nativeNodeQuantities: { ...(value.pacts?.nativeNodeQuantities || {}) },
      kismetSlots: { ...(value.pacts?.kismetSlots || {}) },
      fateUnlocks: { ...(value.pacts?.fateUnlocks || {}) },
    },
  };
}

export function diffPlannerStates(left: unknown, right: unknown): PlannerStateDiff {
  const a = normalizePlannerState(left),
    b = normalizePlannerState(right);
  const objectDifferences = (x: Record<string, unknown>, y: Record<string, unknown>) =>
    new Set(
      [...Object.keys(x || {}), ...Object.keys(y || {})].filter(
        (key) => JSON.stringify(x?.[key]) !== JSON.stringify(y?.[key]),
      ),
    ).size;
  return {
    hero: objectDifferences(a.hero, b.hero),
    equipment: new Set([
      ...a.disabledEquipmentSlots,
      ...b.disabledEquipmentSlots,
      ...Object.keys(a.equipmentOverrides),
      ...Object.keys(b.equipmentOverrides),
    ]).size
      ? objectDifferences(
          { disabled: a.disabledEquipmentSlots, ...a.equipmentOverrides },
          { disabled: b.disabledEquipmentSlots, ...b.equipmentOverrides },
        )
      : 0,
    skills:
      objectDifferences(a.skills, b.skills) +
      (JSON.stringify(a.disabledSupportNames) === JSON.stringify(b.disabledSupportNames) ? 0 : 1),
    talents: objectDifferences(a.talentRanks, b.talentRanks) + objectDifferences(a.talents, b.talents),
    slates: JSON.stringify([a.equippedSlateIds, a.slates]) === JSON.stringify([b.equippedSlateIds, b.slates]) ? 0 : 1,
    pacts: objectDifferences(a.pacts, b.pacts),
    followers: objectDifferences(a.followers, b.followers),
    combat: objectDifferences(a.combat, b.combat),
  };
}

/** A build code: base64url (no padding) of the normalized state's JSON. */
export function encodePlannerState(state: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(normalizePlannerState(state)));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function decodePlannerState(code: unknown): PlannerState {
  if (typeof code !== "string" || code.length > 250000 || !/^[A-Za-z0-9_+/=-]+$/.test(code.trim()))
    throw new TypeError("Invalid or oversized build code");
  const padded = code
    .trim()
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(code.trim().length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return normalizePlannerState(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
}
