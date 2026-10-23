// The engine's public entry: everything code outside src/engine (the planner page in src/app, the game log import in
// src/game-log, the React app in apps/web) may use from the engine and its game data. Outside code imports only this
// module (tests/unit/import-graph.test.js); the engine never imports it. It is what a season of the game exposes: when the
// engine moves to the next season, this surface is what the page relies on.

// The calculation and its whole-build readings
export { resolveTalentCandidate } from "./candidate-sources.js";
export { characterStatRows, characterStatTotals, heroTraitLevelBonus, heroTraitSlotLevel } from "./character-stats.js";
export { automaticCombatConditionIds } from "./combat-condition-mode.js";
export { collectNormalizedGearModifiers, energyCostForSupportPositions } from "./engine.js";
export { BASE_CRITICAL_DAMAGE_PERCENT } from "./game-attribute-defaults.js";
export type { ExclusiveChoice, InstalledSupport, MainSkill, PlannerResult, SkillSetup } from "./planner-api.ts";
export { calculatePlanner } from "./planner.js";

// The stored build: defaults, normalization, validation, build codes
export { expandBuildCode } from "./state/build-code-compact.js";
export {
  decodePlannerState,
  defaultPlannerState,
  encodePlannerState,
  normalizePlannerState,
} from "./state/planner-state.ts";
export type { PlannerSkills, PlannerState } from "./state/planner-state.ts";
export { selectorBaseLevel } from "./state/skill-level-input.js";
export { clampCombatNumber, combatNumberLimits, validatePlannerState } from "./state/state-validation.ts";
export type { CombatNumber } from "./state/state-validation.ts";
export { normalizeSunsEmbraceItem } from "./state/suns-embrace-normalization.js";

// Ailments
export { parseReapingSource } from "./ailments/reaping-sources.js";

// Combat
export { excludeRecountSources, excludedSteadyDps, summarizeRecount, windowTotals } from "./combat/dummy-recount.js";
export { calibratedBeamTargetCycle, level85DummyDefenses } from "./combat/target-hit-mitigation.js";

// Defense
export { blessingRecoverySources, parseBlessingRecovery } from "./defense/blessing-gear-effects.js";
export { parseBlessingModifier } from "./defense/blessing-model.js";
export { parseBlockModifier } from "./defense/block-model.js";
export { baseLife, effectiveHpModel } from "./defense/effective-hp.js";

// Followers
export {
  tartarusAffixById,
  tartarusAffixChoices,
  tartarusAffixLines,
  tartarusAffixRanges,
  tartarusAffixSlotPool,
  tartarusAffixSlots,
} from "./followers/follower-affixes.js";
export {
  FOLLOWER_BUFFS,
  FOLLOWER_MAX_SLOTS,
  FOLLOWER_RARITY_SCHEME,
  defaultFollowerState,
  followerById,
  followerInitialSkillRule,
  followerLineStatus,
  followerRarityById,
  followerSelection,
  followerSkillEntryName,
  followerSkillEntryTier,
  followerSkillSlotQuantity,
  followerSkillSlots,
  followerSlotSkills,
  followers,
  missingFollowerEngine,
  normalizeFollowerState,
  plainFollowerLine,
  staticFollowerAffixReading,
  staticFollowerLineReading,
  staticFollowerTraitReading,
  tartarusKeyword,
  tartarusSkillByName,
  tartarusSkillTierName,
  tartarusSkillTiers,
} from "./followers/follower-model.js";

// Gear
export { canDropGearInSlot } from "./gear/gear-drag.js";
export { itemCardRarity } from "./gear/graft-legendaries.js";
export {
  legendaryLineTiers,
  legendaryLowerTierTemplates,
  legendaryTierTemplate,
  legendaryTierTextForAffixId,
} from "./gear/legendary-affix-tiers.js";
export { legendaryModifierSignature, reconcileLegendaryModifiers } from "./gear/legendary-modifier-signature.js";
export {
  allPlaceholderTemplates,
  keywordRollParts,
  placeholderOption,
  placeholderOptionForText,
  placeholderOptionTemplate,
  placeholderPool,
  placeholderTemplates,
} from "./gear/legendary-placeholder-pools.js";
export {
  folkloreRingModifier,
  folkloreRingOptionFromModifiers,
  folkloreRingOptions,
} from "./gear/legendary-ring-options.js";
export {
  isLegacyRareBase,
  rareBaseByGameId,
  rareBaseById,
  rareBaseByName,
  rareBaseForItem,
} from "./gear/rare-base-lookup.js";
export { voraxBaseAffixSlotPool } from "./gear/vorax-base-affixes.js";

// Heroes
export { carinoSpecialAmmoOptions } from "./heroes/carino-special-ammo.js";
export { catsNightSafariStatus } from "./heroes/erika-wind-stalker.js";
export { isExclusiveRevival } from "./heroes/hero-exclusive-revivals.js";
export { switchHeroLoadout } from "./heroes/hero-loadouts.js";
export { heroMemoryLineCoverage, revivedAffixCoverage } from "./heroes/hero-memory-model.js";
export {
  artificialMoonGate,
  baseTraitDescriptionForLevel,
  baseTraitLevelForMemory,
  clampMemoryEnhancement,
  closestMemoryTier,
  endsArtificialMoonSection,
  memoryBaseStatLabel,
  memoryMaxEnhancementForRarity,
  memoryScaledBaseStat,
  memoryTierNumericValue,
  nonBaseTraitLevelExtras,
  reduceBaseTraitMemoryStat,
  slotTraitLevel,
  traitLevelBonusForEnhancement,
  withoutArtificialMoonLines,
} from "./heroes/hero-memory-rules.js";
export { resolveHeroModules } from "./heroes/hero-trait-modules.js";
export {
  EXTRA_PICK_AFFIX,
  EXTRA_PICK_LEVEL,
  TREE_ROW_LEVELS,
  heroTraitTree,
  heroTreeCapacity,
  heroTreeRules,
  heroTreeSelections,
  treeBoardLayout,
  treeMaxCapacity,
  treeRowLevelKey,
  treeRules,
} from "./heroes/hero-trait-tree.js";
export { CLOCKWORK_CORE, TRAIT_SLOT_GRANTS, YOUGA_ULTIMATE_ONE_ID } from "./heroes/trait-board-grants.js";

// Pacts
export { fateExtraSlots, fateSlotChoice, fateSlotChoices } from "./pacts/fate-slot-unlocks.js";
export {
  kismetAffixesWithRolls,
  kismetKindForRing,
  kismetRollControls,
  kismetSlotKey,
  normalizeKismetRolls,
} from "./pacts/kismet-crafting.js";
export {
  activeKismetSlotKeys,
  kismetSlotTexts,
  microFateEffectScale,
  parseKismetEffect,
  starTrailNote,
} from "./pacts/kismet-effects.js";
export { transferKismetSlot } from "./pacts/kismet-slot-transfer.js";
export { equippedKismetSummary } from "./pacts/pact-kismet-summary.js";
export {
  nativePactspiritNodeEffect,
  orderedPactspiritNodes,
  pactspiritEffectsAtLevel,
  pactspiritLevel,
  togglePactNodeChain,
} from "./pacts/pactspirit-levels.js";
export { activeCapturedPactspirits, selectPactspirit, sortPactspirits } from "./pacts/pactspirit-selection.js";

// Skills
export { AIM_UPTIME_AUTO_SENTINEL } from "./skills/aim-model.js";
export { auraGainedLineStatus } from "./skills/aura-gained-effects.js";
export { curseSlotSummary } from "./skills/curse-limit.js";
export { heroCanPlaceMagusInActiveSlot, isSpiritMagusSkill } from "./skills/magus-active-slot.js";
export {
  findScorchingBeamSetup,
  scorchingBeamBaseHits,
  strippedBeamHitCoefficient,
} from "./skills/scorching-beam-base-hit.js";
export { assignSkillBoardSlot, moveSkillBoardSlot, skillBoardRows } from "./skills/skill-board-slots.js";
export { classifySkillCoverage, supportClauseCoverage, supportLineCoverage } from "./skills/skill-coverage.js";
export { readWeapon, weaponHands, weaponLocalLineKind, weaponTypeOf } from "./skills/weapon-damage-model.js";

// Supports
export { gameRuleDecides, supportCanSupportSkill } from "./supports/support-compatibility.js";
export {
  supportFitsSlot,
  supportSlotsForSetup,
  transferSupportSlot,
  userInstalledSupports,
} from "./supports/support-slot-transfer.js";

// Talents
export { modeledCoreTalents } from "./talents/core-talent-model.js";
export {
  PEDIGREE_OF_GODS,
  isValidPedigreeAffix,
  normalizePedigreeAffixes,
  pedigreeSlotTypes,
} from "./talents/pedigree-slots.js";
export {
  etherealPrismBases,
  inverseImageEffectMultiplier,
  inverseImageReflectedBounds,
  inverseImageReflectedCoordinates,
  inverseImageReflectionMap,
  inverseImageRoll,
  inverseImageRolls,
  inverseImageTalentNodes,
  prismAddedCoreEffect,
  prismAffixes,
  prismArea,
  prismAreaBounds,
  prismBaseAffixesForBase,
  prismBaseEffect,
  prismLegendaryAffixesForBase,
  prismMutationDownside,
  prismNodeAffixes,
  prismRareAffixesForBase,
  prismReplacesCore,
  prismSupportsLegendaryAffix,
} from "./talents/prism-crafting.js";
export {
  SLATE_BOARD_ROWS,
  adjacentSlateIds,
  canPlaceSlate,
  isCopySlate,
  slateOffsets,
  slateSize,
  slateTransformRules,
} from "./talents/slate-board.js";
export {
  craftedSlateShape,
  isActiveJudgment,
  judgmentAffectedSlateIds,
  judgmentAffixTargetPercent,
  legendarySlateShapes,
  scaleJudgmentAffix,
} from "./talents/slate-judgment.js";
export {
  MAX_TALENT_POINTS,
  TALENT_THRESHOLDS,
  allocateTalentToMaxWithPrerequisites,
  allocateTalentWithPrerequisites,
  canAllocateTalent,
  pruneInvalidTalentRanks,
  removeTalentWithDependents,
  talentEffectText,
  talentPointTotals,
} from "./talents/talent-rules.js";
export { godTalentTreesSs13, talentFamiliesSs13, talentOptionsForSlot } from "./talents/talent-selection-rules.js";

// Text
export { gameKeyword, gameKeywordSegments, gameKeywordsExplained } from "./text/game-keywords.js";
export { isNameReadCoreClause, nameReadCoreGrant } from "./text/granted-core-lines.js";
export { heroTraitKeyword, heroTraitKeywordSegments, heroTraitKeywordsIn } from "./text/inline-keywords.js";
export {
  combineStatuses,
  coverageContext,
  dazeStatus,
  engineLineStatus,
  heroModuleLineStatus,
  intelligenceLineStatus,
  mainStatLineStatus,
  nameReadCoreStatus,
  neutralStatuses,
  plannerEngines,
  refineCoverage,
  routeStatus,
  setCoverageContext,
  skillLevelLineStatus,
} from "./text/line-coverage.js";
export { residualNonDamageStatus } from "./text/line-families.js";
export { namedGearAffixLines } from "./text/named-gear-affixes.js";
export { DASH, formatRecountInteger, formatShortNumber } from "./text/number-format.js";
export { cleanGameText, normalizePercentageText } from "./text/percentage-text.js";
export { matchTalentTextClause, talentKeyRoute } from "./text/talent-text-effects.js";

// Game data
export { towerSequenceSs13Texts } from "../data/changed-item-ids.js";
export { divinitySlateAffixesSs13, divinitySlateTreeFamiliesSs13 } from "../data/divinity-slate-affixes-ss13.js";
export {
  memoryAffixTiersSs13,
  memoryRevivalAffixIdsSs13,
  observedGameAffixIdsSs13,
} from "../data/game-import-tlidb-ss13.generated.js";
export { netherKingFixedAffixesSs13 } from "../data/nether-king-slate-affixes-ss13.js";
export { netherKingUltimateAffixesSs13 } from "../data/nether-king-ultimate-affixes-ss13.js";
export { pedigreeCoreAffixesSs13 } from "../data/pedigree-core-affixes-ss13.js";

// Game data: Assets
export { tliArt } from "../data/assets/tli-art.js";

// Game data: Catalogs
export { tlidbSkillCatalogSs13, tlidbSupportCatalogSs13 } from "../data/catalogs/tlidb-ss13.js";

// Game data: Gear
export { baseAffixTiersSs13, baseAffixesSs13 } from "../data/gear/base-affixes-ss13.generated.js";
export { beltBlendsSs13 } from "../data/gear/belt-blends-ss13.generated.js";
export { corrosionImplicitsForBase, defaultBaseForItem } from "../data/gear/corrosion-implicits-ss13.js";
export { craftAffixesSs13 } from "../data/gear/craft-affixes-ss13.generated.js";
export { craftItemTypes, equipmentSlots, voraxItemTypes } from "../data/gear/crafting-catalog-ss13.js";
export { gearGroupOfType, gearGroupsSs13 } from "../data/gear/gear-groups-ss13.js";
export { legendaryCorrodedModifiersSs13 } from "../data/gear/legendary-corroded-modifiers-ss13.generated.js";
export { legendaryGearSs13 } from "../data/gear/legendary-gear-ss13.generated.js";
export { legendaryGearTypesSs13 } from "../data/gear/legendary-gear-types-ss13.js";
export { rareBaseItemsSs13 } from "../data/gear/rare-base-items-ss13.generated.js";
export { selenaScorchingBeamGearSs13 } from "../data/gear/selena-scorching-beam-ss13.js";
export { towerSequencesSs13 } from "../data/gear/tower-sequences-ss13.generated.js";
export { voraxCraftingSs13 } from "../data/gear/vorax-crafting-ss13.generated.js";

// Game data: Heroes
export { allHeroTraitsSs13 } from "../data/heroes/all-hero-traits-ss13.generated.js";
export { heroById, heroCatalogSs13 } from "../data/heroes/hero-catalog-ss13.js";
export { heroMemoryAffixesSs13 } from "../data/heroes/hero-memory-affixes-ss13.js";
export { heroMemoryFixedT0AffixesSs13 } from "../data/heroes/hero-memory-fixed-t0-ss13.js";
export { heroMemoryTierAffixesSs13 } from "../data/heroes/hero-memory-tiers-ss13.js";
export { lunarPhaseRevivedAffixDetailsSs13 } from "../data/heroes/memory-revival-details-ss13.js";
export {
  equippedBaseTraitSlot,
  lunarPhaseRevivedAffixesSs13,
  memoryFitsBaseTraitSlot,
  normalizeRevivedAffix,
  regularRevivedAffixNamesSs13,
  regularRevivedAffixesSs13,
  revivedAffixForMemoryType,
  revivedAffixRollRange,
  revivedAffixTiers,
} from "../data/heroes/memory-revival-ss13.js";
export { sageScentIngredientsSs13 } from "../data/heroes/sage-scent-options-ss13.js";
export { sageElixirsSs13 } from "../data/heroes/sage-scent-ss13.generated.js";

// Game data: Pacts
export { kismetCatalogSs13 } from "../data/pacts/kismet-catalog-ss13.js";
export { pactspiritCatalogSs13 } from "../data/pacts/pactspirit-catalog-ss13.js";
export { pactspiritTreesSs13 } from "../data/pacts/pactspirit-trees-ss13.js";
export { selenaScorchingBeamPactsSs13 } from "../data/pacts/selena-scorching-beam-ss13.js";

// Game data: Skills
export { activationMediumGameAffixesSs13 } from "../data/skills/activation-medium-game-affixes-ss13.generated.js";
export { scaledAuraEffects } from "../data/skills/aura-scaling-ss13.js";
export { selenaCompleteSkillLoadoutSs13 } from "../data/skills/selena-complete-skill-loadout-ss13.js";
export { skillProgressionSs13 } from "../data/skills/skill-progression-ss13.generated.js";
export {
  activationMediumAffixLines,
  activationMediumGameLine,
  activationMediumGameRolls,
  activationMediumLineConfigs,
  activationMediumSelectedLines,
  configurableSupportTierData,
  defaultConfigurableSupportConfig,
  isActivationMedium,
  normalizeProgressionSupportConfig,
  progressionRangeLabels,
  progressionSupportHasStars,
  progressionSupportText,
  progressionSupportTierData,
  specialSupportStarBonus,
  specialSupportTierData,
} from "../data/skills/special-support-tiers-ss13.js";
export { supportProgressionSs13 } from "../data/skills/support-progression-ss13.generated.js";

// Game data: Slates
export { selenaScorchingBeamSlatesSs13 } from "../data/slates/selena-scorching-beam-ss13.js";

// Game data: Talents
export { allProfessionTalentCatalogueSs13 } from "../data/talents/all-profession-trees-ss13.generated.js";
export { TLIDB_PRISM_AFFIXES } from "../data/talents/prism-affixes-tlidb.generated.js";
export { selenaScorchingBeamTalentSetupSs13 } from "../data/talents/selena-scorching-beam-ss13.js";

// The game id map (0.9 MB), loaded on demand: only a game log import reads it.
export const importGameIdMap = () =>
  import("../data/game-id-map-ss13.generated.js").then((module) => module.gameIdMapSs13);
